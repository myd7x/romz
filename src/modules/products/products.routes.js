import { Router } from "express";
import { requireAuth, isAdmin } from "../../middlewares/auth.middleware.js";
import { parseJsonFields } from "../../middlewares/parseJsonFields.middleware.js";
import { upload } from "../../middlewares/upload.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as productsController from "./products.controller.js";
import {
  createProductSchema,
  productIdParamsSchema,
  productSlugParamsSchema,
  updateProductSchema
} from "./products.validation.js";

const router = Router();
const parseProductBody = parseJsonFields([
  "name",
  "description",
  "categories",
  "collections",
  "existingImages",
  "existingImageColors",
  "imageColors",
  "variants",
  "badges"
]);

router.get("/", asyncHandler(productsController.listProducts));
router.get("/home", asyncHandler(productsController.getHomeProducts));
router.get(
  "/admin/:id",
  requireAuth,
  isAdmin,
  validate(productIdParamsSchema, "params"),
  asyncHandler(productsController.getProductById)
);
router.get(
  "/:slug/related",
  validate(productSlugParamsSchema, "params"),
  asyncHandler(productsController.getRelatedProducts)
);
router.get(
  "/:slug",
  validate(productSlugParamsSchema, "params"),
  asyncHandler(productsController.getProductBySlug)
);

router.post(
  "/",
  requireAuth,
  isAdmin,
  upload.array("images", 8),
  parseProductBody,
  validate(createProductSchema),
  asyncHandler(productsController.createProduct)
);
router.patch(
  "/:id",
  requireAuth,
  isAdmin,
  validate(productIdParamsSchema, "params"),
  upload.array("images", 8),
  parseProductBody,
  validate(updateProductSchema),
  asyncHandler(productsController.updateProduct)
);
router.delete(
  "/:id",
  requireAuth,
  isAdmin,
  validate(productIdParamsSchema, "params"),
  asyncHandler(productsController.deleteProduct)
);

export default router;
