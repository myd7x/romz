import Joi from "joi";

export const createPaymobIntentSchema = Joi.object({
  orderId: Joi.string().hex().length(24).required(),
  contact: Joi.string().trim().allow("").default(""),
  redirectionUrl: Joi.string().trim().uri().allow("").default(""),
  notificationUrl: Joi.string().trim().uri().allow("").default("")
});
