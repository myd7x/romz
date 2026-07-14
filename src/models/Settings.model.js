import mongoose from "mongoose";

const localizedStringSchema = new mongoose.Schema(
  {
    ar: { type: String, trim: true, default: "" },
    en: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const heroSlideSchema = new mongoose.Schema(
  {
    title: { type: localizedStringSchema, default: () => ({}) },
    subtitle: { type: localizedStringSchema, default: () => ({}) },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" }
    },
    ctaLabel: { type: localizedStringSchema, default: () => ({}) },
    ctaHref: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { _id: true }
);

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "store", unique: true },
    storeName: { type: String, trim: true, default: "ROMZ" },
    promoBar: { type: localizedStringSchema, default: () => ({}) },
    promoBarActive: { type: Boolean, default: true },
    heroSlides: { type: [heroSlideSchema], default: [] },
    featuredCollections: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    announcement: { type: localizedStringSchema, default: () => ({}) },
    socialLinks: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      whatsapp: { type: String, default: "" }
    },
    payments: {
      paymob: {
        active: { type: Boolean, default: true }
      }
    },
    freeShippingThreshold: { type: Number, min: 0, default: null },
    lowStockThreshold: { type: Number, min: 0, default: 5 }
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
