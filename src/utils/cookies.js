import { env } from "../config/env.js";

const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
const sameSiteValues = new Set(["strict", "lax", "none"]);

const envBoolean = (value, fallback) => {
  if (value === "") return fallback;
  return String(value).toLowerCase() === "true";
};

const normalizeSameSite = (value, fallback) => {
  const normalized = String(value || "").toLowerCase();
  return sameSiteValues.has(normalized) ? normalized : fallback;
};

export const buildRefreshCookieOptions = () => {
  const secure = envBoolean(env.JWT_REFRESH_COOKIE_SECURE, env.NODE_ENV === "production");
  const sameSite = normalizeSameSite(env.JWT_REFRESH_COOKIE_SAME_SITE, secure ? "none" : "lax");
  const partitioned = envBoolean(
    env.JWT_REFRESH_COOKIE_PARTITIONED,
    secure && sameSite === "none"
  );

  return {
    httpOnly: true,
    secure,
    sameSite,
    ...(partitioned && secure && sameSite === "none" ? { partitioned: true } : {}),
    maxAge: sevenDaysMs,
    path: "/"
  };
};

export const setRefreshCookie = (res, token) => {
  res.cookie(env.JWT_REFRESH_COOKIE_NAME, token, buildRefreshCookieOptions());
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(env.JWT_REFRESH_COOKIE_NAME, {
    ...buildRefreshCookieOptions(),
    maxAge: undefined
  });
};
