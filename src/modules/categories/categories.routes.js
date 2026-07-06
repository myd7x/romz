import { Router } from "express";
import { requireAuth, isAdmin } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as categoriesController from "./categories.controller.js";
import {
  categoryIdParamsSchema,
  createCategorySchema,
  updateCategorySchema
} from "./categories.validation.js";

const router = Router();

router.get("/", asyncHandler(categoriesController.listCategories));
router.get("/tree", asyncHandler(categoriesController.getCategoryTree));
router.get(
  "/:id",
  validate(categoryIdParamsSchema, "params"),
  asyncHandler(categoriesController.getCategoryById)
);

router.post(
  "/",
  requireAuth,
  isAdmin,
  validate(createCategorySchema),
  asyncHandler(categoriesController.createCategory)
);
router.patch(
  "/:id",
  requireAuth,
  isAdmin,
  validate(categoryIdParamsSchema, "params"),
  validate(updateCategorySchema),
  asyncHandler(categoriesController.updateCategory)
);
router.delete(
  "/:id",
  requireAuth,
  isAdmin,
  validate(categoryIdParamsSchema, "params"),
  asyncHandler(categoriesController.deleteCategory)
);

export default router;
