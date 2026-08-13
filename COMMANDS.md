# ⚡ Telegram Bot Commands & Payload Specification

This document provides a comprehensive reference manual for all commands, parameters, permissions, and interactive keyboard payloads supported by the **HP Rank Checker Telegram Bot**.

---

## 🔐 Permissions Matrix

| Command | Public Users | Group Chats | Admin Only | Description |
| --- | :---: | :---: | :---: | --- |
| `/start` | ✅ | ✅ | ✅ | Displays welcome banner & main navigation menu |
| `/help` | ✅ | ✅ | ✅ | Displays user guide and link instructions |
| `/pdf_report [stream]` | ✅ | ✅ | ✅ | Generates live PDF report for a target stream |
| `/gk_quiz_pdf` | ✅ | ✅ | ✅ | Generates daily HP GK practice quiz PDF |
| `/post_channel [stream]` | ❌ | ❌ | ✅ | Generates & posts PDF directly into Telegram Channel |
| `/admin_stats` | ❌ | ❌ | ✅ | Displays live MongoDB submission statistics |

---

## 🛠️ Detailed Command Reference

### 1. `/start`
- **Access**: Public
- **Description**: Initializes bot session, presents brand summary, and returns an interactive inline keyboard.
- **Inline Buttons**:
  - `📥 Generate PDF Report`
  - `🧠 Daily HP GK Quiz`
  - `📢 Join Official Channel` (`https://t.me/+i3HKLyqkL9BhYTI9`)
  - `💬 Join Discussion Group` (`https://t.me/+TpBIh3IlsHgwMzk1`)

---

### 2. `/pdf_report [stream]`
- **Access**: Public
- **Arguments**:
  - `stream` (optional): `NON_MEDICAL`, `MEDICAL`, `ARTS`, `MATHEMATICS`, `JBT`, `GENERAL`.
- **Behavior**:
  1. Displays `⏳ Generating PDF report, please wait...` status message.
  2. Queries MongoDB database for submissions matching the stream.
  3. Renders vector PDF report in memory.
  4. Uploads document to chat as `HP_RankCheck_Report_<stream>.pdf`.

---

### 3. `/gk_quiz_pdf`
- **Access**: Public
- **Behavior**:
  1. Compiles the latest 25 high-yield HP GK practice questions into a clean printable study PDF.
  2. Attaches answer key on final page.
  3. Uploads `HP_GK_Practice_Quiz.pdf` to chat.

---

### 4. `/post_channel [stream]`
- **Access**: Admin Only (`ADMIN_TELEGRAM_IDS` required)
- **Arguments**:
  - `stream` (required): Stream identifier to export.
- **Behavior**:
  1. Verifies user's Telegram ID against admin whitelist.
  2. Generates shift-wise candidate merit list PDF.
  3. Posts document directly into `TELEGRAM_CHANNEL_ID` with formatted Markdown caption:
     ```markdown
     📊 *HP Rank Checker — Official Shift Report*
     
     🏆 *Exam*: TGT Non-Medical
     📅 *Generated*: 14-Aug-2026
     👥 *Total Candidates*: 795
     
     👇 Download the attached PDF report for shift-wise analysis!
     ```

---

### 5. `/admin_stats`
- **Access**: Admin Only
- **Behavior**: Returns JSON/Markdown summary of overall platform metrics (Total Submissions, Today's Submissions, Active Streams count).
