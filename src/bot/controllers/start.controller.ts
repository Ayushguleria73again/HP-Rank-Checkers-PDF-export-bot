import { Context, Markup } from "telegraf";
import { CONSTANTS } from "../../config/constants";

export async function handleStartCommand(ctx: Context) {
  const welcomeText = 
    `🤖 *Welcome to the HP Rank Checker Official Bot!*\n\n` +
    `I can generate official PDF shift reports, candidate rank summaries, and HP GK practice sets.\n\n` +
    `*Available Public Commands:*\n` +
    `• /pdf_report <stream> - Generate a live PDF report\n` +
    `• /gk_quiz_pdf - Download daily HP GK practice quiz PDF\n` +
    `• /help - View command instructions\n\n` +
    `*Admin Commands:*\n` +
    `• /post_channel <stream> - Post PDF report directly to Telegram Channel`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.url("📢 HP GK Quiz Channel", CONSTANTS.TELEGRAM_QUIZ_GROUP),
      Markup.button.url("💬 Community Group", CONSTANTS.TELEGRAM_COMMUNITY_GROUP),
    ],
    [
      Markup.button.url("🌐 Visit Website", CONSTANTS.WEBSITE_URL),
    ],
  ]);

  await ctx.replyWithMarkdown(welcomeText, keyboard);
}
