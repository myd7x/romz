import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

const cleanCredential = (value) => {
  const normalized = String(value || "").trim();
  const quote = normalized[0];

  if ((quote === '"' || quote === "'") && normalized.at(-1) === quote) {
    return normalized.slice(1, -1).trim();
  }

  return normalized;
};

const cloudinaryUrl = cleanCredential(env.CLOUDINARY_URL);

if (cloudinaryUrl) {
  process.env.CLOUDINARY_URL = cloudinaryUrl;
  cloudinary.config(true);
  cloudinary.config({ secure: true });
} else {
  cloudinary.config({
    cloud_name: cleanCredential(env.CLOUDINARY_CLOUD_NAME),
    api_key: cleanCredential(env.CLOUDINARY_API_KEY),
    api_secret: cleanCredential(env.CLOUDINARY_API_SECRET),
    secure: true
  });
}

export const assertCloudinaryConfigured = () => {
  const config = cloudinary.config();
  const cloudName = String(config.cloud_name || "");

  if (!cloudName || !config.api_key || !config.api_secret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_URL or all three CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET variables"
    );
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(cloudName)) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME must contain only the Cloudinary cloud name, not a URL or credential string"
    );
  }
};

export default cloudinary;
