import Coupon from "../../models/Coupon.model.js";
import Order from "../../models/Order.model.js";
import Product from "../../models/Product.model.js";
import Settings from "../../models/Settings.model.js";
import ShippingZone from "../../models/ShippingZone.model.js";
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from "../../services/email.service.js";
import { AppError } from "../../utils/AppError.js";
import { buildMeta, buildPagination } from "../../utils/apiFeatures.js";
import { priceCart } from "../cart/cart.service.js";

const orderPrefix = "RZ";
const cancellableStatuses = ["pending", "confirmed"];

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getShippingZone = async (governorate) => {
  const zone = await ShippingZone.findOne({
    governorate: new RegExp(`^${escapeRegExp(governorate)}$`, "i"),
    isActive: true
  });

  if (!zone) {
    throw new AppError("Shipping is not available for this governorate", 400);
  }

  return zone;
};

const getShippingFee = async (governorate, cartTotal) => {
  const [zone, settings] = await Promise.all([
    getShippingZone(governorate),
    Settings.findOne({ key: "store" }).lean()
  ]);

  const threshold = settings?.freeShippingThreshold;
  const fee = threshold !== null && threshold !== undefined && cartTotal >= threshold ? 0 : zone.fee;

  return {
    fee: roundMoney(fee),
    zone
  };
};

const generateOrderNumber = async () => {
  const year = new Date().getFullYear();
  let sequence = (await Order.countDocuments({
    orderNumber: new RegExp(`^${orderPrefix}-${year}-`)
  })) + 1;

  while (sequence < 100000) {
    const orderNumber = `${orderPrefix}-${year}-${String(sequence).padStart(5, "0")}`;
    const exists = await Order.exists({ orderNumber });
    if (!exists) return orderNumber;
    sequence += 1;
  }

  throw new AppError("Unable to generate order number", 500);
};

const toOrderItems = (cartItems) =>
  cartItems.map((item) => ({
    product: item.product,
    nameSnapshot: item.productName,
    sku: item.sku,
    size: item.size,
    color: item.color,
    qty: item.qty,
    unitPrice: item.unitPrice
  }));

const decrementStock = async (items) => {
  const decremented = [];

  try {
    for (const item of items) {
      const result = await Product.updateOne(
        {
          _id: item.product,
          variants: {
            $elemMatch: {
              _id: item.variantId,
              stock: { $gte: item.qty }
            }
          }
        },
        {
          $inc: {
            "variants.$.stock": -item.qty,
            sold: item.qty
          }
        }
      );

      if (result.modifiedCount !== 1) {
        throw new AppError(`Insufficient stock for ${item.sku}`, 400);
      }

      decremented.push(item);
    }
  } catch (error) {
    await restoreStock(decremented);
    throw error;
  }
};

const restoreStock = async (items) => {
  await Promise.all(
    items.map((item) =>
      Product.updateOne(
        { _id: item.product, "variants._id": item.variantId },
        {
          $inc: {
            "variants.$.stock": item.qty,
            sold: -item.qty
          }
        }
      )
    )
  );
};

const incrementCouponUsage = async (couponCode, user = null) => {
  if (!couponCode) return;

  await Coupon.updateOne(
    { code: couponCode },
    {
      $inc: { usedCount: 1 },
      ...(user ? { $addToSet: { usedBy: user._id } } : {})
    }
  );
};

const decrementCouponUsage = async (couponCode, user = null) => {
  if (!couponCode) return;

  await Coupon.updateOne(
    { code: couponCode, usedCount: { $gt: 0 } },
    {
      $inc: { usedCount: -1 },
      ...(user ? { $pull: { usedBy: user._id } } : {})
    }
  );
};

const canAccessOrder = (order, user, contact = "") => {
  if (user?.role === "admin") return true;
  if (user && order.user && String(order.user) === String(user._id)) return true;

  const normalizedContact = String(contact).trim().toLowerCase();
  return (
    normalizedContact &&
    [order.customer.phone, order.customer.email]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase())
      .includes(normalizedContact)
  );
};

