import { Router } from "express";
import { isAdmin, optionalAuth, requireAuth } from "../../middlewares/auth.middleware.js";
import { trackOrderLimiter } from "../../middlewares/rateLimit.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as ordersController from "./orders.controller.js";
import {
  cancelOrderSchema,
  createOrderSchema,
  orderIdParamsSchema,
  trackOrderQuerySchema,
  updateCourierSchema,
  updateOrderStatusSchema
} from "./orders.validation.js";

const router = Router();

router.post("/", optionalAuth, validate(createOrderSchema), asyncHandler(ordersController.createOrder));
router.get(
  "/track",
  trackOrderLimiter,
  validate(trackOrderQuerySchema, "query"),
  asyncHandler(ordersController.trackOrder)
);
router.post(
  "/:id/cancel",
  optionalAuth,
  validate(orderIdParamsSchema, "params"),
  validate(cancelOrderSchema),
  asyncHandler(ordersController.cancelOrder)
);

router.get("/", requireAuth, isAdmin, asyncHandler(ordersController.listOrders));
router.get(
  "/:id",
  requireAuth,
  isAdmin,
  validate(orderIdParamsSchema, "params"),
  asyncHandler(ordersController.getOrderById)
);
router.patch(
  "/:id/status",
  requireAuth,
  isAdmin,
  validate(orderIdParamsSchema, "params"),
  validate(updateOrderStatusSchema),
  asyncHandler(ordersController.updateOrderStatus)
);
router.patch(
  "/:id/courier",
  requireAuth,
  isAdmin,
  validate(orderIdParamsSchema, "params"),
  validate(updateCourierSchema),
  asyncHandler(ordersController.updateCourier)
);

export default router;
