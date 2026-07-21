import Order from "../../models/Order.model.js";
import { env } from "../../config/env.js";
import { sendOrderStatusEmail } from "../../services/email.service.js";
import { sendOrderStatusWhatsapp } from "../../services/whatsapp.service.js";
import { AppError } from "../../utils/AppError.js";
import { mylerzRequest } from "./mylerz.client.js";

const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString();
};

const getPaymentFields = (order) => {
  if (order.paymentMethod === "cod") {
    return {
      Payment_Type: "COD",
      COD_Value: String(order.total)
    };
  }

  return {
    Payment_Type: "PP",
    COD_Value: "0"
  };
};

const buildPieces = (order, payload) => {
  if (payload.pieces?.length) {
    return payload.pieces.map((piece) => ({
      pieceNo: piece.pieceNo,
      Weight: String(piece.weight ?? env.MYLERZ_DEFAULT_WEIGHT_KG),
      ItemCategory: piece.itemCategory || env.MYLERZ_DEFAULT_PRODUCT_CATEGORY,
      Dimensions: piece.dimensions || payload.dimensions || "",
      SpecialNotes: piece.specialNotes || ""
    }));
  }

  return order.items.map((item, index) => ({
    pieceNo: index + 1,
    Weight: String(env.MYLERZ_DEFAULT_WEIGHT_KG),
    ItemCategory: payload.productCategory || env.MYLERZ_DEFAULT_PRODUCT_CATEGORY,
    Dimensions: payload.dimensions || "",
    SpecialNotes: `${item.nameSnapshot.en} / ${item.sku} / qty ${item.qty}`,
    Quantity: item.qty
  }));
};

const buildMylerzOrder = (order, payload) => ({
  WarehouseName: payload.warehouseName || env.MYLERZ_WAREHOUSE_NAME,
  PickupDueDate: payload.pickupDueDate || tomorrowIso(),
  Package_Serial: payload.packageSerial,
  Reference: payload.reference || order.orderNumber,
  Description:
    payload.description ||
    `ROMZ order ${order.orderNumber} - ${order.items.map((item) => item.nameSnapshot.en).join(", ")}`,
  Total_Weight: payload.totalWeight ?? env.MYLERZ_DEFAULT_WEIGHT_KG,
  Service_Type: payload.serviceType || env.MYLERZ_DEFAULT_SERVICE_TYPE,
  Service: payload.service || env.MYLERZ_DEFAULT_SERVICE,
  ServiceDate: payload.serviceDate || null,
  Service_Category: payload.serviceCategory || env.MYLERZ_DEFAULT_SERVICE_CATEGORY,
  ...getPaymentFields(order),
  Special_Notes: payload.specialNotes || "",
  Customer_Name: order.customer.name,
  Mobile_No: order.customer.phone,
  Building_No: payload.buildingNo || "",
  Street: order.shippingAddress.street,
  Floor_No: payload.floorNo || "",
  Apartment_No: payload.apartmentNo || order.shippingAddress.apartment || "",
  Country: "Egypt",
  City: payload.cityCode || order.shippingAddress.governorateCode || order.shippingAddress.city,
  Neighborhood:
    payload.neighborhoodCode || order.shippingAddress.zoneCode || order.shippingAddress.governorate,
  District: payload.districtCode || "",
  GeoLocation: payload.geolocation || "",
  Address_Category: payload.addressCategory || env.MYLERZ_DEFAULT_ADDRESS_CATEGORY,
  Address2: [order.shippingAddress.city, order.shippingAddress.governorate]
    .filter(Boolean)
    .join(", "),
  CustVal: order.orderNumber,
  Currency: env.MYLERZ_CURRENCY,
  Pieces: buildPieces(order, payload)
});

const extractFirstPackage = (data) => data?.Value?.Packages?.[0] || null;

export const createMylerzShipment = async (orderId, payload) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (["cancelled", "returned"].includes(order.status)) {
    throw new AppError("Cannot create Mylerz shipment for a cancelled or returned order", 400);
  }

  if (order.courier?.trackingNumber) {
    throw new AppError("Order already has courier tracking", 400);
  }

  const shipmentPayload = [buildMylerzOrder(order, payload)];
  const data = await mylerzRequest("/api/Orders/AddOrders", {
    method: "POST",
    body: shipmentPayload
  });
  const firstPackage = extractFirstPackage(data);

  if (!firstPackage?.BarCode) {
    const reason =
      firstPackage?.ErrorMessage ||
      data?.Value?.ErrorMessage ||
      "Mylerz did not return a package barcode";
    throw new AppError(reason, 502, data);
  }

  order.courier = {
    name: "mylerz",
    trackingNumber: String(firstPackage.BarCode),
    trackingUrl: "",
    pickupOrderCode: data.Value?.PickupOrderCode || "",
    reference: firstPackage.Reference || payload.reference || order.orderNumber,
    status: firstPackage.Status || "",
    lastSyncedAt: new Date(),
    raw: data.Value
  };

  if (order.status !== "shipped") {
    order.status = "shipped";
    order.statusHistory.push({
      status: "shipped",
      at: new Date(),
      note: "Mylerz shipment created"
    });
  }

  await order.save();
  await sendOrderStatusEmail(order);

  try {
    await sendOrderStatusWhatsapp(order);
  } catch (error) {
    console.error("[couriers] Order status WhatsApp failed:", error);
  }

  return { order, mylerz: data.Value };
};

export const getMylerzPackageStatus = async (awb) => {
  const data = await mylerzRequest("/api/packages/GetPackageStatus", {
    query: { AWB: awb }
  });

  return data.Value;
};

export const getMylerzPackageDetails = async (awb) => {
  const data = await mylerzRequest("/api/packages/GetPackageDetails", {
    query: { AWB: awb }
  });

  return data.Value;
};

export const trackMylerzPackage = async (awb) => {
  const data = await mylerzRequest("/api/packages/TrackPackages", {
    method: "POST",
    body: [{ Barcode: awb, ReferenceNumber: "" }]
  });

  return data.Value;
};

export const getMylerzTrackingUrl = async (awb) => {
  const data = await mylerzRequest("/api/packages/GetTrackShipmentUrl", {
    query: { Barcode: awb, ReferenceNumber: "" }
  });

  return data.Value;
};

export const cancelMylerzPackage = async (awb, { referenceNumber = "" } = {}) => {
  const data = await mylerzRequest("/api/packages/CancelPackage", {
    method: "POST",
    body: [
      {
        Barcode: awb,
        ReferenceNumber: referenceNumber
      }
    ]
  });

  return data.Value;
};

export const getMylerzWarehouses = async () => {
  const data = await mylerzRequest("/api/Orders/GetWarehouses");
  return data.Value;
};

export const getMylerzCityZones = async () => {
  const data = await mylerzRequest("/api/packages/GetCityZoneList");
  return data.Value;
};

export const getMylerzExpectedCharges = async (payload) => {
  const data = await mylerzRequest("/api/packages/GetExpectedCharges", {
    method: "POST",
    body: {
      CODValue: payload.codValue,
      WarehouseName: payload.warehouseName || env.MYLERZ_WAREHOUSE_NAME,
      CustomerZoneCode: payload.customerZoneCode,
      PackageWeight: payload.packageWeight,
      IsFulfillment: payload.isFulfillment,
      PackageServiceTypeCode: payload.packageServiceTypeCode,
      PackageServiceCode: payload.packageServiceCode,
      PaymentTypeCode: payload.paymentTypeCode,
      ServiceCategoryCode: payload.serviceCategoryCode
    }
  });

  return data.Value;
};
