import { Router } from "express";
import { isAdmin, optionalAuth, requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as reviewsController from "./reviews.controller.js";
import {
  createReviewSchema,
  productIdParamsSchema,
  reviewIdParamsSchema
} from "./reviews.validation.js";

const router = Router();

router.get(
  "/product/:productId",
  validate(productIdParamsSchema, "params"),
  asyncHandler(reviewsController.listApprovedReviews)
);
router.post(
  "/product/:productId",
  optionalAuth,
  validate(productIdParamsSchema, "params"),
  validate(createReviewSchema),
  asyncHandler(reviewsController.createReview)
);

router.get("/admin", requireAuth, isAdmin, asyncHandler(reviewsController.listAdminReviews));
router.patch(
  "/:id/approve",
  requireAuth,
  isAdmin,
  validate(reviewIdParamsSchema, "params"),
  asyncHandler(reviewsController.approveReview)
);
router.delete(
  "/:id",
  requireAuth,
  isAdmin,
  validate(reviewIdParamsSchema, "params"),
  asyncHandler(reviewsController.deleteReview)
);

export default router;
