import rateLimit from "express-rate-limit";

const buildLimiter = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
      data: null
    }
  });

export const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many auth attempts. Please try again later."
});

export const otpLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  message: "Too many OTP attempts. Please try again later."
});

export const passwordResetLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Too many password reset attempts. Please try again later."
});

export const trackOrderLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many order tracking attempts. Please try again later."
});

export const contactLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many contact form submissions. Please try again later."
});

export const paymentWebhookLimiter = buildLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  message: "Too many payment webhook requests."
});
