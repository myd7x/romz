import mongoose from "mongoose";
import { env } from "../config/env.js";
import { sendResponse } from "../utils/responseHandler.js";

const normalizeError = (error) => {
  if (error instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 400,
      message: "Validation failed",
      details: Object.values(error.errors).map((item) => item.message)
    };
  }

  if (error?.code === 11000) {
    return {
      statusCode: 409,
      message: "Duplicate value",
      details: error.keyValue
    };
  }

  if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
    return {
      statusCode: 401,
      message: "Invalid or expired token"
    };
  }

  return {
    statusCode: error.statusCode || 500,
    message: error.message || "Internal server error",
    details: error.details
  };
};

export const errorHandler = (error, req, res, next) => {
  const normalized = normalizeError(error);

  if (env.NODE_ENV !== "test" && !error.isOperational) {
    console.error(error);
  }

  return sendResponse(res, {
    statusCode: normalized.statusCode,
    success: false,
    message: normalized.message,
    data: normalized.details || null,
    meta: env.NODE_ENV === "development" ? { stack: error.stack } : undefined
  });
};
