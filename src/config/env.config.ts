import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "8034549930:AAGgL2hXpGHHV6RYdDdiFkADjtAkahGXqvA",
  TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID || "-1003714375698",
  ADMIN_TELEGRAM_IDS: (process.env.ADMIN_TELEGRAM_IDS || "877204159,5921443031")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
  BACKEND_API_URL: (process.env.BACKEND_API_URL || "https://exam-rank-check-backend.vercel.app").replace(/\/+$/, ""),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "Hackme@123",
  QUIZ_MONGODB_URI: process.env.QUIZ_MONGODB_URI || "",
  NODE_ENV: process.env.NODE_ENV || "production",
  PORT: parseInt(process.env.PORT || "3000", 10),
};

export function validateEnv() {
  if (!ENV.TELEGRAM_BOT_TOKEN) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN is missing in environment variables!");
  }
}
