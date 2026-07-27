# Expense Capture Demo

Domain language for the customer-demoable expense photo → structured sheet path.

## Language

**Expense Photo**:
An image of a receipt or other expense document, sent in for extraction.
_Avoid_: attachment, upload, scan (unless meaning a multi-page device scan)

**Expense Record**:
The structured fields extracted from an Expense Photo and written as one row in the sheet. Fixed columns: recordId, date, vendor, amount, currency, tax, category, notes, status, capturedAt, telegramUser, telegramDisplayName, telegramUserId, telegramChatId, telegramApprovalMessageId, chatSpaceId, chatMessageName. `recordId` correlates the Sheet row with the Approval Request.
_Avoid_: CSV row, transaction, entry

**Capture Channel**:
How an Expense Photo enters the system. For this effort: Telegram.
_Avoid_: app, client, frontend (unless distinguishing a future native app)

**Expense Record Status**:
Lifecycle of an Expense Record in the sheet. Starts as pending approval; becomes approved or rejected when a human confirms in Telegram or Google Chat.
_Avoid_: state, workflow status (unless referring to n8n execution state)

**Approval Request**:
A paired Telegram inline-button message and Google Chat Cards v2 message asking a human to accept or reject a pending Expense Record. The Chat card is delivered as a **1:1 DM with the Chat app** (personal Gmail cannot use spaces); either channel can make the first decision.
_Avoid_: notification, alert, ping; space (unless on Google Workspace later)

**Allowed Submitter**:
A Telegram user permitted to send Expense Photos. Development uses a single allowlisted account.
_Avoid_: bot user, chat member (unless referring to Google Chat space membership)
