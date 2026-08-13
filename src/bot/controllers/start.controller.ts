import { Context, Markup } from "telegraf";
import { CONSTANTS } from "../../config/constants";

export async function handleStartCommand(ctx: Context) {
  const welcomeText = 
    `🤖 <b>Welcome to the HP Rank Checker Official Bot!</b>\n\n` +
    `I generate official PDF shift reports, candidate scoreboards, and HP GK practice sets.\n\n` +
    `<b>Available Public Commands:</b>\n` +
    `• /pdfreport - Browse 48+ exams &amp; download PDF reports\n` +
    `• /search &lt;query&gt; - Search active exams e.g. <code>/search Biology</code>\n` +
    `• /stats - View live platform stats &amp; PDF window status\n` +
    `• /gk_quiz_pdf - Download daily HP GK practice quiz PDF\n` +
    `• /help - View bot help &amp; command guide\n\n` +
    `<b>Admin Commands:</b>\n` +
    `• /post_channel &lt;stream&gt; - Broadcast PDF report to Telegram Channel`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.url("📢 HP GK Quiz Channel", CONSTANTS.TELEGRAM_QUIZ_GROUP),
      Markup.button.url("💬 Community Group", CONSTANTS.TELEGRAM_COMMUNITY_GROUP),
    ],
    [
      Markup.button.url("🌐 Visit Website", CONSTANTS.WEBSITE_URL),
    ],
  ]);

  await ctx.replyWithHTML(welcomeText, keyboard);
}
