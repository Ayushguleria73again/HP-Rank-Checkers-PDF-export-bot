# 🚀 Production Deployment Blueprint for Railway.app

This guide provides step-by-step instructions for deploying the **HP Rank Checker Telegram Bot** onto **Railway.app** for zero-downtime, continuous 24/7 hosting.

---

## 📋 Prerequisites Checklist

Before beginning deployment, ensure you have:
1. **Telegram Bot Token**: Created via [@BotFather](https://t.me/BotFather) on Telegram (`/newbot`).
2. **Channel Credentials**: Target channel handle (e.g., `@hprankchecker`) or numeric ID (e.g., `-1001234567890`). Note: The bot MUST be added as an **Administrator** in your Telegram Channel with "Post Messages" permission.
3. **MongoDB Connection String**: The same `MONGODB_URI` string used by your Express backend.
4. **Railway Account**: Account at [Railway.app](https://railway.app).

---

## 🛠️ Step-by-Step Railway Deployment

### Step 1: Push Repository to GitHub
Ensure the `telegram-bot` folder is pushed to your GitHub repository.

---

### Step 2: Create New Project on Railway
1. Log in to [Railway Dashboard](https://railway.app/dashboard).
2. Click **+ New Project**.
3. Select **Deploy from GitHub repo**.
4. Select your repository (`Exam-RankCheck`).
5. Under **Root Directory**, set:
   ```
   telegram-bot
   ```

---

### Step 3: Configure Environment Variables
In Railway Dashboard ➔ Select Service ➔ **Variables** tab ➔ Add the following keys:

| Variable Key | Example Value | Mandatory |
| --- | --- | :---: |
| `TELEGRAM_BOT_TOKEN` | `7123456789:AA...` | YES |
| `TELEGRAM_CHANNEL_ID` | `-1001987654321` | YES |
| `ADMIN_TELEGRAM_IDS` | `12345678,87654321` | YES |
| `MONGODB_URI` | `mongodb+srv://...` | YES |
| `NODE_ENV` | `production` | YES |
| `PORT` | `3000` | YES |

---

### Step 4: Container Build & Process Check

Railway automatically detects either the `Dockerfile` or `Procfile` inside `telegram-bot/`.

- **Procfile declaration**:
  ```procfile
  web: npm start
  ```

- **Dockerfile build container**:
  ```dockerfile
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM node:20-alpine AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  COPY package*.json ./
  RUN npm ci --only=production
  COPY --from=builder /app/dist ./dist

  EXPOSE 3000
  CMD ["node", "dist/index.js"]
  ```

---

## ⚡ Verifying Deployment Health

1. Open Railway **Logs** tab.
2. Look for the startup log:
   ```
   [INFO] 🤖 HP Rank Checker Bot successfully started polling!
   [INFO] Connected to MongoDB database.
   ```
3. Open Telegram, send `/start` to your bot — if it responds instantly with the welcome banner, your deployment is **100% SUCCESSFUL**! 🎉
