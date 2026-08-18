import { Context } from "telegraf";
import { BackendDataService } from "../../services/backendData.service";
import { PdfGeneratorService } from "../../services/pdfGenerator.service";
import { TelegramPosterService } from "../../services/telegramPoster.service";
import { logger } from "../../utils/logger";

export async function handlePostChannelCommand(ctx: Context) {
  try {
    const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
    // Parse entire multi-word stream/exam name after /post_channel
    const query = text.replace(/^\/post_channel\s*/i, "").trim();
    const stream = query || "NON_MEDICAL";

    try { await ctx.sendChatAction("typing"); } catch (e) {}
    const broadcastLoadingMsg = await ctx.replyWithHTML(`⏳ <i>Fetching live records &amp; compiling PDF report for channel broadcast (Target: <code>${stream}</code>)...</i>`);

    // Fetch real backend data
    const submissions = await BackendDataService.fetchSubmissionsByStream(stream);

    if (submissions.length === 0) {
      await ctx.telegram.editMessageText(
        broadcastLoadingMsg.chat.id,
        broadcastLoadingMsg.message_id,
        undefined,
        `⚠️ No candidate submissions found for <code>${stream}</code>. Broadcast aborted.`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Generate PDF matching Admin Panel layout
    const pdfBuffer = await PdfGeneratorService.generateShiftReportPdf(stream, submissions);
    const sanitizedFilename = stream.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `HP_RankCheck_${sanitizedFilename}_Shift_Report.pdf`;
    
    const caption = 
      `📊 <b>HP Rank Checker — Official Shift Report</b>\n\n` +
      `🏆 <b>Exam Stream</b>: <code>${stream}</code>\n` +
      `📅 <b>Date</b>: ${new Date().toLocaleDateString()}\n` +
      `👥 <b>Evaluated Candidates</b>: ${submissions.length}\n\n` +
      `👇 <i>Download attached PDF report for shift-wise candidate lists &amp; score averages!</i>`;

    const success = await TelegramPosterService.sendPdfDocumentToChannel(
      ctx.telegram as any,
      pdfBuffer,
      filename,
      caption
    );

    if (success) {
      await ctx.telegram.editMessageText(
        broadcastLoadingMsg.chat.id,
        broadcastLoadingMsg.message_id,
        undefined,
        `✅ Successfully posted <b>${filename}</b> to Telegram Channel!`,
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.telegram.editMessageText(
        broadcastLoadingMsg.chat.id,
        broadcastLoadingMsg.message_id,
        undefined,
        "❌ Failed to post PDF to Telegram Channel. Please check channel credentials in .env.",
        { parse_mode: "HTML" }
      );
    }
  } catch (err) {
    logger.error("Failed to execute /post_channel command", err);
    await ctx.reply("❌ Channel broadcast failed.");
  }
}
