import * as shippingZonesService from "./shippingZones.service.js";
import { created, noContent, ok } from "../../utils/responseHandler.js";

export const createShippingZone = async (req, res) => {
  const zone = await shippingZonesService.createShippingZone(req.body);
  return created(res, {
    message: "Shipping zone created",
    data: { zone }
  });
};

export const listShippingZones = async (req, res) => {
  const zones = await shippingZonesService.listShippingZones({
    includeInactive: req.user?.role === "admin" && req.query.includeInactive === "true"
  });

  return ok(res, {
    message: "Shipping zones fetched",
    data: { zones }
  });
};

export const getShippingZoneById = async (req, res) => {
  const zone = await shippingZonesService.getShippingZoneById(req.params.id);
  return ok(res, {
    message: "Shipping zone fetched",
    data: { zone }
  });
};

export const updateShippingZone = async (req, res) => {
  const zone = await shippingZonesService.updateShippingZone(req.params.id, req.body);
  return ok(res, {
    message: "Shipping zone updated",
    data: { zone }
  });
};

export const deleteShippingZone = async (req, res) => {
  await shippingZonesService.deleteShippingZone(req.params.id);
  return noContent(res);
};
