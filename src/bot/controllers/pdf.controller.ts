import { Context, Markup } from "telegraf";
import { BackendDataService, BackendExam } from "../../services/backendData.service";
import { PdfGeneratorService } from "../../services/pdfGenerator.service";
import { QuizDataService } from "../../services/quizData.service";
import { isAdminUser, isPdfWindowOpen } from "../middlewares/auth.middleware";
import { 
  getUserDailyExamPdfCount, 
  incrementUserDailyExamPdfCount,
  getUserDailyQuizPdfCount,
  incrementUserDailyQuizPdfCount
} from "../middlewares/rateLimit.middleware";
import { logger } from "../../utils/logger";

const EXAMS_PER_PAGE = 5;
const MAX_DAILY_EXAM_PDF_LIMIT = 2; // 2 Exam Report PDFs per day per user
const MAX_DAILY_QUIZ_PDF_LIMIT = 1; // 1 Quiz Practice Set PDF per day per user

/**
 * Helper to clean long exam names by stripping redundant prefixes
 */
function cleanExamName(name: string, stream?: string): string {
  if (!name) return stream || "Exam";
  const clean = name
    .replace(/^Recruitment\s+for\s+the\s+post\s+of\s+/i, "")
    .replace(/^Recruitment\s+for\s+the\s+Post\s+of\s+/i, "")
    .replace(/^Recruitment\s+for\s+/i, "")
    .replace(/^HP\s+/i, "")
    .trim();
  return clean || name;
}

/**
 * Escape HTML special characters for safe Telegram HTML formatting
 */
function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Helper to build interactive dynamic exam selection keyboard with category filters & pagination
 */
function buildExamsKeyboard(exams: BackendExam[], page = 1, category = "ALL") {
  const totalPages = Math.ceil(exams.length / EXAMS_PER_PAGE) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * EXAMS_PER_PAGE;
  const pageExams = exams.slice(startIndex, startIndex + EXAMS_PER_PAGE);

  const keyboardRows: ReturnType<typeof Markup.button.callback>[][] = [];

  // Category filter row at the top
  keyboardRows.push([
    Markup.button.callback(category === "TGT" ? "🧪 TGT [✓]" : "🧪 TGT", "cat_TGT"),
    Markup.button.callback(category === "TEACHER" ? "✏️ Teachers [✓]" : "✏️ Teachers", "cat_TEACHER"),
    Markup.button.callback(category === "ALL" ? "📋 All [✓]" : "📋 All", "cat_ALL"),
  ]);

  // 1 full-width exam button per row
  pageExams.forEach((exam, idx) => {
    const code = exam._id || exam.stream;
    const cleanName = cleanExamName(exam.name, exam.stream);
    const itemNum = startIndex + idx + 1;
    
    keyboardRows.push([
      Markup.button.callback(`${itemNum}. 📌 ${cleanName}`, `exam_${code}`)
    ]);
  });

  // Pagination navigation row if multiple pages
  if (totalPages > 1) {
    const navRow: ReturnType<typeof Markup.button.callback>[] = [];
    if (currentPage > 1) {
      navRow.push(Markup.button.callback("⬅️ Prev", `exampage_${category}_${currentPage - 1}`));
    }
    navRow.push(Markup.button.callback(`Page ${currentPage}/${totalPages}`, "noop"));
    if (currentPage < totalPages) {
      navRow.push(Markup.button.callback("Next ➡️", `exampage_${category}_${currentPage + 1}`));
    }
    keyboardRows.push(navRow);
  }

  return Markup.inlineKeyboard(keyboardRows);
}

/**
 * 1. Triggered on /pdfreport or /pdf_report command.
 * Dynamically fetches ALL active exams from backend database with an instant loading status message.
 */
