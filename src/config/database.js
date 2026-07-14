import mongoose from "mongoose";
import { env } from "./env.js";

let connectionPromise = null;

export const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  mongoose.set("strictQuery", true);

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.MONGODB_URI)
      .then((connection) => {
        console.log(`MongoDB connected: ${connection.connection.name}`);
        return connection;
      })
      .finally(() => {
        connectionPromise = null;
      });
  }

  return connectionPromise;
};
