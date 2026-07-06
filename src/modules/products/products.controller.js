import * as productsService from "./products.service.js";
import { created, noContent, ok } from "../../utils/responseHandler.js";

export const createProduct = async (req, res) => {
  const product = await productsService.createProduct(req.body, req.files);
  return created(res, {
    message: "Product created",
    data: { product }
  });
};

export const listProducts = async (req, res) => {
  const { products, meta } = await productsService.listProducts(req.query);
  return ok(res, {
    message: "Products fetched",
    data: { products },
    meta
  });
};

export const getHomeProducts = async (req, res) => {
  const data = await productsService.getHomeProducts();
  return ok(res, {
    message: "Home products fetched",
    data
  });
};

export const getProductBySlug = async (req, res) => {
  const product = await productsService.getProductBySlug(req.params.slug);
  return ok(res, {
    message: "Product fetched",
    data: { product }
  });
};

export const getProductById = async (req, res) => {
  const product = await productsService.getProductById(req.params.id);
  return ok(res, {
    message: "Product fetched",
    data: { product }
  });
};

export const updateProduct = async (req, res) => {
  const product = await productsService.updateProduct(req.params.id, req.body, req.files);
  return ok(res, {
    message: "Product updated",
    data: { product }
  });
};

export const deleteProduct = async (req, res) => {
  await productsService.deleteProduct(req.params.id);
  return noContent(res);
};

export const getRelatedProducts = async (req, res) => {
  const products = await productsService.getRelatedProducts(req.params.slug, req.query.limit);
  return ok(res, {
    message: "Related products fetched",
    data: { products }
  });
};
