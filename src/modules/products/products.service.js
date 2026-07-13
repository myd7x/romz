import mongoose from "mongoose";
import Category from "../../models/Category.model.js";
import Product from "../../models/Product.model.js";
import { deleteImage, uploadImageBuffer } from "../../services/imageUpload.service.js";
import { AppError } from "../../utils/AppError.js";
import { buildMeta, buildPagination, buildSort } from "../../utils/apiFeatures.js";
import { createSlug, ensureUniqueSlug } from "../../utils/slug.js";

const productPopulate = [
  { path: "category", select: "name slug" },
  { path: "categories", select: "name slug" },
  { path: "collections", select: "name slug" }
];

const withCategoryFallback = (product) => {
  if (!product) return product;

  const value = product.toObject ? product.toObject() : product;

  if ((!value.categories || value.categories.length === 0) && value.category) {
    value.categories = [value.category];
  }

  return value;
};

const withCategoryFallbackList = (products) => products.map((product) => withCategoryFallback(product));

const splitQueryList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const buildProductSlug = async (payload, currentId = null) => {
  const base = createSlug(payload.slug || payload.name?.en || payload.name?.ar);
  return ensureUniqueSlug(Product, base, currentId);
};

const uniqueIds = (ids = []) => [...new Set(ids.filter(Boolean).map(String))];

const normalizeProductCategories = (payload) => {
  if (!payload.category && !payload.categories) return payload;

  const categories = uniqueIds(payload.categories?.length ? payload.categories : [payload.category]);
  const primaryCategory = payload.category || categories[0];

  payload.category = primaryCategory;
  payload.categories = uniqueIds([primaryCategory, ...categories]);

  return payload;
};

const assertCategoriesExist = async ({ category, categories = [], collections = [] }) => {
  const ids = uniqueIds([category, ...categories, ...collections]);
  if (!ids.length) return;

  const count = await Category.countDocuments({ _id: { $in: ids } });
  if (count !== ids.length) {
    throw new AppError("One or more categories were not found", 404);
  }
};

const uploadRequestImages = async (files = [], colors = []) => {
  if (!files.length) return [];

  return Promise.all(
    files.map(async (file, index) => ({
      ...(await uploadImageBuffer(file, "romz/products")),
      color: colors[index] || ""
    }))
  );
};

const applyImageColors = (images = [], colors = []) =>
  images.map((image, index) => ({
    ...image,
    ...(colors[index] !== undefined ? { color: colors[index] || "" } : {})
  }));

const splitImageColors = ({ imageColors = [], existingImages = [], files = [] }) => {
  if (!existingImages.length) {
    return {
      existingImageColors: [],
      uploadImageColors: imageColors
    };
  }

  if (imageColors.length === existingImages.length + files.length) {
    return {
      existingImageColors: imageColors.slice(0, existingImages.length),
      uploadImageColors: imageColors.slice(existingImages.length)
    };
  }

  if (!files.length && imageColors.length === existingImages.length) {
    return {
      existingImageColors: imageColors,
      uploadImageColors: []
    };
  }

  return {
    existingImageColors: [],
    uploadImageColors: imageColors
  };
};

const getImageId = (image) => String(image?.publicId || image?.url || "");

const getRemovedImages = (currentImages = [], nextImages = []) => {
  const nextIds = new Set(nextImages.map(getImageId).filter(Boolean));
  return currentImages.filter((image) => {
    const imageId = getImageId(image);
    return imageId && !nextIds.has(imageId);
  });
};

const deleteProductImages = async (images = []) => {
  await Promise.all(images.map((image) => deleteImage(image.publicId || image.url)));
};

const buildListFilter = async (query) => {
  const filter = { isActive: true };

  if (query.category) {
    let categoryId = "";

    if (mongoose.isValidObjectId(query.category)) {
      categoryId = query.category;
    } else {
      const category = await Category.findOne({ slug: query.category, isActive: true }).select("_id");
      if (!category) return { _id: null };
      categoryId = category._id;
    }

    filter.$or = [{ category: categoryId }, { categories: categoryId }];
  }

  const sizes = splitQueryList(query.size);
  if (sizes.length) filter["variants.size"] = { $in: sizes };

  const colors = splitQueryList(query.color);
  if (colors.length) filter["variants.color.name"] = { $in: colors };

  const badges = splitQueryList(query.badge);
  if (badges.length) filter.badges = { $in: badges };

  if (query.search) {
    filter.$text = { $search: String(query.search) };
  }

  const priceBounds = [];
  const effectivePrice = { $ifNull: ["$salePrice", "$basePrice"] };

  if (query.minPrice !== undefined) {
    priceBounds.push({ $gte: [effectivePrice, Number(query.minPrice)] });
  }

  if (query.maxPrice !== undefined) {
    priceBounds.push({ $lte: [effectivePrice, Number(query.maxPrice)] });
  }

  if (priceBounds.length) {
    filter.$expr = priceBounds.length === 1 ? priceBounds[0] : { $and: priceBounds };
  }

  return filter;
};

