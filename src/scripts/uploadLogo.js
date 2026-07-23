// Upload a logo image to Cloudinary and print its public URL for EMAIL_LOGO_URL.
//   node src/scripts/uploadLogo.js <path-to-logo>
// Example: node src/scripts/uploadLogo.js logo.png
import cloudinary, { assertCloudinaryConfigured } from "../config/cloudinary.js";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node src/scripts/uploadLogo.js <path-to-logo-image>");
  process.exit(1);
}

const run = async () => {
  assertCloudinaryConfigured();

  const result = await cloudinary.uploader.upload(filePath, {
    folder: "romz/brand",
    public_id: "email-logo",
    overwrite: true,
    resource_type: "image"
  });

  console.log("\nUploaded. Set this in your env:");
  console.log(`EMAIL_LOGO_URL=${result.secure_url}\n`);
};

run().catch((error) => {
  console.error("Upload failed:", error.message);
  process.exit(1);
});
