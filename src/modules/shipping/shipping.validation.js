import Joi from "joi";

const quoteItemSchema = Joi.object({
  product: Joi.string().hex().length(24).required(),
  variantId: Joi.string().hex().length(24).optional(),
  sku: Joi.string().trim().max(80).optional(),
  qty: Joi.number().integer().min(1).max(99).required()
}).or("variantId", "sku");

export const quoteShippingSchema = Joi.object({
  zoneCode: Joi.string().trim().max(80).required(),
  // Optional display name; enables the per-governorate fallback fee if Mylerz is down.
  governorate: Joi.string().trim().max(80).allow("").optional(),
  items: Joi.array().items(quoteItemSchema).min(1).required(),
  couponCode: Joi.string().trim().uppercase().max(40).allow("").default(""),
  paymentMethod: Joi.string().valid("cod", "paymob").default("cod")
});
