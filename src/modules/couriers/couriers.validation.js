import Joi from "joi";

export const courierProviders = ["bosta", "mylerz", "manual"];

export const orderIdParamsSchema = Joi.object({
  orderId: Joi.string().hex().length(24).required()
});

export const assignTrackingSchema = Joi.object({
  name: Joi.string()
    .trim()
    .lowercase()
    .valid(...courierProviders)
    .required(),
  trackingNumber: Joi.string().trim().max(120).required(),
  trackingUrl: Joi.string().trim().uri().allow("").default(""),
  markAsShipped: Joi.boolean().default(false),
  note: Joi.string().trim().max(500).allow("").default("")
});
