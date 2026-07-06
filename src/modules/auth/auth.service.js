import { env } from "../../config/env.js";
import User from "../../models/User.model.js";
import { sendOtpEmail, sendPasswordResetEmail } from "../../services/email.service.js";
import { AppError } from "../../utils/AppError.js";
import { clearRefreshCookie, setRefreshCookie } from "../../utils/cookies.js";
import { generateOtp, generateSecureToken, hashValue } from "../../utils/crypto.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";

const otpTtlMs = 10 * 60 * 1000;
const resetTtlMs = 15 * 60 * 1000;

const buildTokenPayload = (user) => ({
  sub: user._id.toString(),
  role: user.role
});

const issueTokens = (user) => ({
  accessToken: signAccessToken(buildTokenPayload(user)),
  refreshToken: signRefreshToken({
    ...buildTokenPayload(user),
    tokenVersion: user.refreshTokenVersion
  })
});

const setOtp = async (user) => {
  const otp = generateOtp();
  user.otp = {
    code: hashValue(otp),
    expiresAt: new Date(Date.now() + otpTtlMs)
  };
  await user.save();
  await sendOtpEmail(user, otp);
};

export const register = async (payload, res) => {
  const existingUser = await User.findOne({ email: payload.email });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  const user = await User.create(payload);
  await setOtp(user);

  const tokens = issueTokens(user);
  setRefreshCookie(res, tokens.refreshToken);

  return {
    user: user.toSafeObject(),
    accessToken: tokens.accessToken
  };
};

export const login = async ({ email, password }, res) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  const tokens = issueTokens(user);
  setRefreshCookie(res, tokens.refreshToken);

  return {
    user: user.toSafeObject(),
    accessToken: tokens.accessToken
  };
};

export const verifyEmail = async ({ email, code }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.isVerified) {
    return user.toSafeObject();
  }

  const isExpired = !user.otp?.expiresAt || user.otp.expiresAt.getTime() < Date.now();
  const isCodeValid = user.otp?.code && user.otp.code === hashValue(code);

  if (isExpired || !isCodeValid) {
    throw new AppError("Invalid or expired verification code", 400);
  }

  user.isVerified = true;
  user.otp = { code: null, expiresAt: null };
  await user.save();

  return user.toSafeObject();
};

export const resendOtp = async ({ email }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.isVerified) {
    throw new AppError("Email is already verified", 400);
  }

  await setOtp(user);
};

export const refresh = async (req, res) => {
  const token = req.cookies?.[env.JWT_REFRESH_COOKIE_NAME];

  if (!token) {
    throw new AppError("Refresh token is required", 401);
  }

  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.sub);

  if (!user || user.refreshTokenVersion !== decoded.tokenVersion) {
    throw new AppError("Invalid refresh token", 401);
  }

  const tokens = issueTokens(user);
  setRefreshCookie(res, tokens.refreshToken);

  return {
    user: user.toSafeObject(),
    accessToken: tokens.accessToken
  };
};

export const logout = async (req, res) => {
  const token = req.cookies?.[env.JWT_REFRESH_COOKIE_NAME];

  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await User.findByIdAndUpdate(decoded.sub, { $inc: { refreshTokenVersion: 1 } });
    } catch {
      // Clearing the cookie is enough when the token is already invalid.
    }
  }

  clearRefreshCookie(res);
};

export const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email }).select("+passwordResetToken +passwordResetExpiresAt");

  if (!user) {
    return;
  }

  const resetToken = generateSecureToken();
  user.passwordResetToken = hashValue(resetToken);
  user.passwordResetExpiresAt = new Date(Date.now() + resetTtlMs);
  await user.save();

  await sendPasswordResetEmail(user, resetToken);
};

export const resetPassword = async ({ token, password }) => {
  const user = await User.findOne({
    passwordResetToken: hashValue(token),
    passwordResetExpiresAt: { $gt: new Date() }
  }).select("+passwordResetToken +passwordResetExpiresAt +password");

  if (!user) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  user.password = password;
  user.passwordResetToken = null;
  user.passwordResetExpiresAt = null;
  user.refreshTokenVersion += 1;
  await user.save();
};
