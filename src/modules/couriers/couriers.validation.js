import Joi from "joi";

export const orderIdParamsSchema = Joi.object({
  orderId: Joi.string().hex().length(24).required()
});

export const awbParamsSchema = Joi.object({
  awb: Joi.string().trim().max(120).required()
});

export const createMylerzShipmentSchema = Joi.object({
  warehouseName: Joi.string().trim().max(120).allow("").default(""),
  pickupDueDate: Joi.date().iso().optional(),
  packageSerial: Joi.number().integer().min(1).default(1),
  reference: Joi.string().trim().max(120).allow("").default(""),
  description: Joi.string().trim().max(500).allow("").default(""),
  totalWeight: Joi.number().min(0).optional(),
  serviceType: Joi.string().trim().max(40).allow("").default(""),
  service: Joi.string().trim().max(40).allow("").default(""),
  serviceDate: Joi.date().iso().allow(null).optional(),
  serviceCategory: Joi.string().trim().max(80).allow("").default(""),
  specialNotes: Joi.string().trim().max(500).allow("").default(""),
  cityCode: Joi.string().trim().max(80).allow("").default(""),
  neighborhoodCode: Joi.string().trim().max(80).allow("").default(""),
  districtCode: Joi.string().trim().max(80).allow("").default(""),
  geolocation: Joi.string().trim().max(80).allow("").default(""),
  addressCategory: Joi.string().trim().max(40).allow("").default(""),
  buildingNo: Joi.string().trim().max(40).allow("").default(""),
  floorNo: Joi.string().trim().max(40).allow("").default(""),
  apartmentNo: Joi.string().trim().max(40).allow("").default(""),
  productCategory: Joi.string().trim().max(80).allow("").default(""),
  dimensions: Joi.string().trim().max(80).allow("").default(""),
  pieces: Joi.array()
    .items(
      Joi.object({
        pieceNo: Joi.number().integer().min(1).required(),
        weight: Joi.number().min(0).optional(),
        itemCategory: Joi.string().trim().max(80).allow("").default(""),
        dimensions: Joi.string().trim().max(80).allow("").default(""),
        specialNotes: Joi.string().trim().max(500).allow("").default("")
      })
    )
    .default([])
});

export const cancelMylerzPackageSchema = Joi.object({
  referenceNumber: Joi.string().trim().max(120).allow("").default("")
});

export const expectedChargesSchema = Joi.object({
  codValue: Joi.number().min(0).required(),
  warehouseName: Joi.string().trim().max(120).required(),
  customerZoneCode: Joi.string().trim().max(120).required(),
  packageWeight: Joi.number().min(0).required(),
  isFulfillment: Joi.boolean().default(false),
  packageServiceTypeCode: Joi.string().trim().max(40).required(),
  packageServiceCode: Joi.string().trim().max(40).required(),
  paymentTypeCode: Joi.string().trim().max(40).required(),
  serviceCategoryCode: Joi.string().trim().max(80).required()
});
