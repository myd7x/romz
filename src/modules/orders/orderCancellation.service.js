import Coupon from "../../models/Coupon.model.js";
import Product from "../../models/Product.model.js";
import { sendOrderStatusEmail } from "../../services/email.service.js";
import { sendOrderStatusWhatsapp } from "../../services/whatsapp.service.js";

// Restore stock for an order that consumed inventory (COD at creation, or paid orders).
// Restores by SKU because order item snapshots don't store variant ObjectIds.
export const restoreOrderStock = async (order) => {
  if (order.paymentMethod !== "cod" && order.paymentStatus !== "paid") return;

  await Promise.all(
    order.items.map((item) =>
      Product.updateOne(
        { _id: item.product, "variants.sku": item.sku },
        {
          $inc: {
            "variants.$.stock": item.qty,
            sold: -item.qty
          }
        }
      )
    )
  );
};

export const decrementCouponUsage = async (couponCode, user = null) => {
  if (!couponCode) return;

  await Coupon.updateOne(
    { code: couponCode, usedCount: { $gt: 0 } },
    {
      $inc: { usedCount: -1 },
      ...(user ? { $pull: { usedBy: user._id } } : {})
    }
  );
};

// Cancel an already-loaded order document: restore stock + coupon, set status,
// save, and notify the customer. Idempotent — no-op if already cancelled/returned.
export const applyOrderCancellation = async (order, { reason = "" } = {}) => {
  if (["cancelled", "returned"].includes(order.status)) {
    return order;
  }

  await restoreOrderStock(order);

  if (order.paymentMethod === "cod") {
    await decrementCouponUsage(
      order.discount.couponCode,
      order.user ? { _id: order.user } : null
    );
  }

  order.status = "cancelled";
  order.cancelledReason = reason;
  order.statusHistory.push({
    status: "cancelled",
    at: new Date(),
    note: reason || "Order cancelled"
  });

  await order.save();
  await sendOrderStatusEmail(order);

  try {
    await sendOrderStatusWhatsapp(order);
  } catch (error) {
    console.error("[orders] Order status WhatsApp failed:", error);
  }

  return order;
};
