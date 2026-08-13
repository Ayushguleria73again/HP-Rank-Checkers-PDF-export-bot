import PDFDocument from "pdfkit";
import { CONSTANTS } from "../config/constants";
import { BackendSubmission } from "./backendData.service";

export class PdfGeneratorService {
  /**
   * Generates a Shift-wise PDF Report (categorized chronologically by shifts)
   */
  public static async generateShiftReportPdf(
    stream: string,
    submissions: BackendSubmission[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Group submissions by shift
      const groupedData: Record<string, BackendSubmission[]> = {};
      submissions.forEach((sub) => {
        const shiftKey = sub.shift || "Unspecified Shift";
        if (!groupedData[shiftKey]) groupedData[shiftKey] = [];
        groupedData[shiftKey].push(sub);
      });

      // Sort shift keys chronologically
      const parseDate = (s: string) => {
        const match = s.match(/(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})/i);
        if (!match) return 0;
        const [, day, month, year] = match;
        return new Date(`${day} ${month} ${year}`).getTime();
      };

      const sortedShiftKeys = Object.keys(groupedData).sort((a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        if (dateA !== dateB) return dateA - dateB;
        return a.localeCompare(b);
      });

      const timestamp = new Date().toLocaleString();

      // Top Document Header Banner
      doc
        .fillColor("#0f172a")
        .rect(0, 0, doc.page.width, 95)
        .fill();

      doc
        .fillColor("#ffffff")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Shift-Wise Performance Report", 40, 25);

      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#94a3b8")
        .text(`Stream: ${stream} | Total Candidates: ${submissions.length}`, 40, 55);

      doc
        .fontSize(9)
        .fillColor("#38bdf8")
        .text(`Generated: ${timestamp}`, doc.page.width - 200, 55, { align: "right" });

      let currentY = 110;

      if (sortedShiftKeys.length === 0) {
        doc
          .fillColor("#64748b")
          .fontSize(12)
          .font("Helvetica")
          .text("No submission data currently available for this stream.", 40, 130);
      } else {
        sortedShiftKeys.forEach((shift, index) => {
          if (index > 0 && currentY > doc.page.height - 180) {
            doc.addPage();
            currentY = 40;
          }

          const shiftSubmissions = groupedData[shift];

          // Shift Section Heading
          doc
            .fillColor("#1e293b")
            .fontSize(13)
            .font("Helvetica-Bold")
            .text(`Shift: ${shift} (${shiftSubmissions.length} Candidates)`, 40, currentY);

          currentY += 18;

          // Table Header Row
          doc
            .fillColor("#0f172a")
            .rect(40, currentY, doc.page.width - 80, 22)
            .fill();

          doc
            .fillColor("#ffffff")
            .fontSize(9)
            .font("Helvetica-Bold")
            .text("#", 48, currentY + 6)
            .text("ID / Roll", 85, currentY + 6)
            .text("Category", 230, currentY + 6)
            .text("Score", 340, currentY + 6)
            .text("Shift Detail", 430, currentY + 6);

          currentY += 22;

          // Table Data Rows
          shiftSubmissions.forEach((sub, sIdx) => {
            if (currentY > doc.page.height - 60) {
              doc.addPage();
              currentY = 40;
            }

            const rowBg = sIdx % 2 === 0 ? "#ffffff" : "#f8fafc";
            doc.fillColor(rowBg).rect(40, currentY, doc.page.width - 80, 20).fill();

            const rollShort = sub._id ? sub._id.slice(-8).toUpperCase() : "N/A";
            const scoreFormatted = typeof sub.score === "number" ? sub.score.toFixed(2) : String(sub.score || "0.00");

            doc
              .fillColor("#334155")
              .fontSize(8.5)
              .font("Helvetica")
              .text(String(sIdx + 1), 48, currentY + 5)
              .text(rollShort, 85, currentY + 5)
              .text(sub.category || "General", 230, currentY + 5)
              .text(scoreFormatted, 340, currentY + 5)
              .text(sub.shift || "N/A", 430, currentY + 5, { width: 120, height: 15 });

            currentY += 20;
          });

          currentY += 15;
        });
      }

      // Page Footer
      doc
        .fontSize(8)
        .fillColor("#94a3b8")
        .text(`HP Rank Checker  •  ${CONSTANTS.WEBSITE_URL}  •  Support: ${CONSTANTS.SUPPORT_EMAIL}`, 40, doc.page.height - 35, {
          align: "center",
        });

      doc.end();
    });
  }

  /**
   * Generates a Raw Marks PDF Report (sorted strictly by score desc)
   */
  public static async generateRawMarksReportPdf(
    stream: string,
    submissions: BackendSubmission[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Sort raw submissions highest to lowest score
      const sortedSubs = [...submissions].sort((a, b) => (b.score || 0) - (a.score || 0));
      const timestamp = new Date().toLocaleString();

      // Top Document Header Banner
      doc
        .fillColor("#1e1b4b")
        .rect(0, 0, doc.page.width, 95)
        .fill();

      doc
        .fillColor("#ffffff")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Raw Candidate Marks Scoreboard", 40, 25);

      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#c7d2fe")
        .text(`Stream: ${stream} | Sorted by Raw Score (Highest → Lowest)`, 40, 55);

      doc
        .fontSize(9)
        .fillColor("#818cf8")
        .text(`Generated: ${timestamp}`, doc.page.width - 200, 55, { align: "right" });

      let currentY = 110;

      // Table Header Row
      doc
        .fillColor("#312e81")
        .rect(40, currentY, doc.page.width - 80, 24)
        .fill();

      doc
        .fillColor("#ffffff")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("Rank", 48, currentY + 7)
        .text("ID / Roll Number", 100, currentY + 7)
        .text("Category", 250, currentY + 7)
        .text("Raw Score", 360, currentY + 7)
        .text("Exam Date / Shift", 440, currentY + 7);

      currentY += 24;

      if (sortedSubs.length === 0) {
        doc
          .fillColor("#64748b")
          .fontSize(10)
          .font("Helvetica")
          .text("No candidate records found.", 50, currentY + 15);
      } else {
        sortedSubs.forEach((sub, idx) => {
          if (currentY > doc.page.height - 50) {
            doc.addPage();
            currentY = 40;
          }

          const rowBg = idx % 2 === 0 ? "#ffffff" : "#f5f3ff";
          doc.fillColor(rowBg).rect(40, currentY, doc.page.width - 80, 20).fill();

          const rollShort = sub._id ? sub._id.slice(-8).toUpperCase() : "N/A";
          const scoreFormatted = typeof sub.score === "number" ? sub.score.toFixed(2) : String(sub.score || "0.00");

          doc
            .fillColor("#1e1b4b")
            .fontSize(8.5)
            .font("Helvetica")
            .text(`#${idx + 1}`, 48, currentY + 5)
            .text(rollShort, 100, currentY + 5)
            .text(sub.category || "General", 250, currentY + 5)
            .text(scoreFormatted, 360, currentY + 5)
            .text(sub.shift || "Standard", 440, currentY + 5, { width: 110, height: 15 });

          currentY += 20;
        });
      }

      // Page Footer
      doc
        .fontSize(8)
        .fillColor("#94a3b8")
        .text(`HP Rank Checker  •  ${CONSTANTS.WEBSITE_URL}  •  Support: ${CONSTANTS.SUPPORT_EMAIL}`, 40, doc.page.height - 35, {
          align: "center",
        });

      doc.end();
    });
  }

  /**
   * Generates Daily HP GK Quiz Practice PDF
   */
  public static async generateGkQuizPdf(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      doc
        .fillColor("#2563eb")
        .rect(0, 0, doc.page.width, 80)
        .fill();

      doc
        .fillColor("#ffffff")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("HP General Knowledge — Daily Practice Set", 40, 25);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#dbeafe")
        .text(`Join Study Group: ${CONSTANTS.TELEGRAM_QUIZ_GROUP}`, 40, 50);

      doc.moveDown(3);
      doc
        .fillColor("#1e293b")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Sample Practice Questions", 40, 110);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#334155")
        .text("Q1. Which river originates from the Bara Bhangal area in Himachal Pradesh?", 40, 135)
        .text("A) Sutlej     B) Ravi     C) Beas     D) Yamuna", 55, 150)
        .text("Q2. Who was the first Chief Commissioner of Himachal Pradesh?", 40, 180)
        .text("A) N.C. Mehta     B) E. P. Moon     C) Y. S. Parmar     D) Bajrang Bahadur", 55, 195);

      doc.end();
    });
  }
}
