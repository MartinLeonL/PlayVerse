require("dotenv").config();

const { createApp } = require("./app");
const { connectDB } = require("./db");

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

const app = createApp();

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