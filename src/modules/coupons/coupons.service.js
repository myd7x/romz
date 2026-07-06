import Coupon from "../../models/Coupon.model.js";
import { AppError } from "../../utils/AppError.js";
import { buildMeta, buildPagination, buildSort } from "../../utils/apiFeatures.js";
import { calculateCouponDiscount, getValidCoupon } from "../cart/cart.service.js";

export const createCoupon = async (payload) => Coupon.create(payload);

export const listCoupons = async (query) => {
  const pagination = buildPagination(query);
  const filter = {};

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  if (query.search) {
    filter.code = { $regex: String(query.search).trim(), $options: "i" };
  }

  const sort = buildSort(query, "-createdAt");

  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort(sort).skip(pagination.skip).limit(pagination.limit).lean(),
    Coupon.countDocuments(filter)
  ]);

  return {
    coupons,
    meta: buildMeta({ ...pagination, total })
  };
};

export const getCouponById = async (id) => {
  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new AppError("Coupon not found", 404);
  }

  return coupon;
};

export const updateCoupon = async (id, payload) => {
  const coupon = await Coupon.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

  if (!coupon) {
    throw new AppError("Coupon not found", 404);
  }

  return coupon;
};

export const deleteCoupon = async (id) => {
  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new AppError("Coupon not found", 404);
  }

  coupon.isActive = false;
  await coupon.save();
};

export const validateCoupon = async ({ code, subtotal }, user = null) => {
  const coupon = await getValidCoupon(code);
  const discountAmount = calculateCouponDiscount(coupon, subtotal, user);

  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    minOrderTotal: coupon.minOrderTotal,
    maxDiscount: coupon.maxDiscount,
    discountAmount,
    totalAfterDiscount: Math.max(0, subtotal - discountAmount)
  };
};
