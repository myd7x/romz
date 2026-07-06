import Order from "../../models/Order.model.js";
import { sendOrderStatusEmail } from "../../services/email.service.js";
import { AppError } from "../../utils/AppError.js";
import { courierProviders } from "./couriers.validation.js";

export const listCourierProviders = () =>
  courierProviders.map((id) => ({
    id,
    label: id === "manual" ? "Manual" : id.charAt(0).toUpperCase() + id.slice(1)
  }));

export const assignTracking = async (orderId, payload) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (["cancelled", "returned"].includes(order.status)) {
    throw new AppError("Cannot assign courier tracking to a cancelled or returned order", 400);
  }

  order.courier = {
    name: payload.name,
    trackingNumber: payload.trackingNumber,
    trackingUrl: payload.trackingUrl
  };

  if (payload.markAsShipped && order.status !== "shipped") {
    order.status = "shipped";
    order.statusHistory.push({
      status: "shipped",
      at: new Date(),
      note: payload.note || `Courier assigned: ${payload.name}`
    });
  }

  await order.save();

  if (payload.markAsShipped) {
    await sendOrderStatusEmail(order);
  }

  return order;
};
