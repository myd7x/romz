import Joi from "joi";

export const createShippingZoneSchema = Joi.object({
  governorate: Joi.string().trim().max(80).required(),
  fee: Joi.number().min(0).required(),
  estimatedDays: Joi.string().trim().max(80).default("1-3 working days"),
  isActive: Joi.boolean().default(true)
});

export const updateShippingZoneSchema = Joi.object({
  governorate: Joi.string().trim().max(80).optional(),
  fee: Joi.number().min(0).optional(),
  estimatedDays: Joi.string().trim().max(80).optional(),
  isActive: Joi.boolean().optional()
}).min(1);

export const shippingZoneIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});
