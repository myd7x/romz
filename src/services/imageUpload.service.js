import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AppError } from "../utils/AppError.js";

const uploadsRoot = path.resolve(process.cwd(), "uploads");

const extensionByMime = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

const resolveUploadFolder = (folder) => {
  const folderName = path.basename(folder || "general");
  return path.join(uploadsRoot, folderName);
};

const resolveLocalPublicId = (publicId) => {
  const normalizedPublicId = String(publicId || "").replace(/^\/+/, "");

  if (!normalizedPublicId.startsWith("uploads/")) return null;

  const target = path.resolve(process.cwd(), normalizedPublicId);
  if (!target.startsWith(`${uploadsRoot}${path.sep}`)) return null;

  return target;
};

export const uploadImageBuffer = async (file, folder = "romz") => {
  if (!file?.buffer) {
    throw new AppError("Image buffer is required", 400);
  }

  const uploadDir = resolveUploadFolder(folder);
  const extension = extensionByMime[file.mimetype] || ".jpg";
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const publicId = path.posix.join("uploads", path.basename(uploadDir), filename);
  const filePath = path.join(uploadDir, filename);

  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filePath, file.buffer);
  } catch (error) {
    throw new AppError(`Image upload failed: ${error.message}`, 500);
  }

  return {
    url: `/${publicId}`,
    publicId
  };
};

export const deleteImage = async (publicId) => {
  if (!publicId) return;

  const filePath = resolveLocalPublicId(publicId);
  if (!filePath) return;

  await fs.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
};
