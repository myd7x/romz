import { Router } from "express";
import { isAdmin, requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as shippingZonesController from "./shippingZones.controller.js";
import {
  createShippingZoneSchema,
  shippingZoneIdParamsSchema,
  updateShippingZoneSchema
} from "./shippingZones.validation.js";

const router = Router();

router.get("/", asyncHandler(shippingZonesController.listShippingZones));
router.get(
  "/:id",
  requireAuth,
  isAdmin,
  validate(shippingZoneIdParamsSchema, "params"),
  asyncHandler(shippingZonesController.getShippingZoneById)
);
router.post(
  "/",
  requireAuth,
  isAdmin,
  validate(createShippingZoneSchema),
  asyncHandler(shippingZonesController.createShippingZone)
);
router.patch(
  "/:id",
  requireAuth,
  isAdmin,
  validate(shippingZoneIdParamsSchema, "params"),
  validate(updateShippingZoneSchema),
  asyncHandler(shippingZonesController.updateShippingZone)
);
router.delete(
  "/:id",
  requireAuth,
  isAdmin,
  validate(shippingZoneIdParamsSchema, "params"),
  asyncHandler(shippingZonesController.deleteShippingZone)
);

export default router;
