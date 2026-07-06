import sharp from "sharp";

const MAX_SIZE = 400 * 1024;
const MIN_QUALITY = 10;
const MIN_DIMENSION = 50;

const compressToTarget = async (inputBuffer, targetSize = MAX_SIZE) => {
  let quality = 95;
  let output = await sharp(inputBuffer).jpeg({ quality, mozjpeg: true }).toBuffer();

  while (output.length > targetSize && quality > MIN_QUALITY) {
    quality -= 5;
    output = await sharp(inputBuffer).jpeg({ quality, mozjpeg: true }).toBuffer();
  }

  return output;
};

export const compressImages = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files.length) return next();

    await Promise.all(
      files.map(async (file) => {
        if (!file.mimetype?.startsWith("image/")) return;

        let workingBuffer = await sharp(file.buffer)
          .flatten({ background: "#ffffff" })
          .toBuffer();

        let output = await compressToTarget(workingBuffer);

        while (output.length > MAX_SIZE) {
          const meta = await sharp(workingBuffer).metadata();
          const width = Math.floor(meta.width * 0.9);
          const height = Math.floor(meta.height * 0.9);

          if (width < MIN_DIMENSION || height < MIN_DIMENSION) break;

          workingBuffer = await sharp(workingBuffer)
            .resize(width, height, { kernel: "lanczos3" })
            .toBuffer();

          output = await compressToTarget(workingBuffer);
        }

        file.buffer = output;
        file.size = output.length;
        file.mimetype = "image/jpeg";
        file.originalname = file.originalname.replace(/\.[^.]+$/, ".jpg");
      })
    );

    return next();
  } catch (error) {
    return next(error);
  }
};
