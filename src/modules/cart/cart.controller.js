import * as cartService from "./cart.service.js";
import { ok } from "../../utils/responseHandler.js";

export const validateCart = async (req, res) => {
  const cart = await cartService.priceCart(req.body, req.user);
  return ok(res, {
    message: "Cart validated",
    data: { cart }
  });
};
