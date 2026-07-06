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
