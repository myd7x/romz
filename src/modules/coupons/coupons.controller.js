import * as couponsService from "./coupons.service.js";
import { created, noContent, ok } from "../../utils/responseHandler.js";

export const createCoupon = async (req, res) => {
  const coupon = await couponsService.createCoupon(req.body);
  return created(res, {
    message: "Coupon created",
    data: { coupon }
  });
};

export const listCoupons = async (req, res) => {
  const { coupons, meta } = await couponsService.listCoupons(req.query);
  return ok(res, {
    message: "Coupons fetched",
    data: { coupons },
    meta
  });
};

export const getCouponById = async (req, res) => {
  const coupon = await couponsService.getCouponById(req.params.id);
  return ok(res, {
    message: "Coupon fetched",
    data: { coupon }
  });
};

export const updateCoupon = async (req, res) => {
  const coupon = await couponsService.updateCoupon(req.params.id, req.body);
  return ok(res, {
    message: "Coupon updated",
    data: { coupon }
  });
};

export const deleteCoupon = async (req, res) => {
  await couponsService.deleteCoupon(req.params.id);
  return noContent(res);
};

export const validateCoupon = async (req, res) => {
  const coupon = await couponsService.validateCoupon(req.body, req.user);
  return ok(res, {
    message: "Coupon validated",
    data: { coupon }
  });
};
