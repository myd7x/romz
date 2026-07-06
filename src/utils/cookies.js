import { env, isProduction } from "../config/env.js";

const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

export const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: sevenDaysMs,
  path: "/"
};

export const setRefreshCookie = (res, token) => {
  res.cookie(env.JWT_REFRESH_COOKIE_NAME, token, refreshCookieOptions);
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(env.JWT_REFRESH_COOKIE_NAME, {
    ...refreshCookieOptions,
    maxAge: undefined
  });
};
