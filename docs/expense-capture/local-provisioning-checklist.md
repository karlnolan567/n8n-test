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

Create a spreadsheet (suggested title: **Expense Capture Demo**). Row 1 headers exactly (tab-separated):

```
recordId	date	vendor	amount	currency	tax	category	notes	status	capturedAt	telegramUser	telegramDisplayName	telegramUserId	telegramChatId	telegramApprovalMessageId	chatSpaceId	chatMessageName
```

| Asset | Where it lives | Done? |
|-------|----------------|-------|
| Spreadsheet created + headers | [Expense Capture Demo](https://docs.google.com/spreadsheets/d/1rr11LMrAzXM9uwBCUlMzfdR6QCl0x7aluJQaZBP4Bo0/edit) | ☐ add dual-approval columns |
| Spreadsheet URL | https://docs.google.com/spreadsheets/d/1rr11LMrAzXM9uwBCUlMzfdR6QCl0x7aluJQaZBP4Bo0/edit | ✅ |
| n8n Google Sheets credential | Reuse existing **`Google Sheets account`** (`googleSheetsOAuth2Api`) | ✅ |

### Dual approval — Sheet columns + Chat webhook

These columns are **additive** to the original capture fields. They store cross-channel message ids so approving in Telegram clears the Chat card (and vice versa).

**Row 1 header list (must match workflow mapping):**

`recordId`, `date`, `vendor`, `amount`, `currency`, `tax`, `category`, `notes`, `status`, `capturedAt`, `telegramUser`, `telegramDisplayName`, `telegramUserId`, `telegramChatId`, `telegramApprovalMessageId`, `chatSpaceId`, `chatMessageName`

| Column | Purpose |
|--------|---------|
| `telegramDisplayName` | Friendly submitter name on Sheet and both approval UIs |
| `telegramUserId` | Numeric Telegram user id |
| `telegramChatId` | Edit Telegram approval message after decision |
| `telegramApprovalMessageId` | Telegram message id for inline button edit |
| `chatSpaceId` | Chat DM space (`spaces/…`) for card updates |
| `chatMessageName` | Full Chat message resource name for PATCH |

**Chat app HTTPS endpoint** (GCP Chat app configuration → Triggers → App URL):

```
{WEBHOOK_URL}webhook/expense-google-chat/webhook
```

Example with current ngrok host: `https://slouchy-albatross-pencil.ngrok-free.dev/webhook/expense-google-chat/webhook`

Final path must match the `Google Chat Events` Webhook node path (`expense-google-chat/webhook`).

The `Google Chat Events` Webhook node uses the path `expense-google-chat/webhook`, so the complete public endpoint is `{WEBHOOK_URL}webhook/expense-google-chat/webhook`. Do not remove the trailing `/webhook`. After updating the GCP Chat app configuration or restarting the tunnel, send the app a direct message and confirm it replies `Expense approval bot ready` (or returns HTTP 200 in the Chat API logs).

**Record `GOOGLE_CHAT_DM_SPACE_ID`** after opening a 1:1 DM with the Chat app (e.g. `spaces/AAAA…`):

1. Open Google Chat → find the expense Chat app → send any message (establishes the DM).
2. Copy the space id from the first outbound card send in n8n execution data, or from Chat API `spaces.list` filtered to `spaceType = DIRECT_MESSAGE`.
3. In the local workflow, edit **Chat DM Config** → `spaceId` with that value. Exported JSON deliberately uses `spaces/REPLACE_ME`; do not commit a personal DM space id.
4. Also record the value locally in one of:
   - **Recommended:** workflow sticky note on **08 - Expense Capture Telegram** (visible to operators, not a secret).
   - **Optional:** `.env` as `EXPENSE_CHAT_DM_SPACE_ID` (or `GOOGLE_CHAT_DM_SPACE_ID`) only if you already use env vars for demo config (same pattern as `WEBHOOK_URL`).
   - **Alternative:** a dedicated config cell on the Sheet (document the cell address here once chosen).

Space ids are configuration, not credentials — safe to note in the ticket comment table below. Do **not** commit `.env` or service-account keys.

## 4. Google Chat (1:1 DM — personal Gmail)

Personal `@gmail.com` Chat apps **cannot join spaces**. Approvals use a **1:1 DM with the Chat app**.

| Asset | Where it lives | Done? |
|-------|----------------|-------|
| Chat API app configured (interactive + HTTPS endpoint + saved) | GCP project `expensen8nworkflow` | ✅ |
| n8n Google Chat credential | Service account `googleApi` → **`Google Chat Expense Capture`** (`expensen8n@expensen8nworkflow.iam.gserviceaccount.com`) | ✅ |
| You can open a 1:1 DM with the Chat app | Google Chat → find app by name → message it | ☐ |
| Chat app HTTPS endpoint set | `{WEBHOOK_URL}webhook/expense-google-chat/webhook` (see §3 dual approval) | ☐ |
| `GOOGLE_CHAT_DM_SPACE_ID` recorded | Workflow sticky or `EXPENSE_CHAT_DM_SPACE_ID` in `.env` | ☐ |
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
| `GOOGLE_CHAT_DM_SPACE_ID` | _(e.g. `spaces/AAAA…` — from 1:1 DM)_ |
| Google Chat credential name | `Google Chat Expense Capture` |
| Chat webhook path | `webhook/expense-google-chat/webhook` |
| WEBHOOK_URL host (ngrok subdomain only) | `slouchy-albatross-pencil.ngrok-free.dev` |

## Suggested order

1. Local stack + ngrok  
2. Telegram bot + your user id  
3. OpenRouter key in n8n  
4. Sheet + Sheets credential  
5. Chat space + Chat credential  
