import Joi from "joi";

const cartItemSchema = Joi.object({
  product: Joi.string().hex().length(24).required(),
  variantId: Joi.string().hex().length(24).optional(),
  sku: Joi.string().trim().max(80).optional(),
  qty: Joi.number().integer().min(1).max(99).required()
}).or("variantId", "sku");

export const validateCartSchema = Joi.object({
  items: Joi.array().items(cartItemSchema).min(1).required(),
  couponCode: Joi.string().trim().uppercase().max(40).allow("").optional()
});
