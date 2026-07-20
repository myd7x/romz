import * as shippingService from "./shipping.service.js";
import { ok } from "../../utils/responseHandler.js";

export const getGovernorates = async (req, res) => {
  const governorates = await shippingService.getGovernorates();
  return ok(res, {
    message: "Governorates fetched",
    data: { governorates }
  });
};

export const quoteShipping = async (req, res) => {
  const quote = await shippingService.quoteShipping(req.body);
  return ok(res, {
    message: "Shipping quote calculated",
    data: { quote }
  });
};
