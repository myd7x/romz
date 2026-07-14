import request from "supertest";
import { jest } from "@jest/globals";

jest.setTimeout(30000);

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/romz_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

let app;
let mongoose;
let connectDatabase;
let User;
let Coupon;
let token;

const stamp = String(Date.now());
const email = `coupon-admin-${stamp}@romz.test`;
const codes = [`DELETE${stamp}`, `PAUSE${stamp}`];
const authHeader = () => ({ Authorization: `Bearer ${token}` });

const createCoupon = (code) =>
  request(app)
    .post("/api/v1/coupons")
    .set(authHeader())
    .send({
      code,
      type: "percent",
      value: 10,
      minOrderTotal: 100,
      isActive: true
    });

beforeAll(async () => {
  ({ default: app } = await import("../src/app.js"));
  ({ default: mongoose } = await import("mongoose"));
  ({ connectDatabase } = await import("../src/config/database.js"));
  ({ default: User } = await import("../src/models/User.model.js"));
  ({ default: Coupon } = await import("../src/models/Coupon.model.js"));

  await connectDatabase();

  await User.create({
    name: "Coupon Test Admin",
    email,
    password: "password123",
    role: "admin",
    isVerified: true
  });

  const login = await request(app).post("/api/v1/auth/login").send({
    email,
    password: "password123"
  });

  expect(login.status).toBe(200);
  token = login.body.data.accessToken;
});

afterAll(async () => {
  await Promise.all([
    Coupon.deleteMany({ code: { $in: codes } }),
    User.deleteMany({ email })
  ]);
  await mongoose.disconnect();
});

test("deleting a coupon removes it everywhere and allows recreating its code", async () => {
  const created = await createCoupon(codes[0]);
  expect(created.status).toBe(201);
  const couponId = created.body.data.coupon._id;

  const deleted = await request(app)
    .delete(`/api/v1/coupons/${couponId}`)
    .set(authHeader());
  expect(deleted.status).toBe(204);
  expect(deleted.text).toBe("");

  const listed = await request(app)
    .get(`/api/v1/coupons?search=${codes[0]}&limit=100`)
    .set(authHeader());
  expect(listed.status).toBe(200);
  expect(listed.body.data.coupons).toHaveLength(0);

  const detail = await request(app)
    .get(`/api/v1/coupons/${couponId}`)
    .set(authHeader());
  expect(detail.status).toBe(404);
  expect(detail.body.message).toBe("Coupon not found");

  const validation = await request(app)
    .post("/api/v1/coupons/validate")
    .send({ code: codes[0], subtotal: 1000 });
  expect(validation.status).toBe(404);
  expect(validation.body.message).toBe("Coupon not found");

  const recreated = await createCoupon(codes[0]);
  expect(recreated.status).toBe(201);
  expect(recreated.body.data.coupon.code).toBe(codes[0]);
  expect(recreated.body.data.coupon._id).not.toBe(couponId);
});

test("deleting a missing coupon returns Coupon not found", async () => {
  const missingId = new mongoose.Types.ObjectId().toString();
  const response = await request(app)
    .delete(`/api/v1/coupons/${missingId}`)
    .set(authHeader());

  expect(response.status).toBe(404);
  expect(response.body.message).toBe("Coupon not found");
});

test("PATCH isActive pauses and resumes without deleting the coupon", async () => {
  const created = await createCoupon(codes[1]);
  expect(created.status).toBe(201);
  const couponId = created.body.data.coupon._id;

  const paused = await request(app)
    .patch(`/api/v1/coupons/${couponId}`)
    .set(authHeader())
    .send({ isActive: false });
  expect(paused.status).toBe(200);
  expect(paused.body.data.coupon.isActive).toBe(false);

  const detail = await request(app)
    .get(`/api/v1/coupons/${couponId}`)
    .set(authHeader());
  expect(detail.status).toBe(200);
  expect(detail.body.data.coupon.isActive).toBe(false);

  const pausedValidation = await request(app)
    .post("/api/v1/coupons/validate")
    .send({ code: codes[1], subtotal: 1000 });
  expect(pausedValidation.status).toBe(400);
  expect(pausedValidation.body.message).toBe("Coupon is inactive");

  const resumed = await request(app)
    .patch(`/api/v1/coupons/${couponId}`)
    .set(authHeader())
    .send({ isActive: true });
  expect(resumed.status).toBe(200);
  expect(resumed.body.data.coupon.isActive).toBe(true);

  const resumedValidation = await request(app)
    .post("/api/v1/coupons/validate")
    .send({ code: codes[1], subtotal: 1000 });
  expect(resumedValidation.status).toBe(200);
});
