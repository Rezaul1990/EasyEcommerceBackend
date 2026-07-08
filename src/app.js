const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { env } = require("./config/env");
const { requireDb } = require("./middlewares/requireDb");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");
const { sendSuccess } = require("./utils/apiResponse");
const authRoutes = require("./routes/authRoutes");
const publicRoutes = require("./routes/publicRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use("/uploads", express.static(path.resolve(process.cwd(), env.uploadDir)));

app.get("/api/health", (req, res) =>
  sendSuccess(res, {
    message: "EasyEcommerce API is healthy",
    data: {
      service: "easy-ecommerce-backend",
      databaseConfigured: Boolean(env.mongoUri),
      timestamp: new Date().toISOString(),
    },
  }),
);

app.use("/api/auth", requireDb, authRoutes);
app.use("/api/admin/auth", requireDb, authRoutes);
app.use("/api", requireDb, publicRoutes);
app.use("/api/store", requireDb, publicRoutes);
app.use("/api/admin", requireDb, adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
