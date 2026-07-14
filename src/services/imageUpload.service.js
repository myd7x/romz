import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import cloudinary, { assertCloudinaryConfigured } from "../config/cloudinary.js";
import { AppError } from "../utils/AppError.js";

const uploadsRoot = path.resolve(process.cwd(), "uploads");

const resolveLocalPublicId = (publicId) => {
  const normalizedPublicId = String(publicId || "").replace(/^\/+/, "");

  if (!normalizedPublicId.startsWith("uploads/")) return null;

  const target = path.resolve(process.cwd(), normalizedPublicId);
  if (!target.startsWith(`${uploadsRoot}${path.sep}`)) return null;

  return target;
};

const normalizeCloudinaryFolder = (folder) => {
  const normalized = String(folder || "romz")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");

  if (!normalized || !/^[a-zA-Z0-9/_-]+$/.test(normalized)) {
    throw new AppError("Invalid image upload folder", 500);
  }

  return normalized;
};

const uploadToCloudinary = (file, folder) =>
  new Promise((resolve, reject) => {
    const assetName = `${Date.now()}-${randomUUID()}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        asset_folder: folder,
        public_id: `${folder}/${assetName}`,
        overwrite: false
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url || !result?.public_id) {
          reject(new Error("Cloudinary returned an incomplete upload response"));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    uploadStream.end(file.buffer);
  });

export const uploadImageBuffer = async (file, folder = "romz") => {
  if (!file?.buffer) {
    throw new AppError("Image buffer is required", 400);
  }

  const uploadFolder = normalizeCloudinaryFolder(folder);

  try {
    assertCloudinaryConfigured();
    return await uploadToCloudinary(file, uploadFolder);
  } catch (error) {
    throw new AppError(`Image upload failed: ${error.message}`, 500);
  }
};

export const deleteImage = async (publicId) => {
  if (!publicId) return;

  const filePath = resolveLocalPublicId(publicId);
  if (filePath) {
    await fs.unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }

  const normalizedPublicId = String(publicId).trim().replace(/^\/+|\/+$/g, "");
  if (!normalizedPublicId || /^https?:\/\//i.test(normalizedPublicId)) return;

  try {
    assertCloudinaryConfigured();
    await cloudinary.uploader.destroy(normalizedPublicId, {
      resource_type: "image",
      invalidate: true
    });
  } catch (error) {
    throw new AppError(`Image deletion failed: ${error.message}`, 500);
  }
};
