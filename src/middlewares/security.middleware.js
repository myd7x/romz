import cors from "cors";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";

const corsOptions = {
  origin: true,
  credentials: true
};

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

export const applySecurityMiddleware = (app) => {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(cors(corsOptions));
  app.use(generalLimiter);
  app.use(mongoSanitize());
};
