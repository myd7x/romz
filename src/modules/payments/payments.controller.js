import * as paymobService from "./paymob.service.js";
import { created, ok } from "../../utils/responseHandler.js";

export const createPaymobIntent = async (req, res) => {
  const payment = await paymobService.createPaymentIntent(req.body, req.user);
  return created(res, {
    message: "Paymob payment intent created",
    data: { payment }
  });
};

export const handlePaymobWebhook = async (req, res) => {
  const result = await paymobService.handlePaymobWebhook(req.body, req.query);
  return ok(res, {
    message: "Paymob webhook processed",
    data: {
      orderNumber: result.order.orderNumber,
      transactionId: result.transactionId,
      success: result.success
    }
  });
};
