import mongoose from "mongoose";
import Category from "../../models/Category.model.js";
import Product from "../../models/Product.model.js";
import { uploadImageBuffer } from "../../services/imageUpload.service.js";
import { AppError } from "../../utils/AppError.js";
import { buildMeta, buildPagination, buildSort } from "../../utils/apiFeatures.js";
import { createSlug, ensureUniqueSlug } from "../../utils/slug.js";

const productPopulate = [
  { path: "category", select: "name slug" },
  { path: "collections", select: "name slug" }
];

const splitQueryList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const buildProductSlug = async (payload, currentId = null) => {
  const base = createSlug(payload.slug || payload.name?.en || payload.name?.ar);
  return ensureUniqueSlug(Product, base, currentId);
};

const assertCategoriesExist = async ({ category, collections = [] }) => {
  const ids = [category, ...collections].filter(Boolean);
  if (!ids.length) return;

  const count = await Category.countDocuments({ _id: { $in: ids } });
  if (count !== new Set(ids.map(String)).size) {
    throw new AppError("One or more categories were not found", 404);
  }
};

const uploadRequestImages = async (files = []) => {
  if (!files.length) return [];

  return Promise.all(files.map((file) => uploadImageBuffer(file, "romz/products")));
};

const buildListFilter = async (query) => {
  const filter = { isActive: true };

  if (query.category) {
    if (mongoose.isValidObjectId(query.category)) {
      filter.category = query.category;
    } else {
      const category = await Category.findOne({ slug: query.category, isActive: true }).select("_id");
      if (!category) return { _id: null };
      filter.category = category._id;
    }
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
  await assertCategoriesExist(payload);

  const uploadedImages = await uploadRequestImages(files);
  const slug = await buildProductSlug(payload);

  return Product.create({
    ...payload,
    slug,
    images: [...(payload.images || []), ...uploadedImages]
  });
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
    products,
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

  return product;
};

export const getProductById = async (id) => {
  const product = await Product.findById(id).populate(productPopulate);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return product;
};

export const updateProduct = async (id, payload, files = []) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  await assertCategoriesExist({
    category: payload.category,
    collections: payload.collections
  });

  const uploadedImages = await uploadRequestImages(files);

  if (payload.slug) {
    payload.slug = await buildProductSlug(payload, id);
  }

  if (uploadedImages.length) {
    payload.images = [...(payload.images || product.images), ...uploadedImages];
  }

  product.set(payload);
  await product.save();
  return product.populate(productPopulate);
};

export const deleteProduct = async (id) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  product.isActive = false;
  await product.save();
};

export const getRelatedProducts = async (slug, limit = 4) => {
  const product = await Product.findOne({ slug, isActive: true }).select("_id category");

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return Product.find({
    _id: { $ne: product._id },
    category: product.category,
    isActive: true
  })
    .sort({ sold: -1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 4, 12))
    .populate(productPopulate)
    .lean();
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

  return { newArrivals, bestSellers, saleProducts };
};
