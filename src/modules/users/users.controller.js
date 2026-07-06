import * as usersService from "./users.service.js";
import { created, noContent, ok } from "../../utils/responseHandler.js";

export const getMe = async (req, res) => {
  const user = await usersService.getMe(req.user._id);
  return ok(res, {
    message: "Profile fetched",
    data: { user }
  });
};

export const updateProfile = async (req, res) => {
  const user = await usersService.updateProfile(req.user._id, req.body);
  return ok(res, {
    message: "Profile updated",
    data: { user }
  });
};

export const addAddress = async (req, res) => {
  const user = await usersService.addAddress(req.user._id, req.body);
  return created(res, {
    message: "Address added",
    data: { addresses: user.addresses }
  });
};

export const updateAddress = async (req, res) => {
  const user = await usersService.updateAddress(req.user._id, req.params.addressId, req.body);
  return ok(res, {
    message: "Address updated",
    data: { addresses: user.addresses }
  });
};

export const deleteAddress = async (req, res) => {
  await usersService.deleteAddress(req.user._id, req.params.addressId);
  return noContent(res);
};

export const getWishlist = async (req, res) => {
  const user = await usersService.getMe(req.user._id);
  return ok(res, {
    message: "Wishlist fetched",
    data: { wishlist: user.wishlist }
  });
};

export const addToWishlist = async (req, res) => {
  const user = await usersService.addToWishlist(req.user._id, req.params.productId);
  return ok(res, {
    message: "Product added to wishlist",
    data: { wishlist: user.wishlist }
  });
};

export const removeFromWishlist = async (req, res) => {
  const user = await usersService.removeFromWishlist(req.user._id, req.params.productId);
  return ok(res, {
    message: "Product removed from wishlist",
    data: { wishlist: user.wishlist }
  });
};
