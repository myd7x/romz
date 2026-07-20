import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";

let cachedToken = null;

const normalizeBaseUrl = () => env.MYLERZ_BASE_URL.replace(/\/+$/, "");

const ensureMylerzConfig = () => {
  if (!env.MYLERZ_BASE_URL || !env.MYLERZ_USERNAME || !env.MYLERZ_PASSWORD) {
    throw new AppError("Mylerz credentials are not configured", 500);
  }
};

const parseJson = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const assertMylerzResponse = (data) => {
  if (data?.IsErrorState) {
    throw new AppError(data.ErrorDescription || "Mylerz request failed", 400, data.ErrorMetadata || data);
  }

  return data;
};

export const authenticateMylerz = async () => {
  ensureMylerzConfig();

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.accessToken;
  }

  const form = new URLSearchParams({
    grant_type: "password",
    username: env.MYLERZ_USERNAME.trim(),
    password: env.MYLERZ_PASSWORD.trim()
  });

  const response = await fetch(`${normalizeBaseUrl()}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const reason =
      data?.error_description || data?.error || (typeof data === "string" ? data : "");
    throw new AppError(
      `Mylerz authentication failed${reason ? `: ${reason}` : ""}`,
      response.status,
      data
    );
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
  };

  return cachedToken.accessToken;
};

export const mylerzRequest = async (path, { method = "GET", body, query } = {}) => {
  const token = await authenticateMylerz();
  const url = new URL(`${normalizeBaseUrl()}${path}`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });

  const data = await parseJson(response);

  if (!response.ok) {
    throw new AppError("Mylerz request failed", response.status, data);
  }

  return assertMylerzResponse(data);
};

export const resetMylerzTokenCache = () => {
  cachedToken = null;
};
