import { Context } from "telegraf";
import { BackendDataService } from "../../services/backendData.service";
import { PdfGeneratorService } from "../../services/pdfGenerator.service";
import { TelegramPosterService } from "../../services/telegramPoster.service";
import { logger } from "../../utils/logger";

export async function handlePostChannelCommand(ctx: Context) {
  try {
    const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
    const parts = text.split(" ");
    const stream = parts[1] ? parts[1].toUpperCase() : "NON_MEDICAL";

    try { await ctx.sendChatAction("typing"); } catch (e) {}
    const broadcastLoadingMsg = await ctx.replyWithHTML(`⏳ <i>Fetching live records &amp; compiling PDF report for channel broadcast...</i>`);

    // Fetch real backend data
    const submissions = await BackendDataService.fetchSubmissionsByStream(stream);

    // Generate PDF matching Admin Panel layout
    const pdfBuffer = await PdfGeneratorService.generateShiftReportPdf(stream, submissions);
    const filename = `HP_RankCheck_${stream}_Shift_Report.pdf`;
    
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
        "❌ Failed to post PDF to Telegram Channel. Please check channel credentials.",
        { parse_mode: "HTML" }
      );
    }
  } catch (err) {
    logger.error("Failed to execute /post_channel command", err);
    await ctx.reply("❌ Channel broadcast failed.");
  }
}
