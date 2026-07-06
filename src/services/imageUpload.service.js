import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";
import { AppError } from "../utils/AppError.js";

const uploadStream = (file, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image"
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    Readable.from(file.buffer).pipe(stream);
  });

export const uploadImageBuffer = async (file, folder = "romz") => {
  if (!file?.buffer) {
    throw new AppError("Image buffer is required", 400);
  }

  const result = await uploadStream(file, folder);

  return {
    url: result.secure_url,
    publicId: result.public_id
  };
};

export const deleteImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};
