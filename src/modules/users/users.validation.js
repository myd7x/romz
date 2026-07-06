import Joi from "joi";

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).optional(),
  phone: Joi.string().trim().max(30).allow("").optional()
}).min(1);

export const addressSchema = Joi.object({
  label: Joi.string().trim().max(40).default("Home"),
  governorate: Joi.string().trim().max(80).required(),
  city: Joi.string().trim().max(80).required(),
  street: Joi.string().trim().max(200).required(),
  apartment: Joi.string().trim().max(80).allow("").default("")
});

export const productIdParamsSchema = Joi.object({
  productId: Joi.string().hex().length(24).required()
});

export const addressIdParamsSchema = Joi.object({
  addressId: Joi.string().hex().length(24).required()
});
