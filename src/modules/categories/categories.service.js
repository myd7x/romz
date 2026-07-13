import Category from "../../models/Category.model.js";
import { deleteImage, uploadImageBuffer } from "../../services/imageUpload.service.js";
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

const getImageId = (image) => String(image?.publicId || image?.url || "");

const deleteCategoryImage = async (image) => {
  await deleteImage(image?.publicId || image?.url);
};

const uploadCategoryImage = (file) => uploadImageBuffer(file, "romz/categories");

const normalizeCategoryPayload = (payload) => {
  if (payload.parent === "") {
    payload.parent = null;
  }

  return payload;
};

const isEmptyImage = (image) => image === null || (image && !image.url && !image.publicId);

export const createCategory = async (payload, file = null) => {
  normalizeCategoryPayload(payload);
  const slug = await buildCategorySlug(payload);
  delete payload.removeImage;

  if (payload.parent) {
    const parent = await Category.findById(payload.parent);
    if (!parent) throw new AppError("Parent category not found", 404);
  }

  if (file) {
    payload.image = await uploadCategoryImage(file);
  } else if (isEmptyImage(payload.image)) {
    payload.image = { url: "", publicId: "" };
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

export const updateCategory = async (id, payload, file = null) => {
  normalizeCategoryPayload(payload);
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

  const oldImage = category.image?.toObject ? category.image.toObject() : { ...category.image };

  if (file) {
    payload.image = await uploadCategoryImage(file);
  } else if (payload.removeImage === true) {
    payload.image = { url: "", publicId: "" };
  } else {
    delete payload.image;
  }

  const shouldDeleteOldImage =
    payload.image !== undefined &&
    getImageId(oldImage) &&
    getImageId(oldImage) !== getImageId(payload.image);

  delete payload.removeImage;

  const hasCategoryUpdate = Object.keys(payload).length > 0;
  if (!hasCategoryUpdate) {
    throw new AppError("No category updates provided", 400);
  }

  category.set(payload);
  await category.save();
  if (shouldDeleteOldImage) {
    await deleteCategoryImage(oldImage);
  }
  return category;
};

export const deleteCategory = async (id) => {
  const category = await Category.findById(id);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const imageToDelete = category.image?.toObject ? category.image.toObject() : { ...category.image };

  category.isActive = false;
  category.image = { url: "", publicId: "" };
  await category.save();
  await deleteCategoryImage(imageToDelete);
};
