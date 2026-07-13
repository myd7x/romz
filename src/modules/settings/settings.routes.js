import { Router } from "express";
import { isAdmin, requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as settingsController from "./settings.controller.js";
import { updateStoreSettingsSchema } from "./settings.validation.js";

const router = Router();

router.get("/store", asyncHandler(settingsController.getStoreSettings));
router.patch(
  "/store",
  requireAuth,
  isAdmin,
  validate(updateStoreSettingsSchema),
  asyncHandler(settingsController.updateStoreSettings)
);

export default router;
