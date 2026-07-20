import { env } from "../../config/env.js";
import Settings from "../../models/Settings.model.js";
import ShippingZone from "../../models/ShippingZone.model.js";
import { AppError } from "../../utils/AppError.js";
import { priceCart } from "../cart/cart.service.js";
import { getMylerzCityZones, getMylerzExpectedCharges } from "../couriers/couriers.service.js";

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// When Mylerz can't quote, fall back to an admin-managed per-governorate fee,
// then to a store-wide flat fee. Returns null if neither is configured.
const resolveFallbackFee = async ({ governorate, settings }) => {
  if (governorate) {
    const zone = await ShippingZone.findOne({
      governorate: new RegExp(`^${escapeRegExp(governorate)}$`, "i"),
      isActive: true
    }).lean();
    if (zone) return zone.fee;
  }

  if (settings?.fallbackShippingFee !== null && settings?.fallbackShippingFee !== undefined) {
    return settings.fallbackShippingFee;
  }

  return null;
};

// Mylerz zone list rarely changes; cache it in memory to avoid an auth + fetch on every page load.
const ZONES_TTL_MS = 6 * 60 * 60 * 1000;
let zonesCache = null;

export const getGovernorates = async () => {
  if (zonesCache && Date.now() - zonesCache.at < ZONES_TTL_MS) {
    return zonesCache.data;
  }

  const raw = await getMylerzCityZones();
  const data = (raw || []).map((city) => ({
    code: city.Code,
    nameEn: city.EnName || "",
    nameAr: city.ArName || "",
    zones: (city.Zones || []).map((zone) => ({
      code: zone.Code,
      nameEn: zone.EnName || "",
      nameAr: zone.ArName || ""
    }))
  }));

  zonesCache = { at: Date.now(), data };
  return data;
};

// Live shipping fee for a priced cart, honouring the free-shipping threshold.
// cartTotal = goods total after discount (subtotal - discount).
export const getShippingFeeForCart = async ({ cartTotal, zoneCode, governorate, paymentMethod }) => {
  if (!zoneCode) {
    throw new AppError("Please select a delivery zone", 400);
  }

  const settings = await Settings.findOne({ key: "store" }).lean();
  const threshold = settings?.freeShippingThreshold;

  if (threshold !== null && threshold !== undefined && cartTotal >= threshold) {
    return { fee: 0, freeShipping: true, source: "threshold" };
  }

  const isCod = paymentMethod === "cod";

  try {
    const charges = await getMylerzExpectedCharges({
      codValue: isCod ? cartTotal : 0,
      warehouseName: env.MYLERZ_WAREHOUSE_NAME,
      customerZoneCode: zoneCode,
      packageWeight: env.MYLERZ_DEFAULT_WEIGHT_KG,
      isFulfillment: false,
      packageServiceTypeCode: env.MYLERZ_DEFAULT_SERVICE_TYPE,
      packageServiceCode: env.MYLERZ_DEFAULT_SERVICE,
      paymentTypeCode: isCod ? "COD" : "PP",
      serviceCategoryCode: env.MYLERZ_DEFAULT_SERVICE_CATEGORY
    });

    return { fee: roundMoney(charges?.ShippingFees ?? 0), freeShipping: false, source: "mylerz" };
  } catch (error) {
    // Mylerz unreachable / rejected the quote — try the configured fallback so checkout isn't blocked.
    const fallback = await resolveFallbackFee({ governorate, settings });
    if (fallback === null) {
      throw error;
    }

    console.error("[shipping] Mylerz quote failed, using fallback fee:", error.message);
    return { fee: roundMoney(fallback), freeShipping: false, source: "fallback" };
  }
};

export const quoteShipping = async ({
  zoneCode,
  governorate,
  items,
  couponCode,
  paymentMethod = "cod"
}) => {
  const cart = await priceCart({ items, couponCode }, null);

  if (!cart.isValid) {
    throw new AppError("Cart has unavailable items", 400, cart.unavailableItems);
  }

  const { fee, freeShipping } = await getShippingFeeForCart({
    cartTotal: cart.total,
    zoneCode,
    governorate,
    paymentMethod
  });

  return {
    currency: env.MYLERZ_CURRENCY,
    subtotal: cart.subtotal,
    discount: cart.discount.amount,
    cartTotal: cart.total,
    shippingFee: fee,
    freeShipping,
    total: roundMoney(cart.total + fee)
  };
};
