import request from "supertest";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/romz_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

let app;
let mongoose;

beforeAll(async () => {
  ({ default: app } = await import("../src/app.js"));
  ({ default: mongoose } = await import("mongoose"));
  await mongoose.disconnect();
});

afterAll(async () => {
  await mongoose.disconnect();
});

test("API requests establish and reuse the database connection", async () => {
  const responses = await Promise.all([
    request(app).get("/api/v1/health/ready"),
    request(app).get("/api/v1/health/ready")
  ]);

  expect(responses.map((response) => response.status)).toEqual([200, 200]);
  expect(responses[0].body.data.mongo).toBe("connected");
  expect(mongoose.connection.readyState).toBe(1);
});
