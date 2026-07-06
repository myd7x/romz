import { Router } from "express";
import { optionalAuth } from "../../middlewares/auth.middleware.js";
import { paymentWebhookLimiter } from "../../middlewares/rateLimit.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as paymentsController from "./payments.controller.js";
import { createPaymobIntentSchema } from "./payments.validation.js";

const router = Router();

router.post(
  "/paymob/intent",
  optionalAuth,
  validate(createPaymobIntentSchema),
  asyncHandler(paymentsController.createPaymobIntent)
);
router.post(
  "/paymob/webhook",
  paymentWebhookLimiter,
  asyncHandler(paymentsController.handlePaymobWebhook)
);

export default router;
