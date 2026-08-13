import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID || "",
  ADMIN_TELEGRAM_IDS: (process.env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
  BACKEND_API_URL: (process.env.BACKEND_API_URL || "").replace(/\/+$/, ""),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  QUIZ_MONGODB_URI: process.env.QUIZ_MONGODB_URI || "",
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
};

export function validateEnv() {
  if (!ENV.TELEGRAM_BOT_TOKEN) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN is missing in environment variables!");
  }
}
