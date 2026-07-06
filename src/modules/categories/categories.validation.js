import Joi from "joi";

const localizedStringSchema = Joi.object({
  ar: Joi.string().trim().min(1).max(120).required(),
  en: Joi.string().trim().min(1).max(120).required()
}).required();

const imageSchema = Joi.object({
  url: Joi.string().trim().uri().allow("").default(""),
  publicId: Joi.string().trim().allow("").default("")
}).default({ url: "", publicId: "" });

export const createCategorySchema = Joi.object({
  name: localizedStringSchema,
  slug: Joi.string().trim().lowercase().max(140).optional(),
  image: imageSchema,
  parent: Joi.string().hex().length(24).allow(null).optional(),
  isActive: Joi.boolean().default(true),
  order: Joi.number().integer().min(0).default(0)
});

export const updateCategorySchema = Joi.object({
  name: localizedStringSchema.optional(),
  slug: Joi.string().trim().lowercase().max(140).optional(),
  image: imageSchema.optional(),
  parent: Joi.string().hex().length(24).allow(null).optional(),
  isActive: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).optional()
}).min(1);

export const categoryIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});
