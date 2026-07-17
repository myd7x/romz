import { Router } from "express";
import { isAdmin, optionalAuth, requireAuth } from "../../middlewares/auth.middleware.js";
import { contactLimiter } from "../../middlewares/rateLimit.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as contactController from "./contact.controller.js";
import {
  contactMessageIdParamsSchema,
  createContactMessageSchema,
  updateContactMessageSchema
} from "./contact.validation.js";

const router = Router();

router.post(
  "/",
  contactLimiter,
  optionalAuth,
  validate(createContactMessageSchema),
  asyncHandler(contactController.createContactMessage)
);

router.get("/", requireAuth, isAdmin, asyncHandler(contactController.listContactMessages));
router.get(
  "/:id",
  requireAuth,
  isAdmin,
  validate(contactMessageIdParamsSchema, "params"),
  asyncHandler(contactController.getContactMessageById)
);
router.patch(
  "/:id",
  requireAuth,
  isAdmin,
  validate(contactMessageIdParamsSchema, "params"),
  validate(updateContactMessageSchema),
  asyncHandler(contactController.updateContactMessage)
);
router.delete(
  "/:id",
  requireAuth,
  isAdmin,
  validate(contactMessageIdParamsSchema, "params"),
  asyncHandler(contactController.deleteContactMessage)
);

export default router;
