# 🤖 HP Rank Checker — Telegram PDF Broadcast Bot

An enterprise-grade, scalable Node.js & TypeScript Telegram Bot built to dynamically generate branded PDF reports, rank scorecards, and daily practice quizzes, and auto-broadcast them to linked Telegram Channels and Groups. Hostable on **Railway.app** with 24/7 uptime.

---

## 📑 Documentation Directory

- 📐 **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Modular system architecture, layered data flow (Controller ➔ Middleware ➔ Service ➔ Repository), and design patterns.
- ⚡ **[COMMANDS.md](./COMMANDS.md)** — Complete command directory, admin vs user permissions matrix, and payload specifications.
- 🚀 **[DEPLOYMENT_RAILWAY.md](./DEPLOYMENT_RAILWAY.md)** — Production deployment blueprint for Railway.app, Docker setup, environment configuration, and health monitoring.

---

## ✨ Core Features

1. **📄 Dynamic PDF Engine**: Generates high-res, vector-rendered PDF documents for exam shift scorecards, stream merit summaries, and HP GK daily practice quizzes.
2. **📢 Channel Auto-Broadcasting**: One-click broadcast of generated PDF reports directly into official Telegram channels (`https://t.me/+i3HKLyqkL9BhYTI9` / `https://t.me/+TpBIh3IlsHgwMzk1`).
3. **🔒 Role-Based Access Control**: Admin-only middleware guarding broadcast and data exporter endpoints via verified Telegram user IDs.
4. **⏰ Automated Cron Scheduler**: Background scheduled tasks to auto-generate and post weekly leaderboard updates to Telegram communities.
5. **🚂 Railway Ready**: Native Dockerfile & Procfile configuration tailored for seamless Railway continuous deployment.

---

## 📁 Scalable Directory Blueprint

```
telegram-bot/
├── src/
│   ├── config/              # Environment validation & app configuration
│   │   ├── env.config.ts
│   │   └── constants.ts
│   ├── bot/                 # Telegram Bot setup & Telegraf instance
│   │   ├── instance.ts
│   │   ├── middlewares/     # Admin auth, logging, rate limiting
│   │   │   ├── auth.middleware.ts
│   │   │   └── rateLimit.middleware.ts
│   │   └── controllers/     # Command & action controllers
│   │       ├── start.controller.ts
│   │       ├── pdf.controller.ts
│   │       ├── broadcast.controller.ts
│   │       └── quiz.controller.ts
│   ├── services/            # Core business logic services
│   │   ├── pdfGenerator.service.ts
│   │   ├── telegramPoster.service.ts
│   │   └── examData.service.ts
│   ├── templates/           # PDF visual templates & layouts
│   │   ├── shiftReport.template.ts
│   │   ├── meritList.template.ts
│   │   └── gkQuiz.template.ts
│   ├── database/            # MongoDB schemas & repositories
│   │   ├── connection.ts
│   │   └── models/
│   │       └── submission.model.ts
│   ├── schedulers/          # Background cron tasks
│   │   └── autoPost.cron.ts
│   ├── utils/               # Formatting, logger, & helper functions
│   │   ├── logger.ts
│   │   └── formatters.ts
│   └── index.ts             # Application entry point
├── docs/                    # Architectural diagrams & specifications
├── Dockerfile               # Railway production container spec
├── Procfile                 # Railway start process declaration
├── package.json
├── tsconfig.json
├── README.md
├── ARCHITECTURE.md
├── COMMANDS.md
└── DEPLOYMENT_RAILWAY.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install Dependencies
```bash
cd telegram-bot
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in credentials:
```env
TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather"
TELEGRAM_CHANNEL_ID="-100xxxxxxxxx"
ADMIN_TELEGRAM_IDS="12345678,87654321"
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/rankcheck"
```

### 3. Run in Development Mode
```bash
npm run dev
```

---

## 📜 License
MIT © HP Rank Checker Team
