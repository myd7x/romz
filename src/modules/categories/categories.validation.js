import Joi from "joi";

const localizedStringSchema = Joi.object({
  ar: Joi.string().trim().min(1).max(120).required(),
  en: Joi.string().trim().min(1).max(120).required()
}).required();

const imageSchema = Joi.object({
  url: Joi.alternatives()
    .try(
      Joi.string().trim().uri(),
      Joi.string().trim().pattern(/^\/uploads\/.+/),
      Joi.string().valid("")
    )
    .default(""),
  publicId: Joi.string().trim().allow("").default("")
}).allow(null);

const parentSchema = Joi.alternatives()
  .try(Joi.string().hex().length(24), Joi.string().valid(""), Joi.valid(null))
  .optional();

export const createCategorySchema = Joi.object({
  name: localizedStringSchema,
  slug: Joi.string().trim().lowercase().max(140).optional(),
  image: imageSchema.default({ url: "", publicId: "" }),
  removeImage: Joi.boolean().optional(),
  parent: parentSchema,
  isActive: Joi.boolean().default(true),
  order: Joi.number().integer().min(0).default(0)
});

export const updateCategorySchema = Joi.object({
  name: localizedStringSchema.optional(),
  slug: Joi.string().trim().lowercase().max(140).optional(),
  image: imageSchema.optional(),
  removeImage: Joi.boolean().optional(),
  parent: parentSchema,
  isActive: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).optional()
});

export const categoryIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});
