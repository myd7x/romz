import Joi from "joi";

export const createCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().max(40).required(),
  type: Joi.string().valid("percent", "fixed").required(),
  value: Joi.number().min(0).required(),
  minOrderTotal: Joi.number().min(0).default(0),
  maxDiscount: Joi.number().min(0).allow(null).default(null),
  expiresAt: Joi.date().iso().allow(null).default(null),
  usageLimit: Joi.number().integer().min(0).allow(null).default(null),
  isActive: Joi.boolean().default(true)
});

export const updateCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().max(40).optional(),
  type: Joi.string().valid("percent", "fixed").optional(),
  value: Joi.number().min(0).optional(),
  minOrderTotal: Joi.number().min(0).optional(),
  maxDiscount: Joi.number().min(0).allow(null).optional(),
  expiresAt: Joi.date().iso().allow(null).optional(),
  usageLimit: Joi.number().integer().min(0).allow(null).optional(),
  isActive: Joi.boolean().optional()
}).min(1);

export const couponIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

export const validateCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().max(40).required(),
  subtotal: Joi.number().min(0).required()
});
