import cors from "cors";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import { env, isProduction } from "../config/env.js";

const corsOptions = {
  origin(origin, callback) {
    if (!origin || !isProduction || env.CLIENT_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true
};

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

export const applySecurityMiddleware = (app) => {
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(generalLimiter);
  app.use(mongoSanitize());
};
