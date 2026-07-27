# Dual approval: Telegram + Google Chat Cards v2

**Date:** 2026-07-27  
**Status:** Draft for review  
**Branch:** `feature/expense-google-chat-cards-approval`  
**Extends:** local expense capture demo (`workflows/08-expense-capture-telegram.json`, map #21 closed)

## Problem

The local demo already supports Telegram capture and **in-chat** Approve/Reject (inline buttons, no browser). We want a second approval channel in **Google Chat** with the **same tap-in-app UX**, not n8n Send-and-Wait browser resume links.

## Goals

- Keep Telegram as Capture Channel and as an approval UI (unchanged happy path).
- Add Google Chat **1:1 DM** approval via **Cards v2** buttons (`CARD_CLICKED`).
- **First decision wins** (Sheet `status` is source of truth).
- Show a friendly **Telegram display name** (not only numeric id) on approval UIs and the Sheet.

## Non-goals

- Google Chat **spaces** / Workspace-only space membership.
- Native Cards v2 beyond Approve/Reject for this demo.
- Multi-approver / escalation.
- Editing extracted fields before Sheet write.
- Replacing Telegram capture.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Dual vs replace | **Dual** — Telegram buttons **and** Chat card; either can decide |
| Chat destination | **1:1 DM** with the Chat app (personal Gmail-compatible) |
| Conflict rule | **First decision wins**; later actions ignored |
| Chat UX | **Cards v2** in-Chat buttons (Telegram parity) — not Send-and-Wait links |
| Display name | Derive `telegramDisplayName` from `message.from` at capture |

## User-visible flow

1. Allowlisted Telegram user sends a receipt photo/image file.
2. OpenRouter extracts fields; Sheet row appended with `status = pending approval`.
3. Fan-out:
   - Telegram: message with inline Approve / Reject (as today).
   - Google Chat DM: Cards v2 card with expense summary + Approve / Reject.
4. On either Approve or Reject:
   - If Sheet status is still `pending approval` → update to `approved` / `rejected`.
   - Clear/disable **both** UIs (Telegram edit removes buttons; Chat card updated to final status without buttons).
   - If Sheet already decided → no status change; acknowledge “already decided” on the channel that clicked late.

## Display name

At capture, from Telegram `message.from`:

- Prefer `@username` when present.
- Else `first_name` + optional `last_name`.
- Always retain numeric `telegramUserId` separately.

Store and show e.g. `@karl` or `Karl Nolan` on:

- Google Chat card header/subtitle
- Telegram approval message
- Sheet column `telegramDisplayName` (keep existing `telegramUser` or replace with clearer columns — see Data)

## Architecture

```text
Telegram Trigger (message | callback_query)
        │
        ├─ callback_query ──► Parse action + recordId ──► Decide (shared)
        │
        └─ message/photo ──► OCR ──► Sheets append pending
                                      │
                                      ├─ Send Telegram approval buttons
                                      └─ Send Google Chat Cards v2 (1:1 DM)

Google Chat HTTP webhook (CARD_CLICKED [+ handshake])
        │
        └─ Parse action + recordId ──► Decide (shared)

Decide (shared):
  Read Sheet row by recordId
  If status != pending approval → late-click ack; stop
  Else update status; clear Telegram buttons; update Chat card
```

### Components

1. **Extend workflow `08`** (preferred over a second workflow) so Sheet updates stay one path.
2. **Google Chat app HTTPS endpoint** → n8n Webhook (same public tunnel host as Telegram).
3. **Credential:** existing service account `Google Chat Expense Capture`.
4. **Idempotency:** Sheet `status === pending approval` gate before mutation.

### Cross-channel clear (required data)

When one channel wins, the other must be updated. Persist on the Sheet row (or equivalent):

| Field | Purpose |
|-------|---------|
| `recordId` | Existing match key |
| `telegramDisplayName` | Friendly name |
| `telegramUserId` | Numeric id |
| `telegramChatId` | Edit Telegram approval message |
| `telegramApprovalMessageId` | Edit Telegram approval message |
| `chatSpaceId` | Update Chat card (`spaces/…`) |
| `chatMessageName` | Chat message resource name for patch/update |

After sending each approval UI, **update the same Sheet row** with the message ids (or write them on append if known — typically patch after send).

## Google Chat card (minimal)

- Header: Expense pending approval  
- Sections: vendor, amount, currency, date, category, notes, `recordId`, submitter `telegramDisplayName`  
- Buttons: Approve / Reject with `action` + parameters carrying `recordId` and decision  
- On finalization: replace card content with status line; **no buttons**

## Provisioning prerequisites

- Chat app interactive features enabled; HTTPS endpoint = n8n webhook URL on current tunnel.
- User has opened a **1:1 DM** with the Chat app at least once (required to resolve DM space id).
- Document how to capture `chatSpaceId` for the demo user (manual once, or discover via Chat API on first DM).

## Error / edge cases

- OpenRouter transient failures: keep existing retry + Telegram error reply; **no** Chat card if Sheet row not written.
- Tunnel URL rotation: Chat app endpoint must be updated when Cloudflare URL changes (same operational pain as today).
- Late click after first win: no Sheet overwrite; user-visible “already decided”.
- Missing DM space: fail Chat send with clear n8n error; Telegram approval still works.

## Success criteria

- [ ] Receipt in Telegram → pending Sheet row → Telegram buttons **and** Chat card in 1:1 DM  
- [ ] Approve in Chat → Sheet `approved`; both UIs show final status without buttons  
- [ ] Approve in Telegram → same  
- [ ] Second click on the other channel does not flip status  
- [ ] Chat card and Telegram message show `telegramDisplayName`  

## Out of scope reminders

- Cards v2 beyond this demo’s Approve/Reject  
- Hosted/production n8n deployment (can follow in a later map)