export const createOrder = async (payload, user = null) => {
  const cart = await priceCart(
    {
      items: payload.items,
      couponCode: payload.couponCode
    },
    user
  );

  if (!cart.isValid) {
    throw new AppError("Cart has unavailable items", 400, cart.unavailableItems);
  }

  const shipping = await getShippingFee(payload.shippingAddress.governorate, cart.total);
  const orderNumber = await generateOrderNumber();
  const shippingFee = shipping.fee;
  const total = roundMoney(cart.total + shippingFee);

  let stockDecremented = false;

  if (payload.paymentMethod === "cod") {
    await decrementStock(cart.items);
    stockDecremented = true;
  }

  try {
    const order = await Order.create({
      orderNumber,
      user: user?._id || null,
      customer: payload.customer,
      shippingAddress: payload.shippingAddress,
      items: toOrderItems(cart.items),
      subtotal: cart.subtotal,
      shippingFee,
      discount: cart.discount,
      total,
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentMethod === "cod" ? "pending" : "pending",
      status: "pending",
      statusHistory: [{ status: "pending", at: new Date(), note: "Order created" }]
    });

    if (payload.paymentMethod === "cod") {
      await incrementCouponUsage(cart.discount.couponCode, user);
    }

    await sendOrderConfirmationEmail(order);
    return order;
  } catch (error) {
    if (stockDecremented) {
      await restoreStock(cart.items);
      await decrementCouponUsage(cart.discount.couponCode, user);
    }
    throw error;
  }
};

export const trackOrder = async ({ orderNumber, contact }) => {
  const normalizedContact = String(contact).trim().toLowerCase();
  const order = await Order.findOne({
    orderNumber,
    $or: [
      { "customer.phone": contact },
      { "customer.email": normalizedContact }
    ]
  }).lean();

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};

export const listOrders = async (query) => {
  const pagination = buildPagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  if (query.search) {
    const search = String(query.search).trim();
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { "customer.name": { $regex: search, $options: "i" } },
      { "customer.email": { $regex: search, $options: "i" } },
      { "customer.phone": { $regex: search, $options: "i" } }
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    Order.countDocuments(filter)
  ]);

  return {
    orders,
    meta: buildMeta({ ...pagination, total })
  };
};

export const getOrderById = async (id) => {
  const order = await Order.findById(id).populate("user", "name email phone");

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};

export const cancelOrder = async (id, { contact = "", reason = "" } = {}, user = null) => {
  const order = await Order.findById(id);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (!canAccessOrder(order, user, contact)) {
    throw new AppError("You cannot access this order", 403);
  }

  if (!cancellableStatuses.includes(order.status)) {
    throw new AppError("Order cannot be cancelled after shipping starts", 400);
  }

  if (order.paymentMethod === "cod" || order.paymentStatus === "paid") {
    // Restore by SKU because order snapshots do not store variant ObjectIds.
    await Promise.all(
      order.items.map((item) =>
        Product.updateOne(
          { _id: item.product, "variants.sku": item.sku },
          {
            $inc: {
              "variants.$.stock": item.qty,
              sold: -item.qty
            }
          }
        )
      )
    );
  }

  if (order.paymentMethod === "cod") {
    await decrementCouponUsage(order.discount.couponCode, order.user ? { _id: order.user } : null);
  }

  order.status = "cancelled";
  order.cancelledReason = reason;
  order.statusHistory.push({ status: "cancelled", at: new Date(), note: reason || "Order cancelled" });
  await order.save();
  await sendOrderStatusEmail(order);

  return order;
};

export const updateOrderStatus = async (id, { status, note = "" }) => {
  const order = await getOrderById(id);

  order.status = status;
  order.statusHistory.push({ status, at: new Date(), note });
  await order.save();
  await sendOrderStatusEmail(order);

  return order;
};

export const updateCourier = async (id, payload) => {
  const order = await getOrderById(id);

  order.courier = payload;
  await order.save();

  return order;
};
