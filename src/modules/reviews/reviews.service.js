import Product from "../../models/Product.model.js";
import Review from "../../models/Review.model.js";
import { AppError } from "../../utils/AppError.js";
import { buildMeta, buildPagination } from "../../utils/apiFeatures.js";

const recalculateProductRating = async (productId) => {
  const [stats] = await Review.aggregate([
    { $match: { product: productId, isApproved: true } },
    {
      $group: {
        _id: "$product",
        ratingAvg: { $avg: "$rating" },
        ratingCount: { $sum: 1 }
      }
    }
  ]);

  await Product.findByIdAndUpdate(productId, {
    ratingAvg: stats ? Number(stats.ratingAvg.toFixed(2)) : 0,
    ratingCount: stats?.ratingCount || 0
  });
};

export const createReview = async (productId, payload, user = null) => {
  const product = await Product.findOne({ _id: productId, isActive: true });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (!user && !payload.guestName) {
    throw new AppError("Guest name is required", 400);
  }

  return Review.create({
    product: productId,
    user: user?._id || null,
    guestName: user?.name || payload.guestName,
    rating: payload.rating,
    comment: payload.comment,
    isVerifiedPurchase: false,
    isApproved: false
  });
};

export const listApprovedReviews = async (productId, query) => {
  const pagination = buildPagination(query);
  const filter = { product: productId, isApproved: true };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("user", "name")
      .lean(),
    Review.countDocuments(filter)
  ]);

  return {
    reviews,
    meta: buildMeta({ ...pagination, total })
  };
};

export const listAdminReviews = async (query) => {
  const pagination = buildPagination(query);
  const filter = {};

  if (query.productId) filter.product = query.productId;
  if (query.isApproved !== undefined) filter.isApproved = query.isApproved === "true";

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("product", "name slug")
      .populate("user", "name email")
      .lean(),
    Review.countDocuments(filter)
  ]);

  return {
    reviews,
    meta: buildMeta({ ...pagination, total })
  };
};

export const approveReview = async (id) => {
  const review = await Review.findById(id);

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  review.isApproved = true;
  await review.save();
  await recalculateProductRating(review.product);

  return review;
};

export const deleteReview = async (id) => {
  const review = await Review.findById(id);

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  const productId = review.product;
  await review.deleteOne();
  await recalculateProductRating(productId);
};
