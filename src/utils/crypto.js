import crypto from "node:crypto";

export const hashValue = (value) => crypto.createHash("sha256").update(value).digest("hex");

export const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

export const generateSecureToken = () => crypto.randomBytes(32).toString("hex");
