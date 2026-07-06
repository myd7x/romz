import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.model.js";

const getBearerToken = (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7);
};

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    throw new AppError("Authentication required", 401);
  }

  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.sub).select("-password");

  if (!user) {
    throw new AppError("User no longer exists", 401);
  }

  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return next();
  }

  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.sub).select("-password");

  if (!user) {
    throw new AppError("User no longer exists", 401);
  }

  req.user = user;
  return next();
});

export const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return next(new AppError("Admin access required", 403));
  }

  return next();
};
