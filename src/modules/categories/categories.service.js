import Category from "../../models/Category.model.js";
import { AppError } from "../../utils/AppError.js";
import { createSlug, ensureUniqueSlug } from "../../utils/slug.js";

const buildCategorySlug = async (payload, currentId = null) => {
  const base = createSlug(payload.slug || payload.name?.en || payload.name?.ar);
  return ensureUniqueSlug(Category, base, currentId);
};

const buildTree = (categories, parent = null) =>
  categories
    .filter((category) => String(category.parent || "") === String(parent || ""))
    .map((category) => ({
      ...category,
      children: buildTree(categories, category._id)
    }));

export const createCategory = async (payload) => {
  const slug = await buildCategorySlug(payload);

  if (payload.parent) {
    const parent = await Category.findById(payload.parent);
    if (!parent) throw new AppError("Parent category not found", 404);
  }

  return Category.create({ ...payload, slug });
};

export const listCategories = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };

  return Category.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .populate("parent", "name slug")
    .lean();
};

export const getCategoryTree = async () => {
  const categories = await Category.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  return buildTree(categories);
};

export const getCategoryById = async (id) => {
  const category = await Category.findById(id).populate("parent", "name slug");

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  return category;
};

export const updateCategory = async (id, payload) => {
  const category = await Category.findById(id);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (payload.parent) {
    if (String(payload.parent) === String(id)) {
      throw new AppError("Category cannot be its own parent", 400);
    }

    const parent = await Category.findById(payload.parent);
    if (!parent) throw new AppError("Parent category not found", 404);
  }

  if (payload.slug || payload.name) {
    payload.slug = await buildCategorySlug(
      {
        slug: payload.slug || category.slug,
        name: payload.name || category.name
      },
      id
    );
  }

  category.set(payload);
  await category.save();
  return category;
};

export const deleteCategory = async (id) => {
  const category = await Category.findById(id);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  category.isActive = false;
  await category.save();
};