export async function handlePdfReportMenu(ctx: Context) {
  try {
    const isCallback = Boolean(ctx.callbackQuery);
    let page = 1;
    let category = "ALL";
    let loadingMsg: any;

    if (isCallback && ctx.callbackQuery && "data" in ctx.callbackQuery) {
      const data = (ctx.callbackQuery as any).data;
      if (typeof data === "string") {
        if (data.startsWith("exampage_")) {
          const parts = data.split("_");
          category = parts[1] || "ALL";
          page = parseInt(parts[2], 10) || 1;
        } else if (data.startsWith("cat_")) {
          category = data.replace("cat_", "");
          page = 1;
        }
      }
      try {
        await ctx.answerCbQuery();
      } catch (e) {}

      try {
        await ctx.editMessageText("⏳ <i>Loading active exams directory...</i>", { parse_mode: "HTML" });
      } catch (e) {}
    } else {
      try {
        await ctx.sendChatAction("typing");
      } catch (e) {}
      loadingMsg = await ctx.replyWithHTML("⏳ <i>Loading active exams directory...</i>");
    }

    let exams = await BackendDataService.fetchAllExams();

    // Category Filtering
    if (category === "TGT") {
      exams = exams.filter((e) => e.name.toUpperCase().includes("TGT") || e.stream.toUpperCase().includes("TGT"));
    } else if (category === "TEACHER") {
      exams = exams.filter((e) => e.name.toUpperCase().includes("TEACHER") || e.name.toUpperCase().includes("LECTURER"));
    }

    const totalPages = Math.ceil(exams.length / EXAMS_PER_PAGE) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * EXAMS_PER_PAGE;
    const pageExams = exams.slice(startIndex, startIndex + EXAMS_PER_PAGE);

    let examListText = `📋 <b>Select Target Examination:</b> (${exams.length} Exams in ${category})\n\n`;
    pageExams.forEach((exam, idx) => {
      const itemNum = startIndex + idx + 1;
      const safeName = escapeHtml(exam.name);
      examListText += `<b>${itemNum}.</b> ${safeName}\n`;
    });
    examListText += `\n<i>Tap a category or exam button below:</i>`;
    
    const keyboard = buildExamsKeyboard(exams, currentPage, category);

    if (isCallback) {
      try {
        await ctx.editMessageText(examListText, { parse_mode: "HTML", ...keyboard });
      } catch (err: any) {
        if (err?.description?.includes("message is not modified")) return;
        throw err;
      }
    } else if (loadingMsg) {
      await ctx.telegram.editMessageText(
        loadingMsg.chat.id,
        loadingMsg.message_id,
        undefined,
        examListText,
        { parse_mode: "HTML", ...keyboard }
      );
    } else {
      await ctx.replyWithHTML(examListText, keyboard);
    }
  } catch (err) {
    logger.error("Failed to render /pdfreport menu", err);
    await ctx.reply("❌ Unable to fetch exams menu. Please try again.");
  }
}

/**
 * 2. Instant Exam Search Command (/search <query>)
 */
export async function handleSearchCommand(ctx: Context) {
  try {
    const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
    const query = text.replace(/^\/search/i, "").trim();

    if (!query) {
      await ctx.replyWithHTML(
        `🔍 <b>Instant Exam Search</b>\n\n` +
        `Please specify a search term after the command, e.g.:\n` +
        `• <code>/search Biology</code>\n` +
        `• <code>/search Patwari</code>\n` +
        `• <code>/search TGT</code>`
      );
      return;
    }

    await ctx.sendChatAction("typing");
    const allExams = await BackendDataService.fetchAllExams();
    const matches = allExams.filter((e) => 
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.stream.toLowerCase().includes(query.toLowerCase())
    );

    if (matches.length === 0) {
      await ctx.replyWithHTML(`🔍 No exams found matching <code>${escapeHtml(query)}</code>. Type /pdfreport to view all exams.`);
      return;
    }

    let matchText = `🔍 <b>Found ${matches.length} Exam Matches for "${escapeHtml(query)}":</b>\n\n`;
    const keyboardRows: ReturnType<typeof Markup.button.callback>[][] = [];

    matches.slice(0, 8).forEach((exam, idx) => {
      const code = exam._id || exam.stream;
      const cleanName = cleanExamName(exam.name, exam.stream);
      matchText += `<b>${idx + 1}.</b> ${escapeHtml(exam.name)}\n`;
      keyboardRows.push([
        Markup.button.callback(`${idx + 1}. 📌 ${cleanName}`, `exam_${code}`)
      ]);
    });

    keyboardRows.push([Markup.button.callback("« Back to Exams Directory", "back_to_exams")]);

    await ctx.replyWithHTML(matchText, Markup.inlineKeyboard(keyboardRows));
  } catch (err) {
    logger.error("Failed to execute /search command", err);
    await ctx.reply("❌ Search failed. Please try again.");
  }
}

