import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, required: true }
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    governorate: { type: String, trim: true, required: true },
    city: { type: String, trim: true, required: true },
    street: { type: String, trim: true, required: true },
    apartment: { type: String, trim: true, default: "" },
    postal: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    nameSnapshot: {
      ar: { type: String, trim: true, required: true },
      en: { type: String, trim: true, required: true }
    },
    sku: { type: String, trim: true, required: true },
    size: { type: String, trim: true, required: true },
    color: {
      name: { type: String, trim: true, required: true },
      hex: { type: String, trim: true, default: "" }
    },
    qty: { type: Number, min: 1, required: true },
    unitPrice: { type: Number, min: 0, required: true }
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"],
      required: true
    },
    at: { type: Date, default: Date.now },
    note: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, trim: true, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    customer: { type: customerSchema, required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, min: 0, required: true },
    shippingFee: { type: Number, min: 0, required: true },
    discount: {
      couponCode: { type: String, trim: true, uppercase: true, default: "" },
      amount: { type: Number, min: 0, default: 0 }
    },
    total: { type: Number, min: 0, required: true },
    paymentMethod: { type: String, enum: ["paymob", "cod"], required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true
    },
    paymobTransactionId: { type: String, trim: true, default: "" },
    paymobOrderId: { type: String, trim: true, default: "", index: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"],
      default: "pending",
      index: true
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    courier: {
      name: { type: String, trim: true, default: "" },
      trackingNumber: { type: String, trim: true, default: "" },
      trackingUrl: { type: String, trim: true, default: "" },
      pickupOrderCode: { type: String, trim: true, default: "" },
      reference: { type: String, trim: true, default: "" },
      status: { type: String, trim: true, default: "" },
      lastSyncedAt: { type: Date, default: null },
      raw: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    cancelledReason: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

orderSchema.index({ orderNumber: 1, "customer.phone": 1 });
orderSchema.index({ orderNumber: 1, "customer.email": 1 });
orderSchema.index({ status: 1, paymentStatus: 1, createdAt: -1 });
orderSchema.index({ paymentMethod: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymobTransactionId: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
