import mongoose from "mongoose";

const shippingZoneSchema = new mongoose.Schema(
  {
    governorate: { type: String, trim: true, required: true, unique: true },
    fee: { type: Number, min: 0, required: true },
    estimatedDays: { type: String, trim: true, default: "1-3 working days" },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

const ShippingZone = mongoose.model("ShippingZone", shippingZoneSchema);

export default ShippingZone;
