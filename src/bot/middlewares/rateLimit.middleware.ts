import { Context } from "telegraf";
import { isAdminUser } from "./auth.middleware";

const userLastCommandTime: Map<number, number> = new Map();
const userRequestTimestamps: Map<number, number[]> = new Map();
const userBannedUntilMap: Map<number, number> = new Map();

const userDailyExamPdfMap: Map<string, { count: number; dateStr: string }> = new Map();
const userDailyQuizPdfMap: Map<string, { count: number; dateStr: string }> = new Map();

const RATE_LIMIT_MS = 2500; // 2.5 seconds cooldown between heavy commands (PDF generation, stats, search)
const BROWSING_DEBOUNCE_MS = 350; // 350ms debounce for quick inline menu pagination & category switching
const SPAM_WINDOW_MS = 10000; // 10 seconds window for detecting rapid spam
const SPAM_MAX_REQUESTS = 4; // Max 4 heavy requests per 10s allowed before triggering 30-min jail
const BAN_DURATION_MS = 30 * 60 * 1000; // 30 Minutes Ban

// Periodic Memory Cleanup: Evict stale records every 2 hours to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const today = getTodayIstDateStr();

  // 1. Evict expired bans
  for (const [userId, banExpiry] of userBannedUntilMap.entries()) {
    if (now >= banExpiry) {
      userBannedUntilMap.delete(userId);
      userRequestTimestamps.delete(userId);
    }
  }

  // 2. Evict expired daily counts from previous days
  for (const [userId, record] of userDailyExamPdfMap.entries()) {
    if (record.dateStr !== today) {
      userDailyExamPdfMap.delete(userId);
    }
  }
  for (const [userId, record] of userDailyQuizPdfMap.entries()) {
    if (record.dateStr !== today) {
      userDailyQuizPdfMap.delete(userId);
    }
  }

  // 3. Evict command timestamps inactive for > 1 hour
  for (const [userId, lastTime] of userLastCommandTime.entries()) {
    if (now - lastTime > 3600000) {
      userLastCommandTime.delete(userId);
      userRequestTimestamps.delete(userId);
    }
  }
}, 2 * 60 * 60 * 1000);

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
 * Anti-spam rate limit & 30-minute spam jail middleware
 */
export async function rateLimitMiddleware(ctx: Context, next: () => Promise<void>) {
  const userId = ctx.from?.id;
  if (!userId) return next();

  // Admin exemption
  if (isAdminUser(userId)) {
    return next();
  }

  const now = Date.now();

  // Check if callback query is a navigation/browsing action (e.g. flipping pages, switching categories)
  const cbData = ctx.callbackQuery && "data" in ctx.callbackQuery ? (ctx.callbackQuery as any).data : "";
  const isBrowsingAction = typeof cbData === "string" && (
    cbData.startsWith("exampage_") ||
    cbData.startsWith("cat_") ||
    cbData === "back_to_exams" ||
    cbData === "noop"
  );

  // 1. Check if user is currently serving a 30-minute spam ban
  const bannedUntil = userBannedUntilMap.get(userId) || 0;
  if (now < bannedUntil) {
    const remainingMins = Math.ceil((bannedUntil - now) / 60000);
    const banNotice = `⛔ <b>Anti-Spam Alert!</b>\n\nYour account has been temporarily blocked for <b>30 minutes</b> due to rapid spamming.\n\n<i>Please try again in ${remainingMins} minute(s).</i>`;

    if (ctx.callbackQuery) {
      try {
        await ctx.answerCbQuery(`⛔ Blocked for spamming! Try again in ${remainingMins}m.`, { show_alert: true });
      } catch (e) {}
    } else {
      await ctx.replyWithHTML(banNotice);
    }
    return;
  } else if (bannedUntil > 0 && now >= bannedUntil) {
    // Ban expired
    userBannedUntilMap.delete(userId);
    userRequestTimestamps.delete(userId);
  }

  // 2. Track rolling request timestamps ONLY for non-browsing/heavy actions (PDF requests, commands)
  if (!isBrowsingAction) {
    const timestamps = userRequestTimestamps.get(userId) || [];
    const recentTimestamps = timestamps.filter((ts) => now - ts < SPAM_WINDOW_MS);
    recentTimestamps.push(now);
    userRequestTimestamps.set(userId, recentTimestamps);

    // 3. Trigger 30-Minute Ban if user exceeded SPAM_MAX_REQUESTS within 10s
    if (recentTimestamps.length > SPAM_MAX_REQUESTS) {
      const newBanExpiration = now + BAN_DURATION_MS;
      userBannedUntilMap.set(userId, newBanExpiration);

      const banMessage = `⛔ <b>Anti-Spam Block Triggered!</b>\n\nRepeated rapid requests detected. You are temporarily blocked from using the bot for <b>30 minutes</b>.`;

      if (ctx.callbackQuery) {
        try {
          await ctx.answerCbQuery("⛔ Blocked for 30 minutes due to rapid spamming!", { show_alert: true });
        } catch (e) {}
      } else {
        await ctx.replyWithHTML(banMessage);
      }
      return;
    }
  }

  // 4. Cooldown Check: Adaptive cooldown for browsing (350ms) vs heavy commands (2.5s)
  const lastTime = userLastCommandTime.get(userId) || 0;
  const applicableLimit = isBrowsingAction ? BROWSING_DEBOUNCE_MS : RATE_LIMIT_MS;

  if (now - lastTime < applicableLimit) {
    if (ctx.callbackQuery) {
      try {
        await ctx.answerCbQuery(isBrowsingAction ? "⏳ Loading..." : "⚠️ Please wait a moment before requesting again.");
      } catch (e) {}
    } else {
      await ctx.reply("⚠️ Please wait a few seconds before requesting another action.");
    }
    return;
  }

  userLastCommandTime.set(userId, now);
  return next();
}
