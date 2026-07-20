import Joi from "joi";

const orderItemSchema = Joi.object({
  product: Joi.string().hex().length(24).required(),
  variantId: Joi.string().hex().length(24).optional(),
  sku: Joi.string().trim().max(80).optional(),
  qty: Joi.number().integer().min(1).max(99).required()
}).or("variantId", "sku");

const customerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).allow("").default(""),
  phone: Joi.string().trim().min(5).max(30).required()
}).required();

const shippingAddressSchema = Joi.object({
  governorate: Joi.string().trim().max(80).required(),
  city: Joi.string().trim().max(80).required(),
  // Mylerz destination codes chosen from GET /shipping/governorates.
  governorateCode: Joi.string().trim().max(80).required(),
  zoneCode: Joi.string().trim().max(80).required(),
  street: Joi.string().trim().max(220).required(),
  apartment: Joi.string().trim().max(80).allow("").default(""),
  postal: Joi.string().trim().max(40).allow("").default("")
}).required();

export const createOrderSchema = Joi.object({
  customer: customerSchema,
  shippingAddress: shippingAddressSchema,
  items: Joi.array().items(orderItemSchema).min(1).required(),
  couponCode: Joi.string().trim().uppercase().max(40).allow("").default(""),
  paymentMethod: Joi.string().valid("cod", "paymob").required()
});

export const trackOrderQuerySchema = Joi.object({
  orderNumber: Joi.string().trim().required(),
  contact: Joi.string().trim().required()
});

export const orderIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

export const cancelOrderSchema = Joi.object({
  contact: Joi.string().trim().allow("").default(""),
  reason: Joi.string().trim().max(500).allow("").default("")
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid("pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned")
    .required(),
  note: Joi.string().trim().max(500).allow("").default("")
});

export const updateCourierSchema = Joi.object({
  name: Joi.string().trim().max(80).allow("").default(""),
  trackingNumber: Joi.string().trim().max(120).allow("").default(""),
  trackingUrl: Joi.string().trim().uri().allow("").default("")
});
