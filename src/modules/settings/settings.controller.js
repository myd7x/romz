import * as settingsService from "./settings.service.js";
import { ok } from "../../utils/responseHandler.js";

export const getStoreSettings = async (req, res) => {
  const settings = await settingsService.getStoreSettings();
  return ok(res, {
    message: "Store settings fetched",
    data: { settings }
  });
};

export const updateStoreSettings = async (req, res) => {
  const settings = await settingsService.updateStoreSettings(req.body);
  return ok(res, {
    message: "Store settings updated",
    data: { settings }
  });
};
