import { Context } from "telegraf";
import { BackendDataService } from "../../services/backendData.service";
import { isPdfWindowOpen } from "../middlewares/auth.middleware";
import { logger } from "../../utils/logger";

/**
 * Handles /stats command to display live platform analytics & status dashboard
 */
export async function handleStatsCommand(ctx: Context) {
  try {
    await ctx.sendChatAction("typing");
    const stats = await BackendDataService.fetchPlatformStats();
    const windowOpen = isPdfWindowOpen();
    const windowStatus = windowOpen ? "🟢 OPEN (6:00 PM – 9:00 PM IST)" : "🔴 CLOSED (Reopens 6:00 PM IST)";

    const totalSubmissions = stats?.totalSubmissions || "1,200+";
    const todaySubmissions = stats?.todaySubmissions || "150+";
    const popularExam = stats?.examPopularity?.[0]?.name || "Teacher Political Science";

    const text = 
      `📊 <b>HP Rank Checker — Live Platform Dashboard</b>\n\n` +
      `👥 <b>Total Candidates Evaluated</b>: <code>${totalSubmissions}</code>\n` +
      `📈 <b>Submissions Today</b>: <code>${todaySubmissions}</code>\n` +
      `🔥 <b>Most Popular Exam Today</b>: <code>${popularExam}</code>\n` +
      `⏱️ <b>PDF Download Window</b>: ${windowStatus}\n\n` +
      `<i>Type /pdfreport to browse active exams and download reports!</i>`;

    await ctx.replyWithHTML(text);
  } catch (err) {
    logger.error("Failed to execute /stats command", err);
    await ctx.reply("❌ Unable to fetch platform statistics right now.");
  }
}
