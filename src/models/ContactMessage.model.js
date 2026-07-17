import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, required: true, maxlength: 180 },
    phone: { type: String, trim: true, default: "", maxlength: 40 },
    subject: { type: String, trim: true, required: true, maxlength: 160 },
    message: { type: String, trim: true, required: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ["new", "read", "replied", "archived"],
      default: "new",
      index: true
    },
    adminNotes: { type: String, trim: true, default: "", maxlength: 2000 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, trim: true, default: "storefront", maxlength: 80 },
    ipAddress: { type: String, trim: true, default: "" },
    userAgent: { type: String, trim: true, default: "", maxlength: 500 },
    readAt: { type: Date, default: null },
    repliedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ email: 1, createdAt: -1 });

const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);

export default ContactMessage;
