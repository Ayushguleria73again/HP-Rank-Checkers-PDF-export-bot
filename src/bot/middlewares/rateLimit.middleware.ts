import { Context } from "telegraf";

const userLastCommandTime: Map<number, number> = new Map();
const userDailyPdfMap: Map<string, { count: number; dateStr: string }> = new Map();
const RATE_LIMIT_MS = 3000; // 3 seconds cooldown between commands

/**
 * Returns today's date string in IST format (YYYY-MM-DD)
 */
function getTodayIstDateStr(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const [{ value: month }, , { value: day }, , { value: year }] = formatter.formatToParts(new Date());
    return `${year}-${month}-${day}`;
  } catch (e) {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Returns user's daily PDF download count for today
 */
export function getUserDailyPdfCount(userId: string | number): number {
  const uId = String(userId);
  const today = getTodayIstDateStr();
  const record = userDailyPdfMap.get(uId);

  if (!record || record.dateStr !== today) {
    return 0;
  }
  return record.count;
}

/**
 * Increments user's daily PDF count after successful download
 */
export function incrementUserDailyPdfCount(userId: string | number): number {
  const uId = String(userId);
  const today = getTodayIstDateStr();
  const record = userDailyPdfMap.get(uId);

  if (!record || record.dateStr !== today) {
    userDailyPdfMap.set(uId, { count: 1, dateStr: today });
    return 1;
  } else {
    record.count += 1;
    userDailyPdfMap.set(uId, record);
    return record.count;
  }
}

/**
 * Anti-spam 3-second cooldown rate limit middleware
 */
export async function rateLimitMiddleware(ctx: Context, next: () => Promise<void>) {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const lastTime = userLastCommandTime.get(userId) || 0;

  if (now - lastTime < RATE_LIMIT_MS) {
    try { await ctx.answerCbQuery("⚠️ Please wait a few seconds."); } catch (e) {}
    await ctx.reply("⚠️ Please wait a few seconds before requesting another action.");
    return;
  }

  userLastCommandTime.set(userId, now);
  return next();
}
