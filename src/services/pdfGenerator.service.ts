import PDFDocument from "pdfkit";
import { CONSTANTS } from "../config/constants";
import { BackendSubmission } from "./backendData.service";
import { QuizQuestion } from "./quizData.service";

/**
 * Abbreviates long category strings so they fit cleanly in table columns without overlapping score
 */
function cleanCategoryName(cat: string): string {
  if (!cat) return "GEN";
  const upper = cat.trim().toUpperCase();

  if (upper.includes("OTHER BACKWARD") || upper.includes("OBC")) return "OBC";
  if (upper.includes("SCHEDULED CASTE") || upper.includes("(SC)")) return "SC";
  if (upper.includes("SCHEDULED TRIBE") || upper.includes("(ST)")) return "ST";
  if (upper.includes("ECONOMICALLY WEAKER") || upper.includes("EWS")) return "EWS";
  if (upper.includes("UNRESERVED") || upper.includes("GENERAL") || upper.includes("GEN")) return "GEN";

  if (cat.length > 15) {
    return cat.slice(0, 14) + "…";
  }
  return cat;
}

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

      const groupedData: Record<string, BackendSubmission[]> = {};
      submissions.forEach((sub) => {
        const shiftKey = sub.shift || "Unspecified Shift";
        if (!groupedData[shiftKey]) groupedData[shiftKey] = [];
        groupedData[shiftKey].push(sub);
      });

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

      // Top Banner Header
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

          doc
            .fillColor("#1e293b")
            .fontSize(13)
            .font("Helvetica-Bold")
            .text(`Shift: ${shift} (${shiftSubmissions.length} Candidates)`, 40, currentY);

          currentY += 18;

          // Header Bar
          doc
            .fillColor("#0f172a")
            .rect(40, currentY, doc.page.width - 80, 22)
            .fill();

          doc
            .fillColor("#ffffff")
            .fontSize(9)
            .font("Helvetica-Bold")
            .text("#", 48, currentY + 6, { width: 25 })
            .text("ID / Roll", 75, currentY + 6, { width: 110 })
            .text("Category", 190, currentY + 6, { width: 120 })
            .text("Score", 320, currentY + 6, { width: 65 })
            .text("Shift Detail", 390, currentY + 6, { width: 160 });

          currentY += 22;

          shiftSubmissions.forEach((sub, sIdx) => {
            if (currentY > doc.page.height - 60) {
              doc.addPage();
              currentY = 40;
            }

            const rowBg = sIdx % 2 === 0 ? "#ffffff" : "#f8fafc";
            doc.fillColor(rowBg).rect(40, currentY, doc.page.width - 80, 20).fill();

            const rollShort = sub.rollNumber || (sub._id ? sub._id.slice(-8).toUpperCase() : "N/A");
            const categoryClean = cleanCategoryName(sub.category);
            const scoreFormatted = typeof sub.score === "number" ? sub.score.toFixed(2) : String(sub.score || "0.00");

            doc
              .fillColor("#334155")
              .fontSize(8.5)
              .font("Helvetica")
              .text(String(sIdx + 1), 48, currentY + 5, { width: 25 })
              .text(rollShort, 75, currentY + 5, { width: 110, height: 15 })
              .text(categoryClean, 190, currentY + 5, { width: 120, height: 15 });

            // Render Score with Highlighting Font
            doc
              .fillColor("#0f172a")
              .fontSize(9)
              .font("Helvetica-Bold")
              .text(scoreFormatted, 320, currentY + 5, { width: 65, height: 15 });

            doc
              .fillColor("#334155")
              .fontSize(8.5)
              .font("Helvetica")
              .text(sub.shift || "N/A", 390, currentY + 5, { width: 160, height: 15 });

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

      const sortedSubs = [...submissions].sort((a, b) => (b.score || 0) - (a.score || 0));
      const timestamp = new Date().toLocaleString();

      doc
        .fillColor("#1e1b4b")
        .rect(0, 0, doc.page.width, 95)
        .fill();

      doc
        .fillColor("#ffffff")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Raw Marks Scoreboard PDF", 40, 25);

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

      doc
        .fillColor("#312e81")
        .rect(40, currentY, doc.page.width - 80, 24)
        .fill();

      doc
        .fillColor("#ffffff")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("Rank", 48, currentY + 7, { width: 35 })
        .text("ID / Roll Number", 85, currentY + 7, { width: 120 })
        .text("Category", 210, currentY + 7, { width: 110 })
        .text("Raw Score", 330, currentY + 7, { width: 65 })
        .text("Exam Date / Shift", 400, currentY + 7, { width: 150 });

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

          const rollShort = sub.rollNumber || (sub._id ? sub._id.slice(-8).toUpperCase() : "N/A");
          const categoryClean = cleanCategoryName(sub.category);
          const scoreFormatted = typeof sub.score === "number" ? sub.score.toFixed(2) : String(sub.score || "0.00");

          doc
            .fillColor("#1e1b4b")
            .fontSize(8.5)
            .font("Helvetica")
            .text(String(idx + 1), 48, currentY + 5, { width: 35 })
            .text(rollShort, 85, currentY + 5, { width: 120, height: 15 })
            .text(categoryClean, 210, currentY + 5, { width: 110, height: 15 });

          doc
            .fillColor("#1e1b4b")
            .fontSize(9)
            .font("Helvetica-Bold")
            .text(scoreFormatted, 330, currentY + 5, { width: 65, height: 15 });

          doc
            .fillColor("#1e1b4b")
            .fontSize(8.5)
            .font("Helvetica")
            .text(sub.shift || "N/A", 400, currentY + 5, { width: 150, height: 15 });

          currentY += 20;
        });
      }

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
   * Generates Daily HP GK Quiz Practice Set PDF from Quiz-Bot question bank
   */
  public static async generateGkQuizPdf(questions: QuizQuestion[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const timestamp = new Date().toLocaleDateString();

      // Top Header Banner
      doc
        .fillColor("#1e3a8a")
        .rect(0, 0, doc.page.width, 95)
        .fill();

      doc
        .fillColor("#ffffff")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("HP General Knowledge — Practice Quiz Set", 40, 25);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#bfdbfe")
        .text(`Target Exams: HP TGT, JBT, Patwari, Police, Competitive Exams  |  Date: ${timestamp}`, 40, 55);

      doc
        .fontSize(9)
        .fillColor("#60a5fa")
        .text(`Questions: ${questions.length}`, doc.page.width - 150, 55, { align: "right" });

      let currentY = 110;

      // Section Title
      doc
        .fillColor("#0f172a")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("SECTION I: MULTIPLE CHOICE QUESTIONS", 40, currentY);

      currentY += 20;

      // Render Questions
      questions.forEach((q, qIdx) => {
        if (currentY > doc.page.height - 120) {
          doc.addPage();
          currentY = 40;
        }

        // Question Title
        doc
          .fillColor("#1e293b")
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(`Q${qIdx + 1}. ${q.question}`, 40, currentY, { width: doc.page.width - 80 });

        currentY += doc.heightOfString(`Q${qIdx + 1}. ${q.question}`, { width: doc.page.width - 80 }) + 6;

        // Render Options 2 per row
        const optA = q.options[0] ? `[  ] A) ${q.options[0]}` : "";
        const optB = q.options[1] ? `[  ] B) ${q.options[1]}` : "";
        const optC = q.options[2] ? `[  ] C) ${q.options[2]}` : "";
        const optD = q.options[3] ? `[  ] D) ${q.options[3]}` : "";

        doc
          .fillColor("#334155")
          .fontSize(9)
          .font("Helvetica")
          .text(optA, 55, currentY, { width: 230 })
          .text(optB, 300, currentY, { width: 230 });

        currentY += 16;

        doc
          .text(optC, 55, currentY, { width: 230 })
          .text(optD, 300, currentY, { width: 230 });

        currentY += 22; // Gap between questions
      });

      // SECTION II: ANSWER KEY & EXPLANATIONS (New Page)
      doc.addPage();
      currentY = 40;

      doc
        .fillColor("#0f172a")
        .rect(40, currentY, doc.page.width - 80, 26)
        .fill();

      doc
        .fillColor("#ffffff")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("SECTION II: OFFICIAL ANSWER KEY & DETAILED EXPLANATIONS", 48, currentY + 7);

      currentY += 34;

      const labels = ["A", "B", "C", "D"];
      questions.forEach((q, qIdx) => {
        if (currentY > doc.page.height - 80) {
          doc.addPage();
          currentY = 40;
        }

        const correctLetter = labels[q.correctIndex] || "A";
        const correctText = q.options[q.correctIndex] || "";

        doc
          .fillColor("#1e293b")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(`Q${qIdx + 1}. Answer: (${correctLetter}) ${correctText}`, 40, currentY);

        currentY += 14;

        if (q.explanation) {
          doc
            .fillColor("#475569")
            .fontSize(8.5)
            .font("Helvetica-Oblique")
            .text(`Explanation: ${q.explanation}`, 52, currentY, { width: doc.page.width - 92 });

          currentY += doc.heightOfString(`Explanation: ${q.explanation}`, { width: doc.page.width - 92 }) + 8;
        } else {
          currentY += 8;
        }
      });

      // Page Footer
      doc
        .fontSize(8)
        .fillColor("#94a3b8")
        .text(`HP Rank Checker Quiz Set  •  ${CONSTANTS.WEBSITE_URL}  •  Quiz Group: ${CONSTANTS.TELEGRAM_QUIZ_GROUP}`, 40, doc.page.height - 35, {
          align: "center",
        });

      doc.end();
    });
  }
}