/**
 * 3. Triggered when user selects an Exam.
 * Displays options for Shift-Wise vs Raw Marks PDF format.
 */
export async function handleExamSelectedAction(ctx: Context & { match?: RegExpExecArray }) {
  try {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const examCode = ctx.match ? ctx.match[1] : "NON_MEDICAL";
    const safeCode = escapeHtml(examCode);

    const text = 
      `🎯 <b>Selected Target Exam:</b> <code>${safeCode}</code>\n\n` +
      `<b>Choose PDF Report Format:</b>\n` +
      `• <b>Shift-Wise Report</b>: Categorized chronologically by exam date &amp; time slots with shift averages.\n` +
      `• <b>Raw Marks Scoreboard</b>: Full list of candidate marks sorted from highest to lowest score.`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("📊 Shift-Wise PDF Report", `format_shift_${examCode}`),
      ],
      [
        Markup.button.callback("📄 Raw Marks Scoreboard PDF", `format_raw_${examCode}`),
      ],
      [
        Markup.button.callback("« Back to Exams Directory", "back_to_exams"),
      ]
    ]);

    await ctx.editMessageText(text, { parse_mode: "HTML", ...keyboard });
  } catch (err) {
    logger.error("Failed to process exam selection action", err);
  }
}

/**
 * 4. Triggered when user selects a Report Format (Shift vs Raw).
 */
export async function handleFormatSelectedAction(ctx: Context & { match?: RegExpExecArray }) {
  try {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const userId = ctx.from?.id ? String(ctx.from.id) : "";
    const isAdmin = isAdminUser(userId);

    // Rule 1: Enforce 6:00 PM - 9:00 PM IST window for non-admin users
    if (!isAdmin && !isPdfWindowOpen()) {
      const closedText = 
        `⏰ <b>PDF Generation Window Closed!</b>\n\n` +
        `Candidate PDF report generation is available daily strictly between <b>6:00 PM and 9:00 PM IST</b>.\n\n` +
        `💡 <i>Please try again during the window!</i>`;

      const closedKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback("« Back to Exams Directory", "back_to_exams")]
      ]);

      await ctx.editMessageText(closedText, { parse_mode: "HTML", ...closedKeyboard });
      return;
    }

    // Rule 2: Enforce Daily Download Limit (Max 2 Exam PDFs per day) for non-admin users
    if (!isAdmin) {
      const currentDailyCount = getUserDailyExamPdfCount(userId);
      if (currentDailyCount >= MAX_DAILY_EXAM_PDF_LIMIT) {
        const limitText = 
          `🚫 <b>Daily Exam PDF Limit Reached!</b>\n\n` +
          `You have already generated <b>${currentDailyCount}/${MAX_DAILY_EXAM_PDF_LIMIT} Exam PDF reports</b> today.\n\n` +
          `Your daily download quota will automatically reset tomorrow at <b>00:00 IST</b>.`;

        const limitKeyboard = Markup.inlineKeyboard([
          [Markup.button.callback("« Back to Exams Directory", "back_to_exams")]
        ]);

        await ctx.editMessageText(limitText, { parse_mode: "HTML", ...limitKeyboard });
        return;
      }
    }

    const format = ctx.match ? ctx.match[1] : "shift";
    const examCode = ctx.match ? ctx.match[2] : "NON_MEDICAL";
    const safeCode = escapeHtml(examCode);

    const formatTitle = format === "shift" ? "Shift-Wise PDF Report" : "Raw Marks Scoreboard PDF";
    await ctx.editMessageText(`⏳ Fetching live records &amp; generating <b>${formatTitle}</b> for <code>${safeCode}</code>...\nPlease wait a moment.`, { parse_mode: "HTML" });

    // Fetch live submission records from Backend API
    const submissions = await BackendDataService.fetchSubmissionsByStream(examCode);

    // Generate chosen PDF format
    let pdfBuffer: Buffer;
    let filename: string;

    if (format === "raw") {
      pdfBuffer = await PdfGeneratorService.generateRawMarksReportPdf(examCode, submissions);
      filename = `HP_RankCheck_${examCode}_Raw_Marks.pdf`;
    } else {
      pdfBuffer = await PdfGeneratorService.generateShiftReportPdf(examCode, submissions);
      filename = `HP_RankCheck_${examCode}_Shift_Report.pdf`;
    }

    // Increment user's daily exam PDF count for non-admins
    if (!isAdmin) {
      incrementUserDailyExamPdfCount(userId);
    }
    const updatedCount = isAdmin ? "Unlimited (Admin)" : `${getUserDailyExamPdfCount(userId)}/${MAX_DAILY_EXAM_PDF_LIMIT}`;

    await ctx.replyWithDocument(
      {
        source: pdfBuffer,
        filename: filename,
      },
      {
        caption: 
          `📄 <b>${formatTitle}</b>\n` +
          `🏆 <b>Target Exam</b>: <code>${safeCode}</code>\n` +
          `👥 <b>Evaluated Candidates</b>: ${submissions.length}\n` +
          `📊 <b>Daily Exam Quota</b>: ${updatedCount}\n` +
          `📅 <b>Generated</b>: ${new Date().toLocaleDateString()}`,
        parse_mode: "HTML",
      }
    );
  } catch (err) {
    logger.error("Failed to generate selected PDF format", err);
    await ctx.reply("❌ Failed to generate PDF. Please try again.");
  }
}

