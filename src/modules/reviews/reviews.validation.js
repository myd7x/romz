import Joi from "joi";

export const createReviewSchema = Joi.object({
  guestName: Joi.string().trim().min(2).max(80).allow("").default(""),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(1500).allow("").default("")
});

export const productIdParamsSchema = Joi.object({
  productId: Joi.string().hex().length(24).required()
});

export const reviewIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});
