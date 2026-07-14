import { jest } from "@jest/globals";

const uploadStream = jest.fn();
const destroy = jest.fn();

jest.unstable_mockModule("../src/config/cloudinary.js", () => ({
  default: {
    uploader: {
      upload_stream: uploadStream,
      destroy
    }
  }
}));

const { deleteImage, uploadImageBuffer } = await import(
  "../src/services/imageUpload.service.js"
);

beforeEach(() => {
  uploadStream.mockReset();
  destroy.mockReset();
});

test("uploads image buffers to the requested Cloudinary folder", async () => {
  uploadStream.mockImplementation((options, callback) => ({
    end(buffer) {
      expect(buffer).toEqual(Buffer.from("image"));
      callback(null, {
        secure_url: "https://res.cloudinary.com/romz/image/upload/sample.jpg",
        public_id: options.public_id
      });
    }
  }));

  const image = await uploadImageBuffer(
    { buffer: Buffer.from("image"), mimetype: "image/jpeg" },
    "romz/products"
  );

  const options = uploadStream.mock.calls[0][0];
  expect(options).toMatchObject({
    resource_type: "image",
    asset_folder: "romz/products",
    overwrite: false
  });
  expect(options.public_id).toMatch(/^romz\/products\/.+/);
  expect(image).toEqual({
    url: "https://res.cloudinary.com/romz/image/upload/sample.jpg",
    publicId: options.public_id
  });
});

test("deletes Cloudinary images by public ID and invalidates the CDN", async () => {
  destroy.mockResolvedValue({ result: "ok" });

  await deleteImage("romz/categories/category-photo");

  expect(destroy).toHaveBeenCalledWith("romz/categories/category-photo", {
    resource_type: "image",
    invalidate: true
  });
});

test("does not try to delete external URLs without a Cloudinary public ID", async () => {
  await deleteImage("https://example.com/image.jpg");

  expect(destroy).not.toHaveBeenCalled();
});
