import request from "supertest";
import { jest } from "@jest/globals";

jest.setTimeout(30000);

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/romz_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.CONTACT_EMAIL = "contact@romz.test";

let app;
let mongoose;
let connectDatabase;
let User;
let ContactMessage;
let token;

const stamp = String(Date.now());
const adminEmail = `contact-admin-${stamp}@romz.test`;
const submitterEmail = `customer-${stamp}@romz.test`;
const authHeader = () => ({ Authorization: `Bearer ${token}` });

const validPayload = {
  name: "ROMZ Customer",
  email: submitterEmail,
  phone: "01000000000",
  subject: "Question about delivery",
  message: "I want to know when delivery is available for Cairo orders.",
  source: "contact-page"
};

beforeAll(async () => {
  ({ default: app } = await import("../src/app.js"));
  ({ default: mongoose } = await import("mongoose"));
  ({ connectDatabase } = await import("../src/config/database.js"));
  ({ default: User } = await import("../src/models/User.model.js"));
  ({ default: ContactMessage } = await import("../src/models/ContactMessage.model.js"));

  await connectDatabase();

  await User.create({
    name: "Contact Test Admin",
    email: adminEmail,
    password: "password123",
    role: "admin",
    isVerified: true
  });

  const login = await request(app).post("/api/v1/auth/login").send({
    email: adminEmail,
    password: "password123"
  });

  expect(login.status).toBe(200);
  token = login.body.data.accessToken;
});

afterAll(async () => {
  await Promise.all([
    ContactMessage.deleteMany({
      $or: [{ email: submitterEmail }, { subject: /Question about delivery/i }]
    }),
    User.deleteMany({ email: adminEmail })
  ]);
  await mongoose.disconnect();
});

test("public users can submit contact messages and admin can manage them", async () => {
  const submitted = await request(app).post("/api/v1/contact").send(validPayload);

  expect(submitted.status).toBe(201);
  expect(submitted.body.message).toBe("Contact message submitted");
  expect(submitted.body.data.message.id).toBeTruthy();
  expect(submitted.body.data.message.status).toBe("new");
  expect(submitted.body.data.message.email).toBeUndefined();

  const messageId = submitted.body.data.message.id;

  const listed = await request(app)
    .get(`/api/v1/contact?search=${encodeURIComponent(validPayload.subject)}&limit=10`)
    .set(authHeader());

  expect(listed.status).toBe(200);
  expect(listed.body.data.messages).toHaveLength(1);
  expect(listed.body.data.messages[0].email).toBe(submitterEmail);
  expect(listed.body.meta.total).toBe(1);

  const detail = await request(app).get(`/api/v1/contact/${messageId}`).set(authHeader());
  expect(detail.status).toBe(200);
  expect(detail.body.data.message.message).toBe(validPayload.message);
  expect(detail.body.data.message.source).toBe("contact-page");

  const updated = await request(app)
    .patch(`/api/v1/contact/${messageId}`)
    .set(authHeader())
    .send({ status: "read", adminNotes: "Needs follow-up" });

  expect(updated.status).toBe(200);
  expect(updated.body.data.message.status).toBe("read");
  expect(updated.body.data.message.adminNotes).toBe("Needs follow-up");
  expect(updated.body.data.message.readAt).toBeTruthy();

  const deleted = await request(app).delete(`/api/v1/contact/${messageId}`).set(authHeader());
  expect(deleted.status).toBe(204);
  expect(deleted.text).toBe("");

  const missing = await request(app).get(`/api/v1/contact/${messageId}`).set(authHeader());
  expect(missing.status).toBe(404);
  expect(missing.body.message).toBe("Contact message not found");
});

test("contact message validation rejects incomplete submissions", async () => {
  const response = await request(app).post("/api/v1/contact").send({
    name: "A",
    email: "not-email",
    subject: "",
    message: "short"
  });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe("Validation failed");
});

test("admin contact endpoints require admin authentication", async () => {
  const response = await request(app).get("/api/v1/contact");

  expect(response.status).toBe(401);
  expect(response.body.message).toBe("Authentication required");
});
