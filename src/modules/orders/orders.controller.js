import * as ordersService from "./orders.service.js";
import { created, ok } from "../../utils/responseHandler.js";

export const createOrder = async (req, res) => {
  const order = await ordersService.createOrder(req.body, req.user);
  return created(res, {
    message: "Order created",
    data: { order }
  });
};

export const trackOrder = async (req, res) => {
  const order = await ordersService.trackOrder(req.query);
  return ok(res, {
    message: "Order fetched",
    data: { order }
  });
};

export const listOrders = async (req, res) => {
  const { orders, meta } = await ordersService.listOrders(req.query);
  return ok(res, {
    message: "Orders fetched",
    data: { orders },
    meta
  });
};

export const getOrderById = async (req, res) => {
  const order = await ordersService.getOrderById(req.params.id);
  return ok(res, {
    message: "Order fetched",
    data: { order }
  });
};

export const cancelOrder = async (req, res) => {
  const order = await ordersService.cancelOrder(req.params.id, req.body, req.user);
  return ok(res, {
    message: "Order cancelled",
    data: { order }
  });
};

export const updateOrderStatus = async (req, res) => {
  const order = await ordersService.updateOrderStatus(req.params.id, req.body);
  return ok(res, {
    message: "Order status updated",
    data: { order }
  });
};

export const updateCourier = async (req, res) => {
  const order = await ordersService.updateCourier(req.params.id, req.body);
  return ok(res, {
    message: "Courier updated",
    data: { order }
  });
};
