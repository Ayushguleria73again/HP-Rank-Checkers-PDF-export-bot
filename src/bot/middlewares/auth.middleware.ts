import { Context } from "telegraf";
import { ENV } from "../../config/env.config";
import { logger } from "../../utils/logger";

/**
 * Checks if a Telegram user ID is a whitelisted admin
 */
export function isAdminUser(userId?: number | string): boolean {
  if (!userId) return false;
  return ENV.ADMIN_TELEGRAM_IDS.includes(String(userId).trim());
}

/**
 * Checks if the PDF generation window is open (6:00 PM to 9:00 PM IST)
 * 18:00 to 21:00 Indian Standard Time
 */
export function isPdfWindowOpen(): boolean {
  try {
    const now = new Date();
    // Convert to Indian Standard Time (IST) hour (0-23 format with h23 hourCycle)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hourCycle: "h23",
    });
    const hour = parseInt(formatter.format(now), 10);

    // 6:00 PM (18:00) to 9:00 PM (21:00)
    return hour >= 18 && hour < 21;
  } catch (err) {
    logger.error("Error calculating IST time window:", err);
    // Fallback to local system time
    const localHour = new Date().getHours();
    return localHour >= 18 && localHour < 21;
  }
}

/**
 * Admin-only command middleware guard
 */
export async function adminAuthMiddleware(ctx: Context, next: () => Promise<void>) {
  const userId = ctx.from?.id ? String(ctx.from.id) : "";

  if (!isAdminUser(userId)) {
    logger.warn(`Unauthorized admin attempt by Telegram ID: ${userId}`);
    await ctx.reply("❌ Access Denied: This command is restricted to system administrators.");
    return;
  }

  return next();
}
