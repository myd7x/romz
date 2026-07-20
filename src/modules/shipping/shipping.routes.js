import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as shippingController from "./shipping.controller.js";
import { quoteShippingSchema } from "./shipping.validation.js";

const router = Router();

// Public storefront endpoints used during checkout.
router.get("/governorates", asyncHandler(shippingController.getGovernorates));
router.post("/quote", validate(quoteShippingSchema), asyncHandler(shippingController.quoteShipping));

export default router;
