import { connectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import User from "../models/User.model.js";

const seedAdmin = async () => {
  await connectDatabase();

  const existingAdmin = await User.findOne({ email: env.ADMIN_EMAIL });

  if (existingAdmin) {
    console.log(`Admin already exists: ${env.ADMIN_EMAIL}`);
    return;
  }

  await User.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    phone: env.ADMIN_PHONE,
    role: "admin",
    isVerified: true
  });

  console.log(`Admin created: ${env.ADMIN_EMAIL}`);
};

seedAdmin()
  .catch((error) => {
    console.error("Failed to seed admin", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  });
