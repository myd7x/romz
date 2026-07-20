import Joi from "joi";

const localizedStringSchema = Joi.object({
  ar: Joi.string().trim().max(500).allow("").optional(),
  en: Joi.string().trim().max(500).allow("").optional()
});

const localizedStringWithDefaultsSchema = Joi.object({
  ar: Joi.string().trim().max(500).allow("").default(""),
  en: Joi.string().trim().max(500).allow("").default("")
});

const imageSchema = Joi.object({
  url: Joi.alternatives()
    .try(
      Joi.string().trim().uri(),
      Joi.string().trim().pattern(/^\/uploads\/.+/),
      Joi.string().valid("")
    )
    .default(""),
  publicId: Joi.string().trim().allow("").default("")
}).default({ url: "", publicId: "" });

const heroSlideSchema = Joi.object({
  title: localizedStringWithDefaultsSchema.default({}),
  subtitle: localizedStringWithDefaultsSchema.default({}),
  image: imageSchema,
  ctaLabel: localizedStringWithDefaultsSchema.default({}),
  ctaHref: Joi.string().trim().max(500).allow("").default(""),
  isActive: Joi.boolean().default(true),
  order: Joi.number().min(0).default(0)
});

const promoBarSchema = localizedStringSchema.keys({
  active: Joi.boolean().optional()
});

const sizeChartSchema = Joi.object({
  isActive: Joi.boolean().optional(),
  title: localizedStringSchema.optional(),
  note: localizedStringSchema.optional(),
  columns: Joi.array().items(localizedStringWithDefaultsSchema).max(12).optional(),
  rows: Joi.array()
    .items(Joi.array().items(Joi.string().trim().max(120).allow("")).max(12))
    .max(50)
    .optional()
}).min(1);

export const updateStoreSettingsSchema = Joi.object({
  storeName: Joi.string().trim().min(1).max(120).optional(),
  promoBar: promoBarSchema.optional(),
  promoBarActive: Joi.boolean().optional(),
  announcement: localizedStringSchema.optional(),
  heroSlides: Joi.array().items(heroSlideSchema).optional(),
  featuredCollections: Joi.array().items(Joi.string().hex().length(24)).optional(),
  socialLinks: Joi.object({
    facebook: Joi.string().trim().max(500).allow("").optional(),
    instagram: Joi.string().trim().max(500).allow("").optional(),
    tiktok: Joi.string().trim().max(500).allow("").optional(),
    whatsapp: Joi.string().trim().max(500).allow("").optional()
  }).optional(),
  payments: Joi.object({
    paymob: Joi.object({
      active: Joi.boolean().optional()
    }).optional()
  }).optional(),
  freeShippingThreshold: Joi.number().min(0).allow(null).optional(),
  fallbackShippingFee: Joi.number().min(0).allow(null).optional(),
  lowStockThreshold: Joi.number().integer().min(0).optional(),
  sizeChart: sizeChartSchema.optional()
}).min(1);
