# Local provisioning checklist — expense capture demo

**Ticket:** [Provision Telegram, OpenRouter, Sheet, and Google Chat demo assets](https://github.com/karlnolan567/n8n-test/issues/24)  
**Target:** this repo’s **docker-compose n8n** only (prove before any live/hosted n8n).  
**Do not paste secrets into GitHub issues.**

## 0. Local stack + public HTTPS

Telegram webhooks and Google Chat “Send and Wait” need a public HTTPS URL pointing at local n8n.

| Step | Done? | Notes |
|------|-------|-------|
| `docker compose up -d` | ✅ | n8n at http://localhost:5678 |
| ngrok authtoken configured | ✅ | `ngrok config add-authtoken …` |
| `./scripts/setup-ngrok-webhook.sh` | ✅ | Sets `WEBHOOK_URL` + `N8N_EDITOR_BASE_URL` in `.env`, restarts n8n |
| Confirm webhook URL opens n8n UI | ✅ | Host: `slouchy-albatross-pencil.ngrok-free.dev` |

## 1. Telegram

| Asset | Where it lives | Done? |
|-------|----------------|-------|
| Bot created via [@BotFather](https://t.me/BotFather) (`/newbot`) | BotFather chat → [@KarlExpense_bot](https://t.me/KarlExpense_bot) | ✅ |
| Bot access token | n8n credential **`Telegram Expense Capture`** (`telegramApi`, local only — not in git) | ✅ |
| Allowed Submitter **numeric user id** | Telegram Trigger → **Restrict to User IDs** → `7813999484` | ✅ |
| You have opened a chat with the bot (`/start`) | Telegram app → [@KarlExpense_bot](https://t.me/KarlExpense_bot) | ☐ |

**User id:** `7813999484` (development Allowed Submitter).

## 2. OpenRouter

| Asset | Where it lives | Done? |
|-------|----------------|-------|
| API key (new key for this demo is fine) | [OpenRouter keys](https://openrouter.ai/keys) | ✅ |
| n8n credential | Header Auth: `Authorization` = `Bearer <key>` → **`OpenRouter Expense N8N`** | ✅ |

Selected demo model: `google/gemini-2.5-flash` (was `google/gemini-2.0-flash-001`; slug retired on OpenRouter).

## 3. Google Sheet

Create a spreadsheet (suggested title: **Expense Capture Demo**). Row 1 headers exactly:

```
recordId	date	vendor	amount	currency	tax	category	notes	status	capturedAt	telegramUser
```

| Asset | Where it lives | Done? |
|-------|----------------|-------|
| Spreadsheet created + headers | [Expense Capture Demo](https://docs.google.com/spreadsheets/d/1rr11LMrAzXM9uwBCUlMzfdR6QCl0x7aluJQaZBP4Bo0/edit) | ✅ |
| Spreadsheet URL | https://docs.google.com/spreadsheets/d/1rr11LMrAzXM9uwBCUlMzfdR6QCl0x7aluJQaZBP4Bo0/edit | ✅ |
| n8n Google Sheets credential | Reuse existing **`Google Sheets account`** (`googleSheetsOAuth2Api`) | ✅ |

## 4. Google Chat (1:1 DM — personal Gmail)

Personal `@gmail.com` Chat apps **cannot join spaces**. Approvals use a **1:1 DM with the Chat app**.

| Asset | Where it lives | Done? |
|-------|----------------|-------|
| Chat API app configured (interactive + HTTPS endpoint + saved) | GCP project `expensen8nworkflow` | ✅ |
| n8n Google Chat credential | Service account `googleApi` → **`Google Chat Expense Capture`** (`expensen8n@expensen8nworkflow.iam.gserviceaccount.com`) | ✅ |
| You can open a 1:1 DM with the Chat app | Google Chat → find app by name → message it | ☐ |
| Space **Expense approvals** | — | ❌ out of scope on personal Gmail |

## 5. Record when ready (no secrets)

Fill this table in the GitHub ticket comment when closing provision (names/URLs only):

| Item | Value |
|------|--------|
| n8n Telegram credential name | `Telegram Expense Capture` |
| Allowed Submitter user id | `7813999484` |
| OpenRouter credential name | `OpenRouter Expense N8N` |
| Sheet URL | https://docs.google.com/spreadsheets/d/1rr11LMrAzXM9uwBCUlMzfdR6QCl0x7aluJQaZBP4Bo0/edit |
| Sheet tab name | `Sheet1` |
| Google Sheets credential name | `Google Sheets account` (reused) |
| Google Chat space name | _(n/a — 1:1 DM with Chat app)_ |
| Google Chat credential name | `Google Chat Expense Capture` |
| WEBHOOK_URL host (ngrok subdomain only) | `slouchy-albatross-pencil.ngrok-free.dev` |

## Suggested order

1. Local stack + ngrok  
2. Telegram bot + your user id  
3. OpenRouter key in n8n  
4. Sheet + Sheets credential  
5. Chat space + Chat credential  
