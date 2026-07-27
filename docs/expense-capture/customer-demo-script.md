# Customer demo script — expense capture (local)

**Ticket:** [Dry-run customer demo script for expense capture](https://github.com/karlnolan567/n8n-test/issues/26)  
**Bot:** [@KarlExpense_bot](https://t.me/KarlExpense_bot)  
**Sheet:** [Expense Capture Demo](https://docs.google.com/spreadsheets/d/1rr11LMrAzXM9uwBCUlMzfdR6QCl0x7aluJQaZBP4Bo0/edit)  
**Approval channel (local):** Telegram Approve/Reject (not Google Chat — personal Gmail cannot join Chat spaces)

## Before you start

1. Local n8n running (`http://localhost:5678`)
2. Cloudflare tunnel up and `WEBHOOK_URL` / Telegram webhook pointing at it  
   (quick tunnels rotate — if Telegram goes silent, restart tunnel and re-activate the workflow)
3. Workflow **08 - Expense Capture Telegram** active
4. You are Telegram user `7813999484` (allowlisted)

## Demo script (~3 minutes)

### 1. Setup beat
- Open the Sheet on a laptop (headers visible).
- On the phone, open [@KarlExpense_bot](https://t.me/KarlExpense_bot).

### 2. Capture
- Say: “Employee snaps a receipt and sends it here.”
- Send a **photo** or **image file** (PNG/JPG) of a receipt.
- Bot replies with **LLM extraction JSON** (testing visibility), then an **Approve / Reject** inline button prompt (stays in Telegram — no browser page).
- Sheet gets a new row with `status = pending approval`.

### 3. Approve path
- Tap **Approve** on the Telegram buttons.
- Bot replies in-chat that it has been approved.
- Sheet `status` → `approved`.

### 4. Reject path (optional second receipt)
- Send another receipt image.
- Tap **Reject**.
- Bot replies in-chat that it has been rejected.
- Sheet row stays; `status` → `rejected`.

### 5. Failure beat (optional)
- Send a non-receipt image or blurry shot.
- Bot replies with an extraction-failure message; **no** new Sheet row.

## What to show vs say

| Show | Say |
|------|-----|
| Telegram thread | Capture + human approval in the same place for this demo |
| Sheet row lifecycle | System of record: pending → approved / rejected |
| Approve/Reject buttons | Human gate before Sheet status changes |

## Sample receipt fields (known good)

From dry-run receipt `Receipt1.png` / Daily Grind Cafe:

- vendor: `THE DAILY GRIND CAFE`
- amount: `10.20` EUR
- category: `meals`

## Dry-run checklist

| Step | Result |
|------|--------|
| `/start` → help text | ✅ |
| Receipt image (no caption) → pending approval prompt | ✅ |
| Sheet row `pending approval` | ✅ |
| Approve → buttons cleared, `approved` | ✅ |
| Reject → buttons cleared, `rejected` | ✅ (re-check if needed after latest button UX) |
| Bad image / transient AI error → clear message | ✅ |

## Notes from local runs

- Compressed Telegram **photos** and **image documents** are both supported.
- Model: `google/gemini-2.5-flash` via OpenRouter (older `gemini-2.0-flash-001` slug retired).
- Approve path proven on execution `283`. Reject path reached Sheet update; one overnight failure was DNS (`sheets.googleapis.com` ENOTFOUND) after a long wait — retry reject on a fresh run.
