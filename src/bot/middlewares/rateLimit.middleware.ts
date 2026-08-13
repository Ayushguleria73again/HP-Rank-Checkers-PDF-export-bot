import { Context } from "telegraf";

const userLastCommandTime: Map<number, number> = new Map();
const userDailyExamPdfMap: Map<string, { count: number; dateStr: string }> = new Map();
const userDailyQuizPdfMap: Map<string, { count: number; dateStr: string }> = new Map();

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
 * Returns user's daily Exam PDF download count for today
 */
export function getUserDailyExamPdfCount(userId: string | number): number {
  const uId = String(userId);
  const today = getTodayIstDateStr();
  const record = userDailyExamPdfMap.get(uId);

  if (!record || record.dateStr !== today) {
    return 0;
  }
  return record.count;
}

/**
 * Increments user's daily Exam PDF count
 */
export function incrementUserDailyExamPdfCount(userId: string | number): number {
  const uId = String(userId);
  const today = getTodayIstDateStr();
  const record = userDailyExamPdfMap.get(uId);

  if (!record || record.dateStr !== today) {
    userDailyExamPdfMap.set(uId, { count: 1, dateStr: today });
    return 1;
  } else {
    record.count += 1;
    userDailyExamPdfMap.set(uId, record);
    return record.count;
  }
}

/**
 * Returns user's daily Quiz PDF download count for today
 */
export function getUserDailyQuizPdfCount(userId: string | number): number {
  const uId = String(userId);
  const today = getTodayIstDateStr();
  const record = userDailyQuizPdfMap.get(uId);

  if (!record || record.dateStr !== today) {
    return 0;
  }
  return record.count;
}

/**
 * Increments user's daily Quiz PDF count
 */
export function incrementUserDailyQuizPdfCount(userId: string | number): number {
  const uId = String(userId);
  const today = getTodayIstDateStr();
  const record = userDailyQuizPdfMap.get(uId);

  if (!record || record.dateStr !== today) {
    userDailyQuizPdfMap.set(uId, { count: 1, dateStr: today });
    return 1;
  } else {
    record.count += 1;
    userDailyQuizPdfMap.set(uId, record);
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
