import { getRedis } from "../config/redis.js";

export const getCache = async (key) => {
  const redis = getRedis();
  if (!redis) return null;

  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
};

export const setCache = async (key, value, ttlSeconds = 300) => {
  const redis = getRedis();
  if (!redis) return;

  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
};

export const deleteCache = async (pattern) => {
  const redis = getRedis();
  if (!redis) return;

  const keys = await redis.keys(pattern);
  if (keys.length) {
    await redis.del(...keys);
  }
};
