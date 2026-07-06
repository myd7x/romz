import { Router } from "express";
import mongoose from "mongoose";
import { ok } from "../../utils/responseHandler.js";

const router = Router();

router.get("/", (req, res) => {
  return ok(res, {
    message: "ROMZ API is healthy",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

router.get("/ready", (req, res) => {
  const isMongoReady = mongoose.connection.readyState === 1;

  if (!isMongoReady) {
    return res.status(503).json({
      success: false,
      message: "ROMZ API is not ready",
      data: {
        mongo: "disconnected",
        timestamp: new Date().toISOString()
      }
    });
  }

  return ok(res, {
    message: "ROMZ API is ready",
    data: {
      mongo: isMongoReady ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
