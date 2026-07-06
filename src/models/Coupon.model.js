import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
      unique: true
    },
    type: { type: String, enum: ["percent", "fixed"], required: true },
    value: { type: Number, min: 0, required: true },
    minOrderTotal: { type: Number, min: 0, default: 0 },
    maxDiscount: { type: Number, min: 0, default: null },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, min: 0, default: null },
    usedCount: { type: Number, min: 0, default: 0 },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

couponSchema.index({ expiresAt: 1, isActive: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
