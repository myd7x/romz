import multer from "multer";
import { AppError } from "../utils/AppError.js";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) {
      return cb(null, true);
    }

    return cb(new AppError("Images only", 400), false);
  }
});
