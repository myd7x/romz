import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDatabase = async () => {
  mongoose.set("strictQuery", true);

  const connection = await mongoose.connect(env.MONGODB_URI);
  console.log(`MongoDB connected: ${connection.connection.name}`);
  return connection;
};
