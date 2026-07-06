import { Router } from "express";
import { isAdmin, optionalAuth, requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as couponsController from "./coupons.controller.js";
import {
  couponIdParamsSchema,
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema
} from "./coupons.validation.js";

const router = Router();

router.post(
  "/validate",
  optionalAuth,
  validate(validateCouponSchema),
  asyncHandler(couponsController.validateCoupon)
);

router.get("/", requireAuth, isAdmin, asyncHandler(couponsController.listCoupons));
router.get(
  "/:id",
  requireAuth,
  isAdmin,
  validate(couponIdParamsSchema, "params"),
  asyncHandler(couponsController.getCouponById)
);
router.post(
  "/",
  requireAuth,
  isAdmin,
  validate(createCouponSchema),
  asyncHandler(couponsController.createCoupon)
);
router.patch(
  "/:id",
  requireAuth,
  isAdmin,
  validate(couponIdParamsSchema, "params"),
  validate(updateCouponSchema),
  asyncHandler(couponsController.updateCoupon)
);
router.delete(
  "/:id",
  requireAuth,
  isAdmin,
  validate(couponIdParamsSchema, "params"),
  asyncHandler(couponsController.deleteCoupon)
);

export default router;
