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

const sizeChartSchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: true },
    title: { type: localizedStringSchema, default: () => ({ en: "Size Guide", ar: "دليل المقاسات" }) },
    note: { type: localizedStringSchema, default: () => ({}) },
    // Header cells, localized. e.g. [{en:"Size"},{en:"Chest (cm)"},{en:"Length (cm)"}]
    columns: { type: [localizedStringSchema], default: [] },
    // Table body: one array of string cells per row, aligned to `columns`.
    rows: { type: [[String]], default: [] }
  },
  { _id: false }
);

export const defaultSizeChart = () => ({
  isActive: true,
  title: { en: "Size Guide", ar: "دليل المقاسات" },
  note: { en: "", ar: "" },
  columns: [{ en: "Size", ar: "المقاس" }, { en: "Chest (cm)", ar: "الصدر (سم)" }, { en: "Length (cm)", ar: "الطول (سم)" }],
  rows: [
    ["S", "39", "60"],
    ["M", "42.5", "63"],
    ["L", "45", "67"],
    ["XL", "49.5", "67.5"]
  ]
});

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
    // Flat fee used only when Mylerz can't quote AND no matching ShippingZone exists. null = no flat fallback.
    fallbackShippingFee: { type: Number, min: 0, default: null },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    sizeChart: { type: sizeChartSchema, default: defaultSizeChart }
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
