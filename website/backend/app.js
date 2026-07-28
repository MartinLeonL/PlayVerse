const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./authRoutes");
const mediaRoutes = require("./mediaRoutes");
const recommendationRoutes = require("./services/groqRecom");

function normalizeOrigin(origin) {
  return String(origin || "")
    .trim()
    .replace(/\/+$/, "");
}

function createApp() {
  const app = express();

  const allowedOrigins = new Set(
    ["http://localhost:5173", process.env.FRONTEND_URL]
      .map(normalizeOrigin)
      .filter(Boolean),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
          return callback(null, true);
        }
        const error = new Error(`Origin not allowed by CORS: ${origin}`);
        error.statusCode = 403;
        return callback(error);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    })
  );

  // Explicitly handle preflight OPTIONS requests for all routes.
  app.options(/.*/, cors());

  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (req, res) => {
    res.json({
      message: "PlayVerse backend is running.",
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/media", mediaRoutes);
  app.use("/api/recommendations", recommendationRoutes);

  app.use((req, res) => {
    res.status(404).json({
      message: "API route not found.",
    });
  });

  app.use((error, req, res, next) => {
    console.error(error);

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      message:
        statusCode === 403
          ? "This request origin is not allowed."
          : "An unexpected server error occurred.",
    });
  });

  return app;
}

module.exports = { createApp };