import * as categoriesService from "./categories.service.js";
import { created, noContent, ok } from "../../utils/responseHandler.js";

export const createCategory = async (req, res) => {
  const category = await categoriesService.createCategory(req.body);
  return created(res, {
    message: "Category created",
    data: { category }
  });
};

export const listCategories = async (req, res) => {
  const categories = await categoriesService.listCategories({
    includeInactive: req.user?.role === "admin" && req.query.includeInactive === "true"
  });

  return ok(res, {
    message: "Categories fetched",
    data: { categories }
  });
};

export const getCategoryTree = async (req, res) => {
  const categories = await categoriesService.getCategoryTree();
  return ok(res, {
    message: "Category tree fetched",
    data: { categories }
  });
};

export const getCategoryById = async (req, res) => {
  const category = await categoriesService.getCategoryById(req.params.id);
  return ok(res, {
    message: "Category fetched",
    data: { category }
  });
};

export const updateCategory = async (req, res) => {
  const category = await categoriesService.updateCategory(req.params.id, req.body);
  return ok(res, {
    message: "Category updated",
    data: { category }
  });
};

export const deleteCategory = async (req, res) => {
  await categoriesService.deleteCategory(req.params.id);
  return noContent(res);
};
