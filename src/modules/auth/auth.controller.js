import * as authService from "./auth.service.js";
import { created, noContent, ok } from "../../utils/responseHandler.js";

export const register = async (req, res) => {
  const data = await authService.register(req.body, res);
  return created(res, {
    message: "Account created. Verification code sent.",
    data
  });
};

export const login = async (req, res) => {
  const data = await authService.login(req.body, res);
  return ok(res, {
    message: "Logged in successfully",
    data
  });
};

export const verifyEmail = async (req, res) => {
  const user = await authService.verifyEmail(req.body);
  return ok(res, {
    message: "Email verified successfully",
    data: { user }
  });
};

export const resendOtp = async (req, res) => {
  await authService.resendOtp(req.body);
  return ok(res, {
    message: "Verification code sent"
  });
};

export const refresh = async (req, res) => {
  const data = await authService.refresh(req, res);
  return ok(res, {
    message: "Token refreshed",
    data
  });
};

export const logout = async (req, res) => {
  await authService.logout(req, res);
  return noContent(res);
};

export const forgotPassword = async (req, res) => {
  await authService.forgotPassword(req.body);
  return ok(res, {
    message: "If the email exists, a reset token has been sent"
  });
};

export const resetPassword = async (req, res) => {
  await authService.resetPassword(req.body);
  return ok(res, {
    message: "Password reset successfully"
  });
};
