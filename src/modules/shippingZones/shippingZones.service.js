import ShippingZone from "../../models/ShippingZone.model.js";
import { AppError } from "../../utils/AppError.js";

export const createShippingZone = async (payload) => ShippingZone.create(payload);

export const listShippingZones = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  return ShippingZone.find(filter).sort({ governorate: 1 }).lean();
};

export const getShippingZoneById = async (id) => {
  const zone = await ShippingZone.findById(id);

  if (!zone) {
    throw new AppError("Shipping zone not found", 404);
  }

  return zone;
};

export const updateShippingZone = async (id, payload) => {
  const zone = await ShippingZone.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

  if (!zone) {
    throw new AppError("Shipping zone not found", 404);
  }

  return zone;
};

export const deleteShippingZone = async (id) => {
  const zone = await ShippingZone.findById(id);

  if (!zone) {
    throw new AppError("Shipping zone not found", 404);
  }

  zone.isActive = false;
  await zone.save();
};
