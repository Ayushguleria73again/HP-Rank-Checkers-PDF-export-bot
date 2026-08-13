import { Telegraf } from "telegraf";
import { ENV } from "../config/env.config";
import { logger } from "../utils/logger";

export class TelegramPosterService {
  public static async sendPdfDocumentToChannel(
    bot: Telegraf,
    pdfBuffer: Buffer,
    filename: string,
    caption: string
  ): Promise<boolean> {
    try {
      if (!ENV.TELEGRAM_CHANNEL_ID) {
        logger.error("TELEGRAM_CHANNEL_ID is not configured in .env!");
        return false;
      }

      await bot.telegram.sendDocument(
        ENV.TELEGRAM_CHANNEL_ID,
        {
          source: pdfBuffer,
          filename: filename,
        },
        {
          caption: caption,
          parse_mode: "HTML",
        }
      );

      logger.info(`Successfully posted ${filename} to Telegram Channel ${ENV.TELEGRAM_CHANNEL_ID}`);
      return true;
    } catch (err) {
      logger.error("Failed to post PDF document to Telegram Channel", err);
      return false;
    }
  }
}
