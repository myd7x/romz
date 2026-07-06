import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    guestName: { type: String, trim: true, default: "" },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 1500, default: "" },
    isVerifiedPurchase: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, isApproved: 1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
