import { Router } from "express";
import { isAdmin, requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as couriersController from "./couriers.controller.js";
import {
  awbParamsSchema,
  cancelMylerzPackageSchema,
  createMylerzShipmentSchema,
  expectedChargesSchema,
  orderIdParamsSchema
} from "./couriers.validation.js";

const router = Router();

router.use(requireAuth, isAdmin);

router.get("/mylerz/warehouses", asyncHandler(couriersController.getMylerzWarehouses));
router.get("/mylerz/city-zones", asyncHandler(couriersController.getMylerzCityZones));
router.post(
  "/mylerz/expected-charges",
  validate(expectedChargesSchema),
  asyncHandler(couriersController.getMylerzExpectedCharges)
);
router.post(
  "/mylerz/orders/:orderId/shipment",
  validate(orderIdParamsSchema, "params"),
  validate(createMylerzShipmentSchema),
  asyncHandler(couriersController.createMylerzShipment)
);
router.post(
  "/mylerz/orders/:orderId/sync-status",
  validate(orderIdParamsSchema, "params"),
  asyncHandler(couriersController.syncMylerzOrderStatus)
);
router.get(
  "/mylerz/packages/:awb/status",
  validate(awbParamsSchema, "params"),
  asyncHandler(couriersController.getMylerzPackageStatus)
);
router.get(
  "/mylerz/packages/:awb/details",
  validate(awbParamsSchema, "params"),
  asyncHandler(couriersController.getMylerzPackageDetails)
);
router.get(
  "/mylerz/packages/:awb/tracking",
  validate(awbParamsSchema, "params"),
  asyncHandler(couriersController.trackMylerzPackage)
);
router.get(
  "/mylerz/packages/:awb/tracking-url",
  validate(awbParamsSchema, "params"),
  asyncHandler(couriersController.getMylerzTrackingUrl)
);
router.post(
  "/mylerz/packages/:awb/cancel",
  validate(awbParamsSchema, "params"),
  validate(cancelMylerzPackageSchema),
  asyncHandler(couriersController.cancelMylerzPackage)
);

export default router;
