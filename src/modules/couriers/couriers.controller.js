import * as couriersService from "./couriers.service.js";
import { ok } from "../../utils/responseHandler.js";

export const listCourierProviders = (req, res) =>
  ok(res, {
    message: "Courier providers fetched",
    data: { providers: couriersService.listCourierProviders() }
  });

export const assignTracking = async (req, res) => {
  const order = await couriersService.assignTracking(req.params.orderId, req.body);
  return ok(res, {
    message: "Courier tracking assigned",
    data: { order }
  });
};

export const createMylerzShipment = async (req, res) => {
  const result = await couriersService.createMylerzShipment(req.params.orderId, req.body);
  return ok(res, {
    message: "Mylerz shipment created",
    data: result
  });
};

export const getMylerzPackageStatus = async (req, res) => {
  const status = await couriersService.getMylerzPackageStatus(req.params.awb);
  return ok(res, {
    message: "Mylerz package status fetched",
    data: { status }
  });
};

export const getMylerzPackageDetails = async (req, res) => {
  const details = await couriersService.getMylerzPackageDetails(req.params.awb);
  return ok(res, {
    message: "Mylerz package details fetched",
    data: { details }
  });
};

export const trackMylerzPackage = async (req, res) => {
  const tracking = await couriersService.trackMylerzPackage(req.params.awb);
  return ok(res, {
    message: "Mylerz package tracking fetched",
    data: { tracking }
  });
};

export const getMylerzTrackingUrl = async (req, res) => {
  const trackingUrl = await couriersService.getMylerzTrackingUrl(req.params.awb);
  return ok(res, {
    message: "Mylerz tracking URL fetched",
    data: { trackingUrl }
  });
};

export const cancelMylerzPackage = async (req, res) => {
  const result = await couriersService.cancelMylerzPackage(req.params.awb, req.body);
  return ok(res, {
    message: "Mylerz package cancellation requested",
    data: { result }
  });
};

export const getMylerzWarehouses = async (req, res) => {
  const warehouses = await couriersService.getMylerzWarehouses();
  return ok(res, {
    message: "Mylerz warehouses fetched",
    data: { warehouses }
  });
};

export const getMylerzCityZones = async (req, res) => {
  const zones = await couriersService.getMylerzCityZones();
  return ok(res, {
    message: "Mylerz city zones fetched",
    data: { zones }
  });
};

export const getMylerzExpectedCharges = async (req, res) => {
  const charges = await couriersService.getMylerzExpectedCharges(req.body);
  return ok(res, {
    message: "Mylerz expected charges fetched",
    data: { charges }
  });
};
