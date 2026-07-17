import { Router } from "express";
import { requireAuth, isAdmin } from "../../middlewares/auth.middleware.js";
import { parseJsonFields } from "../../middlewares/parseJsonFields.middleware.js";
import { upload } from "../../middlewares/upload.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as categoriesController from "./categories.controller.js";
import {
  categoryIdParamsSchema,
  createCategorySchema,
  updateCategorySchema
} from "./categories.validation.js";

const router = Router();
const parseCategoryBody = parseJsonFields(["name", "image"]);

const normalizeCategoryMultipartBody = (req, res, next) => {
  if (req.body.parent === "") {
    req.body.parent = null;
  }

  if (req.body.order !== undefined && req.body.order !== "") {
    req.body.order = Number(req.body.order);
  }

  if (req.body.removeImage !== undefined) {
    req.body.removeImage = req.body.removeImage === true || req.body.removeImage === "true";
  }

  next();
};

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
  upload.single("image"),
  parseCategoryBody,
  normalizeCategoryMultipartBody,
  validate(createCategorySchema),
  asyncHandler(categoriesController.createCategory)
);
router.patch(
  "/:id",
  requireAuth,
  isAdmin,
  validate(categoryIdParamsSchema, "params"),
  upload.single("image"),
  parseCategoryBody,
  normalizeCategoryMultipartBody,
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
