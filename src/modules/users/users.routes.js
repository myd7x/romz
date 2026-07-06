import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as usersController from "./users.controller.js";
import {
  addressIdParamsSchema,
  addressSchema,
  productIdParamsSchema,
  updateProfileSchema
} from "./users.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/me", asyncHandler(usersController.getMe));
router.patch("/me", validate(updateProfileSchema), asyncHandler(usersController.updateProfile));

router.post("/me/addresses", validate(addressSchema), asyncHandler(usersController.addAddress));
router.patch(
  "/me/addresses/:addressId",
  validate(addressIdParamsSchema, "params"),
  validate(addressSchema),
  asyncHandler(usersController.updateAddress)
);
router.delete(
  "/me/addresses/:addressId",
  validate(addressIdParamsSchema, "params"),
  asyncHandler(usersController.deleteAddress)
);

router.get("/me/wishlist", asyncHandler(usersController.getWishlist));
router.post(
  "/me/wishlist/:productId",
  validate(productIdParamsSchema, "params"),
  asyncHandler(usersController.addToWishlist)
);
router.delete(
  "/me/wishlist/:productId",
  validate(productIdParamsSchema, "params"),
  asyncHandler(usersController.removeFromWishlist)
);

export default router;
