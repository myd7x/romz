import Joi from "joi";

export const analyticsQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  granularity: Joi.string().valid("day", "week", "month").default("day"),
  limit: Joi.number().integer().min(1).max(100).default(10)
});
