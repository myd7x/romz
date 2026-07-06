import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { connectRedis } from "./config/redis.js";

let server;

const start = async () => {
  await connectDatabase();
  await connectRedis();

  server = app.listen(env.PORT, () => {
    console.log(`ROMZ API listening on port ${env.PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start ROMZ API", error);
  process.exit(1);
});

const shutdown = (signal) => {
  console.log(`${signal} received. Closing server.`);
  if (!server) {
    process.exit(0);
  }

  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
