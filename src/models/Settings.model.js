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

// A single FAQ entry (question + answer, localized). Shown in the storefront FAQ accordion.
const faqSchema = new mongoose.Schema(
  {
    question: { type: localizedStringSchema, default: () => ({}) },
    answer: { type: localizedStringSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { _id: true }
);

export const defaultFaqs = () => [
  {
    question: { en: "How long does delivery take?", ar: "كم يستغرق التوصيل؟" },
    answer: {
      en: "Cairo & Giza: 1–2 working days. Alexandria & Delta: 2–3 days. Upper Egypt: 3–5 days.",
      ar: "القاهرة والجيزة: 1–2 يوم عمل. الإسكندرية والدلتا: 2–3 أيام. صعيد مصر: 3–5 أيام."
    },
    isActive: true,
    order: 0
  },
  {
    question: { en: "What payment methods do you accept?", ar: "ما طرق الدفع المتاحة؟" },
    answer: {
      en: "We accept card payments online via Paymob, plus cash on delivery.",
      ar: "نقبل الدفع بالبطاقة عبر Paymob، بالإضافة إلى الدفع عند الاستلام."
    },
    isActive: true,
    order: 1
  },
  {
    question: { en: "Can I exchange or return an item?", ar: "هل يمكنني استبدال أو إرجاع منتج؟" },
    answer: {
      en: "Yes — easy 14-day exchanges and returns across Egypt. Items must be unworn with tags attached.",
      ar: "نعم — استبدال وإرجاع سهل خلال 14 يومًا في جميع أنحاء مصر. يجب أن تكون المنتجات غير مستعملة مع بقاء البطاقات."
    },
    isActive: true,
    order: 2
  },
  {
    question: { en: "How do I know my size?", ar: "كيف أعرف مقاسي؟" },
    answer: {
      en: "Check the Size Guide on each product page to find your best fit.",
      ar: "راجع دليل المقاسات في صفحة كل منتج لتحديد المقاس المناسب لك."
    },
    isActive: true,
    order: 3
  },
  {
    question: { en: "How can I track my order?", ar: "كيف أتتبع طلبي؟" },
    answer: {
      en: "You'll get a tracking link by email/SMS once your order ships, and you can track it from your account.",
      ar: "ستصلك رسالة بها رابط التتبع عبر البريد الإلكتروني أو الرسائل القصيرة بمجرد شحن طلبك، ويمكنك تتبعه من حسابك."
    },
    isActive: true,
    order: 4
  }
];

// Store-wide "Shipping & Returns" info block (single localized title + body).
const shippingReturnsSchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: true },
    title: { type: localizedStringSchema, default: () => ({ en: "Shipping & Returns", ar: "الشحن والإرجاع" }) },
    body: { type: localizedStringSchema, default: () => ({}) }
  },
  { _id: false }
);

export const defaultShippingReturns = () => ({
  isActive: true,
  title: { en: "Shipping & Returns", ar: "الشحن والإرجاع" },
  body: {
    en: "Free shipping on orders over 2,000 EGP. Easy 14-day exchanges and returns across Egypt.",
    ar: "شحن مجاني للطلبات التي تزيد عن 2,000 جنيه. استبدال وإرجاع سهل خلال 14 يومًا في جميع أنحاء مصر."
  }
});

// Store-wide contact block (email, phone, localized address + working hours).
const contactInfoSchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: true },
    email: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: localizedStringSchema, default: () => ({}) },
    workingHours: { type: localizedStringSchema, default: () => ({}) }
  },
  { _id: false }
);

export const defaultContactInfo = () => ({
  isActive: true,
  email: "support@romz.example",
  phone: "+20 100 000 0000",
  address: { en: "[Street address], Cairo, Egypt", ar: "[العنوان]، القاهرة، مصر" },
  workingHours: {
    en: "Sunday–Thursday, 10:00 AM – 6:00 PM (EET)",
    ar: "الأحد–الخميس، 10:00 ص – 6:00 م (بتوقيت مصر)"
  }
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
    sizeChart: { type: sizeChartSchema, default: defaultSizeChart },
    faqs: { type: [faqSchema], default: defaultFaqs },
    shippingReturns: { type: shippingReturnsSchema, default: defaultShippingReturns },
    contactInfo: { type: contactInfoSchema, default: defaultContactInfo }
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
