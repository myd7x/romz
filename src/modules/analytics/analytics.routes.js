import { Router } from "express";
import { isAdmin, requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as analyticsController from "./analytics.controller.js";
import { analyticsQuerySchema } from "./analytics.validation.js";

const router = Router();

router.use(requireAuth, isAdmin);
router.use(validate(analyticsQuerySchema, "query"));

router.get("/overview", asyncHandler(analyticsController.overview));
router.get("/revenue-series", asyncHandler(analyticsController.revenueSeries));
router.get("/orders-by-status", asyncHandler(analyticsController.ordersByStatus));
router.get("/best-sellers", asyncHandler(analyticsController.bestSellers));
router.get("/low-stock", asyncHandler(analyticsController.lowStock));
router.get("/coupons", asyncHandler(analyticsController.coupons));
router.get("/payment-split", asyncHandler(analyticsController.paymentSplit));

export default router;
