import Product from "../../models/Product.model.js";
import User from "../../models/User.model.js";
import { AppError } from "../../utils/AppError.js";

export const getMe = async (userId) => {
  const user = await User.findById(userId).populate({
    path: "wishlist",
    select: "name slug basePrice salePrice images badges ratingAvg ratingCount isActive"
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user.toSafeObject();
};

export const updateProfile = async (userId, payload) => {
  const user = await User.findByIdAndUpdate(userId, payload, {
    new: true,
    runValidators: true
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user.toSafeObject();
};

export const addAddress = async (userId, payload) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.addresses.push(payload);
  await user.save();

  return user.toSafeObject();
};

export const updateAddress = async (userId, addressId, payload) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const address = user.addresses.id(addressId);

  if (!address) {
    throw new AppError("Address not found", 404);
  }

  address.set(payload);
  await user.save();

  return user.toSafeObject();
};

export const deleteAddress = async (userId, addressId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const address = user.addresses.id(addressId);

  if (!address) {
    throw new AppError("Address not found", 404);
  }

  address.deleteOne();
  await user.save();

  return user.toSafeObject();
};

export const addToWishlist = async (userId, productId) => {
  const product = await Product.findOne({ _id: productId, isActive: true });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { wishlist: productId } },
    { new: true }
  ).populate({
    path: "wishlist",
    select: "name slug basePrice salePrice images badges ratingAvg ratingCount isActive"
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user.toSafeObject();
};

export const removeFromWishlist = async (userId, productId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { wishlist: productId } },
    { new: true }
  ).populate({
    path: "wishlist",
    select: "name slug basePrice salePrice images badges ratingAvg ratingCount isActive"
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user.toSafeObject();
};
