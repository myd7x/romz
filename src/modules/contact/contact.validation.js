import Joi from "joi";

export const createContactMessageSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(180).required(),
  phone: Joi.string().trim().max(40).allow("").default(""),
  subject: Joi.string().trim().min(2).max(160).required(),
  message: Joi.string().trim().min(10).max(3000).required(),
  source: Joi.string().trim().max(80).allow("").default("storefront")
});

export const contactMessageIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

export const updateContactMessageSchema = Joi.object({
  status: Joi.string().valid("new", "read", "replied", "archived"),
  adminNotes: Joi.string().trim().max(2000).allow("")
}).min(1);
