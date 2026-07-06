import * as analyticsService from "./analytics.service.js";
import { ok } from "../../utils/responseHandler.js";

export const overview = async (req, res) =>
  ok(res, {
    message: "Analytics overview fetched",
    data: await analyticsService.getOverview(req.query)
  });

export const revenueSeries = async (req, res) =>
  ok(res, {
    message: "Revenue series fetched",
    data: { series: await analyticsService.getRevenueSeries(req.query) }
  });

export const ordersByStatus = async (req, res) =>
  ok(res, {
    message: "Orders by status fetched",
    data: { statuses: await analyticsService.getOrdersByStatus(req.query) }
  });

export const bestSellers = async (req, res) =>
  ok(res, {
    message: "Best sellers fetched",
    data: { products: await analyticsService.getBestSellers(req.query) }
  });

export const lowStock = async (req, res) =>
  ok(res, {
    message: "Low stock fetched",
    data: { variants: await analyticsService.getLowStock(req.query) }
  });

export const coupons = async (req, res) =>
  ok(res, {
    message: "Coupon analytics fetched",
    data: { coupons: await analyticsService.getCouponPerformance(req.query) }
  });

export const paymentSplit = async (req, res) =>
  ok(res, {
    message: "Payment split fetched",
    data: await analyticsService.getPaymentSplit(req.query)
  });
