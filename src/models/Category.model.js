import mongoose from "mongoose";

const localizedStringSchema = new mongoose.Schema(
  {
    ar: { type: String, trim: true, required: true },
    en: { type: String, trim: true, required: true }
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: localizedStringSchema, required: true },
    slug: { type: String, trim: true, lowercase: true, required: true, unique: true },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" }
    },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

categorySchema.index({ parent: 1, order: 1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;
