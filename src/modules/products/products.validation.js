import Joi from "joi";

const localizedStringSchema = Joi.object({
  ar: Joi.string().trim().min(1).max(180).required(),
  en: Joi.string().trim().min(1).max(180).required()
}).required();

const imageSchema = Joi.object({
  url: Joi.string().trim().uri().required(),
  publicId: Joi.string().trim().required(),
  color: Joi.string().trim().max(80).allow("").default("")
});

const colorSchema = Joi.object({
  name: Joi.string().trim().max(80).required(),
  hex: Joi.string().trim().max(20).allow("").default("")
});

const variantSchema = Joi.object({
  sku: Joi.string().trim().max(80).required(),
  size: Joi.string().trim().max(20).required(),
  color: colorSchema.required(),
  stock: Joi.number().integer().min(0).default(0),
  priceOverride: Joi.number().min(0).allow(null).default(null)
});

export const createProductSchema = Joi.object({
  name: localizedStringSchema,
  slug: Joi.string().trim().lowercase().max(220).optional(),
  description: localizedStringSchema,
  category: Joi.string().hex().length(24).required(),
  collections: Joi.array().items(Joi.string().hex().length(24)).default([]),
  basePrice: Joi.number().min(0).required(),
  salePrice: Joi.number().min(0).allow(null).default(null),
  images: Joi.array().items(imageSchema).default([]),
  variants: Joi.array().items(variantSchema).min(1).required(),
  badges: Joi.array().items(Joi.string().valid("new", "best-seller", "sale")).default([]),
  isActive: Joi.boolean().default(true)
});

export const updateProductSchema = Joi.object({
  name: localizedStringSchema.optional(),
  slug: Joi.string().trim().lowercase().max(220).optional(),
  description: localizedStringSchema.optional(),
  category: Joi.string().hex().length(24).optional(),
  collections: Joi.array().items(Joi.string().hex().length(24)).optional(),
  basePrice: Joi.number().min(0).optional(),
  salePrice: Joi.number().min(0).allow(null).optional(),
  images: Joi.array().items(imageSchema).optional(),
  variants: Joi.array().items(variantSchema).min(1).optional(),
  badges: Joi.array().items(Joi.string().valid("new", "best-seller", "sale")).optional(),
  isActive: Joi.boolean().optional()
}).min(1);

export const productIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

export const productSlugParamsSchema = Joi.object({
  slug: Joi.string().trim().required()
});
