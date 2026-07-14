import Coupon from "../../models/Coupon.model.js";
import Product from "../../models/Product.model.js";
import { AppError } from "../../utils/AppError.js";

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getEffectiveUnitPrice = (product, variant) =>
  roundMoney(variant.priceOverride ?? product.salePrice ?? product.basePrice);

const findVariant = (product, item) => {
  if (item.variantId) {
    const variant = product.variants.id(item.variantId);
    if (variant) return variant;
  }

  return item.sku
    ? product.variants.find((variant) => variant.sku === item.sku)
    : null;
};

export const calculateCouponDiscount = (coupon, subtotal, user = null) => {
  if (!coupon) return 0;

  const now = new Date();

  if (!coupon.isActive) {
    throw new AppError("Coupon is inactive", 400);
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new AppError("Coupon has expired", 400);
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError("Coupon usage limit reached", 400);
  }

  if (subtotal < coupon.minOrderTotal) {
    throw new AppError(`Minimum order total for this coupon is ${coupon.minOrderTotal}`, 400, {
      couponCode: coupon.code,
      subtotal,
      minOrderTotal: coupon.minOrderTotal
    });
  }

  if (user && coupon.usedBy.some((usedUserId) => String(usedUserId) === String(user._id))) {
    throw new AppError("Coupon was already used by this account", 400);
  }

  const rawDiscount =
    coupon.type === "percent" ? subtotal * (coupon.value / 100) : coupon.value;

  const cappedDiscount =
    coupon.maxDiscount !== null ? Math.min(rawDiscount, coupon.maxDiscount) : rawDiscount;

  return roundMoney(Math.min(cappedDiscount, subtotal));
};

export const getValidCoupon = async (code) => {
  if (!code) return null;

  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });

  if (!coupon) {
    throw new AppError("Coupon not found", 404);
  }

  return coupon;
};

export const priceCart = async ({ items, couponCode }, user = null) => {
  const productIds = items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const pricedItems = [];
  const unavailableItems = [];

  for (const item of items) {
    const product = productMap.get(String(item.product));

    if (!product) {
      unavailableItems.push({
        product: item.product,
        sku: item.sku,
        variantId: item.variantId,
        qty: item.qty,
        reason: "Product is unavailable"
      });
      continue;
    }

    const variant = findVariant(product, item);

    if (!variant) {
      unavailableItems.push({
        product: product._id,
        sku: item.sku,
        variantId: item.variantId,
        qty: item.qty,
        reason: "Variant is unavailable"
      });
      continue;
    }

    const requestedQty = item.qty;
    const availableQty = variant.stock;
    const unitPrice = getEffectiveUnitPrice(product, variant);
    const lineTotal = roundMoney(unitPrice * requestedQty);

    if (availableQty < requestedQty) {
      unavailableItems.push({
        product: product._id,
        productName: product.name,
        variantId: variant._id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        requestedQty,
        availableQty,
        reason: availableQty === 0 ? "Out of stock" : "Insufficient stock"
      });
    }

    pricedItems.push({
      product: product._id,
      productName: product.name,
      slug: product.slug,
      image: product.images[0] || null,
      variantId: variant._id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      qty: requestedQty,
      availableQty,
      unitPrice,
      lineTotal,
      inStock: availableQty >= requestedQty
    });
  }

  const subtotal = roundMoney(
    pricedItems.reduce((total, item) => total + item.lineTotal, 0)
  );
  const coupon = await getValidCoupon(couponCode);
  const discountAmount = coupon ? calculateCouponDiscount(coupon, subtotal, user) : 0;
  const total = roundMoney(subtotal - discountAmount);

  return {
    items: pricedItems,
    unavailableItems,
    subtotal,
    discount: {
      couponCode: coupon?.code || "",
      amount: discountAmount
    },
    total,
    isValid: unavailableItems.length === 0
  };
};
