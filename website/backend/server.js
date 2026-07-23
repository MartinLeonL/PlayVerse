require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { connectDB } = require("./db");
const authRoutes = require("./authRoutes");
const mediaRoutes = require("./mediaRoutes");
const recommendationRoutes = require("./services/groqRecom");

const app = express();

const requiredEnvironmentVariables = [
  "MONGODB_URI",
  "JWT_SECRET",
  "FRONTEND_URL",
  "SENDGRID_API_KEY",
  "SENDGRID_FROM_EMAIL",
  "GOOGLE_CLIENT_ID",
  "TMDB_API_KEY",
  "RAWG_API_KEY",
  "GROQ_API_KEY",
];

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    throw new Error(`Missing environment variable: ${variableName}`);
  }
}

function normalizeOrigin(origin) {
  return String(origin || "")
    .trim()
    .replace(/\/+$/, "");
}

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

// Explicitly handle preflight OPTIONS requests for all routes
// Express 5's routing library (path-to-regexp v7+) dropped support for
// a bare "*" wildcard — it now requires a name, or a raw regex works
// too and is unaffected by that change either way.
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

const port = Number(process.env.PORT) || 5000;

connectDB()
  .then(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`Backend running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Backend startup failed:", error);

    process.exit(1);
  });