/**
 * 5. Triggered on /gk_quiz_pdf command.
 */
export async function handleGkQuizPdfCommand(ctx: Context) {
  try {
    const userId = ctx.from?.id ? String(ctx.from.id) : "";
    const isAdmin = isAdminUser(userId);

    if (!isAdmin) {
      const currentDailyCount = getUserDailyQuizPdfCount(userId);
      if (currentDailyCount >= MAX_DAILY_QUIZ_PDF_LIMIT) {
        const limitText = 
          `🚫 <b>Daily Quiz PDF Limit Reached!</b>\n\n` +
          `You have already generated your <b>${MAX_DAILY_QUIZ_PDF_LIMIT} free Quiz PDF set</b> today.\n\n` +
          `Your daily quiz quota will automatically reset tomorrow at <b>00:00 IST</b>.\n\n` +
          `💡 Join our <a href="https://t.me/+i3HKLyqkL9BhYTI9">Quiz Channel</a> for daily live quizzes!`;

        await ctx.replyWithHTML(limitText);
        return;
      }
    }

    await ctx.replyWithHTML("⏳ <i>Fetching 20 questions from question bank &amp; generating HP GK Practice Set PDF...</i>");

    const questions = await QuizDataService.fetchQuizQuestions(20);
    const pdfBuffer = await PdfGeneratorService.generateGkQuizPdf(questions);

    if (!isAdmin) {
      incrementUserDailyQuizPdfCount(userId);
    }
    const updatedCount = isAdmin ? "Unlimited (Admin)" : `${getUserDailyQuizPdfCount(userId)}/${MAX_DAILY_QUIZ_PDF_LIMIT}`;

    await ctx.replyWithDocument(
      {
        source: pdfBuffer,
        filename: "HP_GK_20_Questions_Practice_Set.pdf",
      },
      {
        caption: 
          `🧠 <b>Daily HP GK Practice Set</b> (${questions.length} Questions)\n` +
          `Includes Section I (Question Paper) &amp; Section II (Answer Key + Explanations)!\n` +
          `📊 <b>Daily Quiz Quota</b>: ${updatedCount}\n\n` +
          `Join <a href="https://t.me/+i3HKLyqkL9BhYTI9">Quiz Channel</a> for daily quizzes!`,
        parse_mode: "HTML",
      }
    );
  } catch (err) {
    logger.error("Failed to execute /gk_quiz_pdf command", err);
    await ctx.reply("❌ Failed to generate GK Quiz PDF.");
  }
}
