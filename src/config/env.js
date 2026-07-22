import dotenv from "dotenv";

dotenv.config();

const toList = (value) =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5000),
  API_PREFIX: process.env.API_PREFIX || "/api/v1",
  CLIENT_ORIGINS: toList(process.env.CLIENT_ORIGINS),
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "change-me-access",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "change-me-refresh",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  JWT_REFRESH_COOKIE_NAME: process.env.JWT_REFRESH_COOKIE_NAME || "romz_refresh",
  JWT_REFRESH_COOKIE_SECURE: process.env.JWT_REFRESH_COOKIE_SECURE || "",
  JWT_REFRESH_COOKIE_SAME_SITE: process.env.JWT_REFRESH_COOKIE_SAME_SITE || "",
  JWT_REFRESH_COOKIE_PARTITIONED: process.env.JWT_REFRESH_COOKIE_PARTITIONED || "",
  REDIS_URL: process.env.REDIS_URL || "",
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || "",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "ROMZ <no-reply@romz.local>",
  CONTACT_EMAIL: process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || "admin@romz.local",
  WHATSAPP_BASE_URL: process.env.WHATSAPP_BASE_URL || "https://graph.facebook.com",
  WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION || "v21.0",
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || "",
  WHATSAPP_DEFAULT_COUNTRY_CODE: process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "20",
  CONTACT_WHATSAPP: process.env.CONTACT_WHATSAPP || process.env.ADMIN_PHONE || "",
  ADMIN_NAME: process.env.ADMIN_NAME || "ROMZ Admin",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@romz.local",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "change-me",
  ADMIN_PHONE: process.env.ADMIN_PHONE || "",
  PAYMOB_API_KEY: process.env.PAYMOB_API_KEY || "",
  PAYMOB_SECRET_KEY: process.env.PAYMOB_SECRET_KEY || "",
  PAYMOB_PUBLIC_KEY: process.env.PAYMOB_PUBLIC_KEY || "",
  PAYMOB_HMAC_SECRET: process.env.PAYMOB_HMAC_SECRET || "",
  PAYMOB_CARD_INTEGRATION_ID: process.env.PAYMOB_CARD_INTEGRATION_ID || "",
  PAYMOB_IFRAME_ID: process.env.PAYMOB_IFRAME_ID || "",
  PAYMOB_CHECKOUT_FLOW: process.env.PAYMOB_CHECKOUT_FLOW || "auto",
  PAYMOB_BASE_URL: process.env.PAYMOB_BASE_URL || "https://accept.paymob.com",
  MYLERZ_BASE_URL:
    process.env.MYLERZ_BASE_URL || "https://integration.mylerz.net",
  MYLERZ_USERNAME: process.env.MYLERZ_USERNAME || "",
  MYLERZ_PASSWORD: process.env.MYLERZ_PASSWORD || "",
  MYLERZ_WAREHOUSE_NAME: process.env.MYLERZ_WAREHOUSE_NAME || "Alexandria",
  MYLERZ_DEFAULT_SERVICE_TYPE: process.env.MYLERZ_DEFAULT_SERVICE_TYPE || "DTD",
  MYLERZ_DEFAULT_SERVICE: process.env.MYLERZ_DEFAULT_SERVICE || "ND",
  MYLERZ_DEFAULT_SERVICE_CATEGORY: process.env.MYLERZ_DEFAULT_SERVICE_CATEGORY || "DELIVERY",
  MYLERZ_DEFAULT_ADDRESS_CATEGORY: process.env.MYLERZ_DEFAULT_ADDRESS_CATEGORY || "H",
  MYLERZ_DEFAULT_PRODUCT_CATEGORY: process.env.MYLERZ_DEFAULT_PRODUCT_CATEGORY || "Fashion",
  MYLERZ_DEFAULT_WEIGHT_KG: Number(process.env.MYLERZ_DEFAULT_WEIGHT_KG || 1),
  MYLERZ_CURRENCY: process.env.MYLERZ_CURRENCY || "EGP",
  // Background job that keeps order statuses in sync with Mylerz (delivered/returned).
  COURIER_SYNC_ENABLED: String(process.env.COURIER_SYNC_ENABLED ?? "true") === "true",
  COURIER_SYNC_INTERVAL_MINUTES: Number(process.env.COURIER_SYNC_INTERVAL_MINUTES || 30)
};

export const isProduction = env.NODE_ENV === "production";
