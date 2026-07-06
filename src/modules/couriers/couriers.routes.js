import { Router } from "express";
import { isAdmin, requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as couriersController from "./couriers.controller.js";
import { assignTrackingSchema, orderIdParamsSchema } from "./couriers.validation.js";

const router = Router();

router.use(requireAuth, isAdmin);

router.get("/providers", couriersController.listCourierProviders);
router.post(
  "/orders/:orderId/tracking",
  validate(orderIdParamsSchema, "params"),
  validate(assignTrackingSchema),
  asyncHandler(couriersController.assignTracking)
);

export default router;
