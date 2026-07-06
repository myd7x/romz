import Redis from "ioredis";
import { env } from "./env.js";

let redisClient = null;

export const connectRedis = async () => {
  if (!env.REDIS_URL) {
    console.log("Redis disabled: REDIS_URL is not set");
    return null;
  }

  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true
  });

  redisClient.on("error", (error) => {
    console.error("Redis error", error.message);
  });

  await redisClient.connect();
  console.log("Redis connected");
  return redisClient;
};

export const getRedis = () => redisClient;
