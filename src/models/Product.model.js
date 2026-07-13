import mongoose from "mongoose";

const localizedStringSchema = new mongoose.Schema(
  {
    ar: { type: String, trim: true, required: true },
    en: { type: String, trim: true, required: true }
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    color: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    hex: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true, required: true },
    size: { type: String, trim: true, required: true },
    color: { type: colorSchema, required: true },
    stock: { type: Number, min: 0, default: 0 },
    priceOverride: { type: Number, min: 0, default: null }
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: localizedStringSchema, required: true },
    slug: { type: String, trim: true, lowercase: true, required: true, unique: true },
    description: { type: localizedStringSchema, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    categories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
      default: [],
      index: true
    },
    collections: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    basePrice: { type: Number, min: 0, required: true },
    salePrice: { type: Number, min: 0, default: null },
    images: { type: [imageSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
    badges: {
      type: [String],
      enum: ["new", "best-seller", "sale"],
      default: []
    },
    isActive: { type: Boolean, default: true, index: true },
    sold: { type: Number, min: 0, default: 0 },
    views: { type: Number, min: 0, default: 0 },
    ratingAvg: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ categories: 1, isActive: 1 });
productSchema.index({ badges: 1, isActive: 1 });
productSchema.index({ "variants.sku": 1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, sold: -1 });
productSchema.index({
  "name.en": "text",
  "name.ar": "text",
  "description.en": "text",
  "description.ar": "text"
});

const Product = mongoose.model("Product", productSchema);

export default Product;
