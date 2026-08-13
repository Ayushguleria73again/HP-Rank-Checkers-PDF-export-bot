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

    await ctx.reply(`⏳ Compiling live shift report and posting to Telegram Channel for *${stream}*...`, { parse_mode: "Markdown" });

    // Fetch real backend data
    const submissions = await BackendDataService.fetchSubmissionsByStream(stream);

    // Generate PDF matching Admin Panel layout
    const pdfBuffer = await PdfGeneratorService.generateShiftReportPdf(stream, submissions);
    const filename = `HP_RankCheck_${stream}_Shift_Report.pdf`;
    
    const caption = 
      `📊 *HP Rank Checker — Official Shift Report*\n\n` +
      `🏆 *Exam Stream*: ${stream}\n` +
      `📅 *Date*: ${new Date().toLocaleDateString()}\n` +
      `👥 *Evaluated Candidates*: ${submissions.length}\n\n` +
      `👇 *Download attached PDF report for shift-wise candidate lists & score averages!*`;

    const success = await TelegramPosterService.sendPdfDocumentToChannel(
      ctx.telegram as any,
      pdfBuffer,
      filename,
      caption
    );

    if (success) {
      await ctx.reply(`✅ Successfully posted ${filename} to Telegram Channel!`);
    } else {
      await ctx.reply("❌ Failed to post PDF to Telegram Channel. Please check channel credentials.");
    }
  } catch (err) {
    logger.error("Failed to execute /post_channel command", err);
    await ctx.reply("❌ Channel broadcast failed.");
  }
}
