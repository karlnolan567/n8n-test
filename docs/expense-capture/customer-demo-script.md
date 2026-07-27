# Customer demo script — expense capture (local)

**Ticket:** [Dry-run customer demo script for expense capture](https://github.com/karlnolan567/n8n-test/issues/26)  
**Bot:** [@KarlExpense_bot](https://t.me/KarlExpense_bot)  
**Sheet:** [Expense Capture Demo](https://docs.google.com/spreadsheets/d/1rr11LMrAzXM9uwBCUlMzfdR6QCl0x7aluJQaZBP4Bo0/edit)  
**Approval channels (local):** Telegram Approve/Reject **and** Google Chat 1:1 DM card (dual approval — first channel wins)

## Before you start

1. Local n8n running (`http://localhost:5678`)
2. Cloudflare tunnel or ngrok up and `WEBHOOK_URL` / Telegram webhook pointing at it  
   (quick tunnels rotate — if Telegram goes silent, restart tunnel and re-activate the workflow)
3. Workflow **08 - Expense Capture Telegram** active
4. Chat app HTTPS endpoint = `{WEBHOOK_URL}webhook/expense-google-chat`
5. You are Telegram user `7813999484` (allowlisted)
6. You have opened a 1:1 DM with the expense Chat app; `GOOGLE_CHAT_DM_SPACE_ID` configured in workflow sticky or `.env`

### Import the latest workflow export

1. In local n8n, import `workflows/08-expense-capture-telegram.json`.
2. In **Chat DM Config**, replace `spaces/REPLACE_ME` with the operator's 1:1 Chat DM space id; do not save that personal id back into the tracked export.
3. Activate the imported workflow. If any local UI edits are needed, re-export that activated workflow to the same tracked path before committing.

## Demo script (~5 minutes)

### 1. Setup beat
- Open the Sheet on a laptop (headers visible, including `telegramDisplayName` and Chat columns).
- On the phone, open [@KarlExpense_bot](https://t.me/KarlExpense_bot).
- Open Google Chat on laptop or phone — 1:1 DM with the expense Chat app visible.

### 2. Capture + dual pending UI
- Say: “Employee snaps a receipt and sends it here.”
- **Send a photo or image file** (PNG/JPG) of a receipt in Telegram.
- Bot replies with **LLM extraction JSON** (testing visibility), then an **Approve / Reject** inline button prompt in Telegram.
- Sheet gets a new row with `status = pending approval` and **`telegramDisplayName`** populated (e.g. `@karl` or first + last name).
- **Show the Google Chat DM:** an expense card with the same fields and Approve / Reject buttons.

### 3. Approve in one channel (cross-channel clear)
- Say: “Approver can act in either channel — whichever wins first.”
- Tap **Approve** in **Telegram** (or in Chat — pick one for this beat).
- Bot / Chat card updates to final **approved** status; **buttons removed on both channels**.
- Sheet `status` → `approved`.

### 4. Reject on the other channel (second receipt)
- Send **another receipt image** in Telegram.
- Confirm pending row in Sheet (`telegramDisplayName` visible) and **both** Telegram buttons **and** Chat DM card.
- This time tap **Reject** in the **other** channel (e.g. Chat if you approved in Telegram before).
- Both UIs show **rejected**; buttons cleared on both sides.
- Sheet row `status` → `rejected`.

### 5. Idempotency beat (optional)
- Try tapping Approve/Reject again on the already-decided receipt in either channel.
- No status flip; user sees “already decided” (or equivalent).

### 6. Failure beat (optional)
- Send a non-receipt image or blurry shot.
- Bot replies with an extraction-failure message; **no** new Sheet row and **no** Chat card.

## What to show vs say

| Show | Say |
|------|-----|
| Telegram thread | Capture + human approval in the messenger employees already use |
| Google Chat DM card | Same approval gate for managers who live in Chat |
| Sheet row with `telegramDisplayName` | Friendly submitter name on the system of record |
| Both UIs clearing together | One decision, both channels stay in sync |
| Approve/Reject buttons | Human gate before Sheet status changes |

## Sample receipt fields (known good)

From dry-run receipt `Receipt1.png` / Daily Grind Cafe:

- vendor: `THE DAILY GRIND CAFE`
- amount: `10.20` EUR
- category: `meals`

## Dry-run checklist

| Step | Result |
|------|--------|
| Latest `workflows/08-expense-capture-telegram.json` imported and activated locally | ☐ |
| Chat app HTTPS endpoint set to `{WEBHOOK_URL}webhook/expense-google-chat` | ☐ |
| 1:1 Chat DM opened and `GOOGLE_CHAT_DM_SPACE_ID` set only locally | ☐ |
| `/start` → help text | ✅ |
| Receipt image (no caption) → pending approval prompt (Telegram) | ✅ |
| Sheet row `pending approval` + `telegramDisplayName` | ☐ |
| Chat DM card with Approve/Reject | ☐ |
| Approve in Telegram → both UIs cleared, `approved` | ☐ |
| Second receipt → Reject in Chat → both cleared, `rejected` | ☐ |
| Late click on decided receipt → no status flip | ☐ |
| Bad image / transient AI error → clear message | ✅ |

## Notes from local runs

- Compressed Telegram **photos** and **image documents** are both supported.
- Model: `google/gemini-2.5-flash` via OpenRouter (older `gemini-2.0-flash-001` slug retired).
- Approve path proven on execution `283`. Reject path reached Sheet update; one overnight failure was DNS (`sheets.googleapis.com` ENOTFOUND) after a long wait — retry reject on a fresh run.
- Dual Chat approval requires Sheet columns `telegramApprovalMessageId`, `chatSpaceId`, `chatMessageName` — see [local provisioning checklist](./local-provisioning-checklist.md).
- The Sheet status lookup/update is the accepted first-wins gate for normal clicks, but it is not atomic under genuinely simultaneous Telegram and Chat decisions. A concurrent race is a residual demo limitation.
