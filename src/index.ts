import { validateEnv } from "./config/env.config";
import { createBotInstance } from "./bot/instance";
import { logger } from "./utils/logger";

async function main() {
  validateEnv();

  logger.info("Initializing HP Rank Checker Telegram Bot...");
  
  const bot = createBotInstance();

  try {
    // Register official Telegram Bot Commands Menu (Autocomplete when typing /)
    await bot.telegram.setMyCommands([
      { command: "pdfreport", description: "📄 Browse 48+ Exams & Download PDF Reports" },
      { command: "search", description: "🔍 Search Exams by Name e.g. /search Biology" },
      { command: "stats", description: "📊 View Live Platform Analytics & Window Status" },
      { command: "gk_quiz_pdf", description: "🧠 Download Daily HP GK Practice Quiz PDF" },
      { command: "start", description: "🚀 Start Bot & View Main Menu" },
      { command: "help", description: "❓ View Bot Help & Command Guide" },
      { command: "post_channel", description: "📢 Broadcast Exam Report PDF to Channel (Admin)" },
    ]);
    logger.info("✅ Telegram Bot Commands Menu registered successfully!");

    // Launch polling bot
    await bot.launch();
    logger.info("🤖 Bot successfully started polling! Connected to Telegram API & Backend REST API.");
  } catch (err) {
    logger.error("Failed to launch bot polling instance:", err);
  }

  // Enable graceful stop
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main();
