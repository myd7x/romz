import { Router } from "express";
import { optionalAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as cartController from "./cart.controller.js";
import { validateCartSchema } from "./cart.validation.js";

const router = Router();

router.post(
  "/validate",
  optionalAuth,
  validate(validateCartSchema),
  asyncHandler(cartController.validateCart)
);

export default router;