const mapSort = (query) => {
  const sortMap = {
    newest: "-createdAt",
    "price-low": "basePrice",
    "price-high": "-basePrice",
    "best-selling": "-sold",
    rating: "-ratingAvg"
  };

  return buildSort({ sort: sortMap[query.sort] || query.sort }, "-createdAt");
};

export const createProduct = async (payload, files = []) => {
  normalizeProductCategories(payload);
  await assertCategoriesExist(payload);

  const imageColors = payload.imageColors || [];
  delete payload.imageColors;

  const uploadedImages = await uploadRequestImages(files, imageColors);
  const slug = await buildProductSlug(payload);

  const product = await Product.create({
    ...payload,
    slug,
    images: uploadedImages
  });

  await product.populate(productPopulate);
  return withCategoryFallback(product);
};

export const listProducts = async (query) => {
  const pagination = buildPagination(query);
  const filter = await buildListFilter(query);
  const sort = mapSort(query);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(productPopulate)
      .lean(),
    Product.countDocuments(filter)
  ]);

  return {
    products: withCategoryFallbackList(products),
    meta: buildMeta({ ...pagination, total })
  };
};

export const getProductBySlug = async (slug) => {
  const product = await Product.findOneAndUpdate(
    { slug, isActive: true },
    { $inc: { views: 1 } },
    { new: true }
  ).populate(productPopulate);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return withCategoryFallback(product);
};

export const getProductById = async (id) => {
  const product = await Product.findById(id).populate(productPopulate);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return withCategoryFallback(product);
};

export const updateProduct = async (id, payload, files = []) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const hasProductUpdate =
    files.length > 0 || Object.keys(payload).some((key) => key !== "imageColors");

  if (!hasProductUpdate) {
    throw new AppError("No product updates provided", 400);
  }

  await assertCategoriesExist({
    category: payload.category,
    categories: payload.categories,
    collections: payload.collections
  });

  const existingImages = payload.existingImages;
  const explicitExistingImageColors = payload.existingImageColors || [];
  const imageColors = payload.imageColors || [];

  delete payload.existingImages;
  delete payload.existingImageColors;
  delete payload.imageColors;

  const { existingImageColors, uploadImageColors } = splitImageColors({
    imageColors,
    existingImages: existingImages || [],
    files
  });
  const normalizedExistingImages = existingImages
    ? applyImageColors(existingImages, explicitExistingImageColors.length ? explicitExistingImageColors : existingImageColors)
    : undefined;
  const uploadedImages = await uploadRequestImages(files, uploadImageColors);
  const removedImages =
    normalizedExistingImages === undefined
      ? []
      : getRemovedImages(product.images, [...normalizedExistingImages, ...uploadedImages]);

  if (payload.slug) {
    payload.slug = await buildProductSlug(payload, id);
  }

  normalizeProductCategories(payload);

  if (uploadedImages.length) {
    payload.images = [...(normalizedExistingImages || product.images), ...uploadedImages];
  } else if (normalizedExistingImages) {
    payload.images = normalizedExistingImages;
  }

  product.set(payload);
  await product.save();
  await deleteProductImages(removedImages);
  await product.populate(productPopulate);
  return withCategoryFallback(product);
};

export const deleteProduct = async (id) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const imagesToDelete = [...product.images];

  product.isActive = false;
  product.images = [];
  await product.save();
  await deleteProductImages(imagesToDelete);
};

export const getRelatedProducts = async (slug, limit = 4) => {
  const product = await Product.findOne({ slug, isActive: true }).select("_id category categories");

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const categoryIds = product.categories?.length ? product.categories : [product.category];

  const products = await Product.find({
    _id: { $ne: product._id },
    $or: [{ category: { $in: categoryIds } }, { categories: { $in: categoryIds } }],
    isActive: true
  })
    .sort({ sold: -1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 4, 12))
    .populate(productPopulate)
    .lean();

  return withCategoryFallbackList(products);
};

export const getHomeProducts = async () => {
  const [newArrivals, bestSellers, saleProducts] = await Promise.all([
    Product.find({ isActive: true }).sort({ createdAt: -1 }).limit(8).populate(productPopulate).lean(),
    Product.find({ isActive: true }).sort({ sold: -1, createdAt: -1 }).limit(8).populate(productPopulate).lean(),
    Product.find({ isActive: true, badges: "sale" })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate(productPopulate)
      .lean()
  ]);

  return {
    newArrivals: withCategoryFallbackList(newArrivals),
    bestSellers: withCategoryFallbackList(bestSellers),
    saleProducts: withCategoryFallbackList(saleProducts)
  };
};
