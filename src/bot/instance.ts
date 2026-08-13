import { Telegraf } from "telegraf";
import { ENV } from "../config/env.config";
import { rateLimitMiddleware } from "./middlewares/rateLimit.middleware";
import { adminAuthMiddleware } from "./middlewares/auth.middleware";
import { handleStartCommand } from "./controllers/start.controller";
import { 
  handlePdfReportMenu, 
  handleExamSelectedAction, 
  handleFormatSelectedAction, 
  handleGkQuizPdfCommand 
} from "./controllers/pdf.controller";
import { handlePostChannelCommand } from "./controllers/broadcast.controller";
import { logger } from "../utils/logger";

export function createBotInstance(): Telegraf {
  const bot = new Telegraf(ENV.TELEGRAM_BOT_TOKEN);

  // Global Middlewares
  bot.use(rateLimitMiddleware);

  // Commands
  bot.command("start", handleStartCommand);
  bot.command("help", handleStartCommand);
  
  // Dynamic PDF Menu Commands
  bot.command("pdfreport", handlePdfReportMenu);
  bot.command("pdf_report", handlePdfReportMenu);
  bot.command("gk_quiz_pdf", handleGkQuizPdfCommand);

  // Interactive Action Callbacks
  bot.action(/^exampage_(\d+)$/, handlePdfReportMenu);
  bot.action(/^exam_(.+)$/, handleExamSelectedAction);
  bot.action(/^format_(shift|raw)_(.+)$/, handleFormatSelectedAction);
  bot.action("back_to_exams", handlePdfReportMenu);
  bot.action("noop", (ctx) => ctx.answerCbQuery());

  // Admin Commands
  bot.command("post_channel", adminAuthMiddleware, handlePostChannelCommand);

  bot.catch((err, ctx) => {
    logger.error(`Error occurred for update ${ctx.updateType}:`, err);
  });

  return bot;
}
