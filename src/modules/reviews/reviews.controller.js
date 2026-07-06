import * as reviewsService from "./reviews.service.js";
import { created, noContent, ok } from "../../utils/responseHandler.js";

export const createReview = async (req, res) => {
  const review = await reviewsService.createReview(req.params.productId, req.body, req.user);
  return created(res, {
    message: "Review submitted for approval",
    data: { review }
  });
};

export const listApprovedReviews = async (req, res) => {
  const { reviews, meta } = await reviewsService.listApprovedReviews(req.params.productId, req.query);
  return ok(res, {
    message: "Reviews fetched",
    data: { reviews },
    meta
  });
};

export const listAdminReviews = async (req, res) => {
  const { reviews, meta } = await reviewsService.listAdminReviews(req.query);
  return ok(res, {
    message: "Reviews fetched",
    data: { reviews },
    meta
  });
};

export const approveReview = async (req, res) => {
  const review = await reviewsService.approveReview(req.params.id);
  return ok(res, {
    message: "Review approved",
    data: { review }
  });
};

export const deleteReview = async (req, res) => {
  await reviewsService.deleteReview(req.params.id);
  return noContent(res);
};
