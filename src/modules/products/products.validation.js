import Joi from "joi";

const localizedStringSchema = Joi.object({
  ar: Joi.string().trim().min(1).max(180).required(),
  en: Joi.string().trim().min(1).max(180).required()
}).required();

const imageSchema = Joi.object({
  url: Joi.alternatives()
    .try(
      Joi.string().trim().uri(),
      Joi.string().trim().pattern(/^\/uploads\/.+/)
    )
    .required(),
  publicId: Joi.string().trim().required(),
  color: Joi.string().trim().max(80).allow("").default("")
});

const imageColorsSchema = Joi.array().items(Joi.string().trim().max(80).allow("")).default([]);

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
  category: Joi.string().hex().length(24).optional(),
  categories: Joi.array().items(Joi.string().hex().length(24)).min(1).optional(),
  collections: Joi.array().items(Joi.string().hex().length(24)).default([]),
  basePrice: Joi.number().min(0).required(),
  salePrice: Joi.number().min(0).allow(null).default(null),
  imageColors: imageColorsSchema,
  variants: Joi.array().items(variantSchema).min(1).required(),
  badges: Joi.array().items(Joi.string().valid("new", "best-seller", "sale")).default([]),
  isActive: Joi.boolean().default(true)
}).or("category", "categories");

export const updateProductSchema = Joi.object({
  name: localizedStringSchema.optional(),
  slug: Joi.string().trim().lowercase().max(220).optional(),
  description: localizedStringSchema.optional(),
  category: Joi.string().hex().length(24).optional(),
  categories: Joi.array().items(Joi.string().hex().length(24)).min(1).optional(),
  collections: Joi.array().items(Joi.string().hex().length(24)).optional(),
  basePrice: Joi.number().min(0).optional(),
  salePrice: Joi.number().min(0).allow(null).optional(),
  existingImages: Joi.array().items(imageSchema).optional(),
  existingImageColors: Joi.array().items(Joi.string().trim().max(80).allow("")).optional(),
  imageColors: Joi.array().items(Joi.string().trim().max(80).allow("")).optional(),
  variants: Joi.array().items(variantSchema).min(1).optional(),
  badges: Joi.array().items(Joi.string().valid("new", "best-seller", "sale")).optional(),
  isActive: Joi.boolean().optional()
});

export const productIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

export const productSlugParamsSchema = Joi.object({
  slug: Joi.string().trim().required()
});
