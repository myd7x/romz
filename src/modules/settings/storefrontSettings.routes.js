import { Router } from "express";
import { isAdmin, requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as settingsController from "./settings.controller.js";
import { updateStoreSettingsSchema } from "./settings.validation.js";

export const storefrontSettingsRoutes = Router();
storefrontSettingsRoutes.get("/", asyncHandler(settingsController.getStoreSettings));

export const adminStorefrontSettingsRoutes = Router();
adminStorefrontSettingsRoutes.patch(
  "/",
  requireAuth,
  isAdmin,
  validate(updateStoreSettingsSchema),
  asyncHandler(settingsController.updateStoreSettings)
);
