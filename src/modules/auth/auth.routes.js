import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { authLimiter, otpLimiter, passwordResetLimiter } from "../../middlewares/rateLimit.middleware.js";
import * as authController from "./auth.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from "./auth.validation.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post("/verify-email", otpLimiter, validate(verifyEmailSchema), asyncHandler(authController.verifyEmail));
router.post("/resend-otp", otpLimiter, validate(resendOtpSchema), asyncHandler(authController.resendOtp));
router.post("/refresh", asyncHandler(authController.refresh));
router.post("/logout", asyncHandler(authController.logout));
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);
router.post(
  "/reset-password",
  passwordResetLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);

export default router;
