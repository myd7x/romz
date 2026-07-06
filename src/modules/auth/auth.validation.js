import Joi from "joi";

const password = Joi.string().min(8).max(128).required();
const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } });

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: email.required(),
  password,
  phone: Joi.string().trim().max(30).allow("").optional()
});

export const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().required()
});

export const verifyEmailSchema = Joi.object({
  email: email.required(),
  code: Joi.string().trim().length(6).pattern(/^\d+$/).required()
});

export const resendOtpSchema = Joi.object({
  email: email.required()
});

export const forgotPasswordSchema = Joi.object({
  email: email.required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().required(),
  password
});
