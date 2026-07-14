import { jest } from "@jest/globals";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  jest.resetModules();
});

test("uses CLOUDINARY_URL without overwriting it with empty separate variables", async () => {
  process.env.CLOUDINARY_URL = "cloudinary://test-key:test-secret@test-cloud";
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;

  const { default: cloudinary, assertCloudinaryConfigured } = await import(
    `../src/config/cloudinary.js?cloudinary-url=${Date.now()}`
  );

  expect(() => assertCloudinaryConfigured()).not.toThrow();
  expect(cloudinary.config("cloud_name")).toBe("test-cloud");
  expect(cloudinary.config("api_key")).toBe("test-key");
  expect(cloudinary.config("api_secret")).toBe("test-secret");
});
