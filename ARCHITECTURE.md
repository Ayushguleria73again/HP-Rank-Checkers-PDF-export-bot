# 📐 Scalable System Architecture — Telegram PDF Bot

This document details the architectural patterns, software layer breakdown, data flow, and scalability guarantees designed into the **HP Rank Checker Telegram Bot**.

---

## 🏛️ Architectural Overview

The bot adheres to a **Clean, Layered Architecture** with strict separation of concerns:

```
                  ┌─────────────────────────────────────────┐
                  │          Telegram Bot Client            │
                  └────────────────────┬────────────────────┘
                                       │ (Incoming Command / Callback)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │           Middlewares Layer             │
                  │   - AuthGuard (Admin Check)             │
                  │   - RateLimiter (Flood Protection)      │
                  │   - Logger (Activity Auditing)          │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │           Controllers Layer             │
                  │   - StartController                     │
                  │   - PdfController                       │
                  │   - BroadcastController                 │
                  └────────────────────┬────────────────────┘
                                       │
                   ┌───────────────────┴───────────────────┐
                   ▼                                       ▼
 ┌───────────────────────────────────┐   ┌───────────────────────────────────┐
 │          Services Layer           │   │         Templates Engine          │
 │ - PdfGeneratorService             │   │ - ShiftReportTemplate             │
 │ - TelegramPosterService           │   │ - MeritListTemplate               │
 │ - ExamDataService                 │   │ - GkQuizTemplate                  │
 └─────────────────┬─────────────────┘   └───────────────────────────────────┘
                   │
                   ▼
 ┌───────────────────────────────────┐
 │     Database Repository Layer     │
 │ - MongoDB (Submission Model)      │
 └───────────────────────────────────┘
```

---

## 🔬 Layer Separation & Responsibilities

### 1. Bot Controllers (`src/bot/controllers/`)
- **Role**: Pure HTTP / Telegram message event handlers.
- **Rules**: Must contain ZERO business or PDF rendering logic. Extract command parameters, delegate to services, and send user responses.

### 2. Middlewares Layer (`src/bot/middlewares/`)
- **Role**: Pre-execution security and rate guards.
- **Key Modules**:
  - `auth.middleware.ts`: Verifies whether `ctx.from.id` exists in `ADMIN_TELEGRAM_IDS`.
  - `rateLimit.middleware.ts`: Prevents spam by restricting users to 1 command per 3 seconds.

### 3. Services Layer (`src/services/`)
- **Role**: Encapsulates core application domain logic.
- **Key Services**:
  - `pdfGenerator.service.ts`: Orchestrates visual template compilation, stream creation, and binary buffer output.
  - `telegramPoster.service.ts`: Handles Telegram API multipart uploads (`sendDocument`), channel posting, error retries, and caption formatting.
  - `examData.service.ts`: Queries MongoDB for submission logs, shift statistics, and category performance rankings.

### 4. Visual Templates Engine (`src/templates/`)
- **Role**: Pure visual layout definitions written with `PDFKit` vector tools.
- **Design Rules**:
  - Light-mode brand palette (Slate 900 headers, Blue 600 accents, Emerald badges).
  - Multi-column table auto-wrapping and page pagination.

---

## 🔄 Data Flow: PDF Generation & Channel Broadcast

```sequence
[Admin User] -> (Type /post_channel NON_MEDICAL): Command sent to Bot
  └──> [AuthMiddleware]: Checks if Admin User ID is authorized
        └──> [BroadcastController]: Parses stream parameter "NON_MEDICAL"
              └──> [ExamDataService]: Queries MongoDB for TGT Non-Medical submissions
                    └──> [PdfGeneratorService]: Compiles ShiftReportTemplate into PDF Buffer
                          └──> [TelegramPosterService]: Calls Telegram Bot API sendDocument
                                └──> [Official Channel]: PDF uploaded with interactive join buttons!
```

---

## 🛡️ Resilience & Performance Strategies

1. **Memory-Stream PDF Compilation**: PDFs are compiled directly into in-memory Node.js `Buffer` objects, eliminating temp file disk I/O bottlenecks.
2. **Graceful Shutdown**: Listens to `SIGTERM` and `SIGINT` signals to safely terminate pending Telegram webhooks/polling handlers on Railway restart.
3. **Telegram Flood Control Mitigation**: Wraps API calls with exponential backoff retries when encountering Telegram `429 Too Many Requests` status codes.
