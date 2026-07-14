import cookieParser from "cookie-parser";
import express from "express";
import morgan from "morgan";
import path from "node:path";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { notFound } from "./middlewares/notFound.middleware.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import { applySecurityMiddleware } from "./middlewares/security.middleware.js";
import routes from "./routes/index.js";

const app = express();

app.set("trust proxy", 1);

applySecurityMiddleware(app);

if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use(env.API_PREFIX, async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.use(env.API_PREFIX, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
