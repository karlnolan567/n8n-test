# Dual Telegram + Google Chat Cards Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the local expense capture workflow so Google Chat 1:1 DM Cards v2 Approve/Reject works alongside Telegram inline buttons, with first decision wins and friendly Telegram display names.

**Architecture:** Keep a single n8n workflow (`08`). Capture path appends a pending Sheet row, then fan-outs Telegram buttons + Chat card. Telegram `callback_query` and a new Chat HTTP webhook both enter a shared “decide” path that gates on Sheet `status === pending approval`, updates status, then clears both UIs. Pure JS helpers live in-repo with Node tests; matching logic is inlined into n8n Code nodes.

**Tech Stack:** n8n workflow JSON, Google Chat API Cards v2 + service account (`googleApi`), Google Sheets, Telegram Bot API, Cloudflare/ngrok public HTTPS, Node `node:test` for helpers.

**Spec:** `docs/superpowers/specs/2026-07-27-expense-google-chat-cards-approval-design.md`

## Global Constraints

- Dual approval: Telegram **and** Google Chat; either may decide.
- Chat destination: **1:1 DM** with the Chat app (not a space).
- Conflict rule: **first decision wins** via Sheet `status`.
- Chat UX: **Cards v2** `CARD_CLICKED` (not n8n Send-and-Wait browser links).
- Display name: prefer `@username`, else `first_name` + optional `last_name`; keep numeric id.
- Do not break existing Telegram capture → OCR → Sheet pending → Telegram buttons path.
- No secrets in git; Chat SA credential remains in n8n UI (`Google Chat Expense Capture`).
- Sheet id (current demo): `1rr11LMrAzXM9uwBCUlMzfdR6QCl0x7aluJQaZBP4Bo0`, tab `Sheet1`.

---

## File structure

| Path | Responsibility |
|------|----------------|
| `scripts/expense-capture/display-name.js` | Build `telegramDisplayName` from Telegram `from` |
| `scripts/expense-capture/chat-card.js` | Build pending + final Cards v2 payloads |
| `scripts/expense-capture/parse-chat-click.js` | Parse Chat `CARD_CLICKED` → `{ recordId, approved }` |
| `scripts/expense-capture/parse-decision-gate.js` | First-wins gate helper given Sheet status |
| `scripts/expense-capture/*.test.js` | Node tests for the above |
| `workflows/08-expense-capture-telegram.json` | Extended dual-approval workflow (consider rename sticky only; keep filename for continuity) |
| `docs/expense-capture/local-provisioning-checklist.md` | Chat DM space id + webhook endpoint steps |
| `docs/expense-capture/customer-demo-script.md` | Dual-channel demo steps |
| `docs/superpowers/specs/2026-07-27-expense-google-chat-cards-approval-design.md` | Spec (already written) |

---

### Task 1: Pure helpers + tests (display name, gate, chat click parse)

**Files:**
- Create: `scripts/expense-capture/display-name.js`
- Create: `scripts/expense-capture/parse-decision-gate.js`
- Create: `scripts/expense-capture/parse-chat-click.js`
- Create: `scripts/expense-capture/display-name.test.js`
- Create: `scripts/expense-capture/parse-decision-gate.test.js`
- Create: `scripts/expense-capture/parse-chat-click.test.js`

**Interfaces:**
- Produces:
  - `buildTelegramDisplayName(from: { username?: string, first_name?: string, last_name?: string, id?: number|string }): string`
  - `shouldApplyDecision(currentStatus: string): boolean` — true only when status is exactly `pending approval`
  - `parseChatCardClick(body: object): { ok: boolean, recordId?: string, approved?: boolean, error?: string }`

- [ ] **Step 1: Write failing tests**

`scripts/expense-capture/display-name.test.js`:

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildTelegramDisplayName } = require('./display-name.js');

describe('buildTelegramDisplayName', () => {
  it('prefers @username', () => {
    assert.equal(
      buildTelegramDisplayName({ id: 1, username: 'karl', first_name: 'Karl' }),
      '@karl',
    );
  });
  it('falls back to first + last', () => {
    assert.equal(
      buildTelegramDisplayName({ id: 1, first_name: 'Karl', last_name: 'Nolan' }),
      'Karl Nolan',
    );
  });
  it('falls back to first name only', () => {
    assert.equal(buildTelegramDisplayName({ id: 1, first_name: 'Karl' }), 'Karl');
  });
  it('falls back to id string', () => {
    assert.equal(buildTelegramDisplayName({ id: 7813999484 }), '7813999484');
  });
});
```

`scripts/expense-capture/parse-decision-gate.test.js`:

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { shouldApplyDecision } = require('./parse-decision-gate.js');

describe('shouldApplyDecision', () => {
  it('allows pending approval only', () => {
    assert.equal(shouldApplyDecision('pending approval'), true);
    assert.equal(shouldApplyDecision('approved'), false);
    assert.equal(shouldApplyDecision('rejected'), false);
    assert.equal(shouldApplyDecision(''), false);
  });
});
```

`scripts/expense-capture/parse-chat-click.test.js`:

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseChatCardClick } = require('./parse-chat-click.js');

describe('parseChatCardClick', () => {
  it('parses approve', () => {
    const body = {
      type: 'CARD_CLICKED',
      action: {
        actionMethodName: 'expense_decide',
        parameters: [
          { key: 'recordId', value: 'exp_abc' },
          { key: 'decision', value: 'approve' },
        ],
      },
    };
    assert.deepEqual(parseChatCardClick(body), {
      ok: true,
      recordId: 'exp_abc',
      approved: true,
    });
  });
  it('parses reject', () => {
    const body = {
      type: 'CARD_CLICKED',
      action: {
        actionMethodName: 'expense_decide',
        parameters: [
          { key: 'recordId', value: 'exp_abc' },
          { key: 'decision', value: 'reject' },
        ],
      },
    };
    assert.deepEqual(parseChatCardClick(body), {
      ok: true,
      recordId: 'exp_abc',
      approved: false,
    });
  });
  it('rejects non-card events', () => {
    const r = parseChatCardClick({ type: 'MESSAGE' });
    assert.equal(r.ok, false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (modules missing)**

```bash
node --test scripts/expense-capture/*.test.js
```

Expected: FAIL cannot find modules / exports.

- [ ] **Step 3: Implement helpers**

`scripts/expense-capture/display-name.js`:

```js
function buildTelegramDisplayName(from = {}) {
  const username = String(from.username || '').trim();
  if (username) return `@${username.replace(/^@/, '')}`;
  const first = String(from.first_name || '').trim();
  const last = String(from.last_name || '').trim();
  const full = [first, last].filter(Boolean).join(' ');
  if (full) return full;
  if (from.id !== undefined && from.id !== null && String(from.id).trim()) {
    return String(from.id);
  }
  return 'unknown';
}

module.exports = { buildTelegramDisplayName };
```

`scripts/expense-capture/parse-decision-gate.js`:

```js
function shouldApplyDecision(currentStatus) {
  return String(currentStatus || '') === 'pending approval';
}

module.exports = { shouldApplyDecision };
```

`scripts/expense-capture/parse-chat-click.js`:

```js
function paramsToObject(parameters = []) {
  const out = {};
  for (const p of parameters) {
    if (p && p.key !== undefined) out[p.key] = p.value;
  }
  return out;
}

function parseChatCardClick(body = {}) {
  if (body.type !== 'CARD_CLICKED') {
    return { ok: false, error: 'not_card_clicked' };
  }
  const action = body.action || {};
  if (action.actionMethodName !== 'expense_decide') {
    return { ok: false, error: 'unknown_action' };
  }
  const params = paramsToObject(action.parameters || []);
  const recordId = String(params.recordId || '').trim();
  const decision = String(params.decision || '').toLowerCase();
  if (!recordId || (decision !== 'approve' && decision !== 'reject')) {
    return { ok: false, error: 'invalid_params' };
  }
  return { ok: true, recordId, approved: decision === 'approve' };
}

module.exports = { parseChatCardClick, paramsToObject };
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
node --test scripts/expense-capture/*.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/expense-capture/
git commit -m "$(cat <<'EOF'
Add expense dual-approval helper functions and tests.

EOF
)"
```

---

### Task 2: Cards v2 builder helper + tests

**Files:**
- Create: `scripts/expense-capture/chat-card.js`
- Create: `scripts/expense-capture/chat-card.test.js`

**Interfaces:**
- Consumes: expense fields + `telegramDisplayName`, `recordId`
- Produces:
  - `buildPendingExpenseCard(expense): { cardsV2: [...] }`
  - `buildFinalExpenseCard(expense, statusLabel: 'APPROVED'|'REJECTED'): { cardsV2: [...] }`

- [ ] **Step 1: Write failing test**

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildPendingExpenseCard, buildFinalExpenseCard } = require('./chat-card.js');

const expense = {
  recordId: 'exp_1',
  vendor: 'Cafe',
  amount: '10.20',
  currency: 'EUR',
  date: '2023-10-15',
  category: 'meals',
  notes: 'coffee',
  telegramDisplayName: '@karl',
};

describe('chat cards', () => {
  it('pending card has approve/reject actions', () => {
    const msg = buildPendingExpenseCard(expense);
    const card = msg.cardsV2[0].card;
    const buttons = card.sections.at(-1).widgets[0].buttonList.buttons;
    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].onClick.action.function, 'expense_decide');
    const keys = buttons[0].onClick.action.parameters.map((p) => p.key);
    assert.deepEqual(keys.sort(), ['decision', 'recordId'].sort());
  });
  it('final card has no buttons', () => {
    const msg = buildFinalExpenseCard(expense, 'APPROVED');
    const widgets = msg.cardsV2[0].card.sections.flatMap((s) => s.widgets);
    assert.ok(!widgets.some((w) => w.buttonList));
    assert.match(JSON.stringify(msg), /APPROVED/);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node --test scripts/expense-capture/chat-card.test.js
```

- [ ] **Step 3: Implement `chat-card.js`**

```js
function widgetText(labeledText) {
  return { textParagraph: { text: labeledText } };
}

function buildPendingExpenseCard(expense) {
  const {
    recordId,
    vendor,
    amount,
    currency,
    date,
    category,
    notes,
    telegramDisplayName,
  } = expense;
  return {
    cardsV2: [
      {
        cardId: `expense-${recordId}`,
        card: {
          header: {
            title: 'Expense pending approval',
            subtitle: String(telegramDisplayName || ''),
          },
          sections: [
            {
              widgets: [
                widgetText(`<b>Vendor:</b> ${vendor || ''}`),
                widgetText(`<b>Amount:</b> ${amount || ''} ${currency || ''}`),
                widgetText(`<b>Date:</b> ${date || ''}`),
                widgetText(`<b>Category:</b> ${category || ''}`),
                widgetText(`<b>Notes:</b> ${notes || ''}`),
                widgetText(`<b>recordId:</b> ${recordId || ''}`),
              ],
            },
            {
              widgets: [
                {
                  buttonList: {
                    buttons: [
                      {
                        text: 'Approve',
                        onClick: {
                          action: {
                            function: 'expense_decide',
                            parameters: [
                              { key: 'recordId', value: String(recordId) },
                              { key: 'decision', value: 'approve' },
                            ],
                          },
                        },
                      },
                      {
                        text: 'Reject',
                        onClick: {
                          action: {
                            function: 'expense_decide',
                            parameters: [
                              { key: 'recordId', value: String(recordId) },
                              { key: 'decision', value: 'reject' },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

function buildFinalExpenseCard(expense, statusLabel) {
  const { recordId, vendor, amount, currency, telegramDisplayName } = expense;
  return {
    cardsV2: [
      {
        cardId: `expense-${recordId}`,
        card: {
          header: {
            title: `Expense ${statusLabel}`,
            subtitle: String(telegramDisplayName || ''),
          },
          sections: [
            {
              widgets: [
                widgetText(`<b>Vendor:</b> ${vendor || ''}`),
                widgetText(`<b>Amount:</b> ${amount || ''} ${currency || ''}`),
                widgetText(`<b>recordId:</b> ${recordId || ''}`),
                widgetText(`<b>Status:</b> ${statusLabel}`),
              ],
            },
          ],
        },
      },
    ],
  };
}

module.exports = { buildPendingExpenseCard, buildFinalExpenseCard };
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
node --test scripts/expense-capture/*.test.js
```

- [ ] **Step 5: Commit**

```bash
git add scripts/expense-capture/chat-card.js scripts/expense-capture/chat-card.test.js
git commit -m "$(cat <<'EOF'
Add Google Chat Cards v2 builders for expense approval.

EOF
)"
```

---

### Task 3: Sheet header columns + docs for dual-approval fields

**Files:**
- Modify: `docs/expense-capture/local-provisioning-checklist.md`
- Modify: `docs/expense-capture/customer-demo-script.md`

**Interfaces:**
- Produces: documented Sheet columns list matching workflow mapping

Required Sheet header columns (row 1), additive to existing:

`recordId`, `date`, `vendor`, `amount`, `currency`, `tax`, `category`, `notes`, `status`, `capturedAt`, `telegramUser`, `telegramDisplayName`, `telegramUserId`, `telegramChatId`, `telegramApprovalMessageId`, `chatSpaceId`, `chatMessageName`

- [ ] **Step 1: Update provisioning checklist**

Add a subsection under Google Sheet / Google Chat:

- Exact header list above
- Chat app HTTPS endpoint path to use:  
  `{WEBHOOK_URL}webhook/expense-google-chat/webhook`  
  (final path must match the Webhook node path created in Task 5)
- Record `GOOGLE_CHAT_DM_SPACE_ID` (e.g. `spaces/AAAA…`) after opening 1:1 DM — store in n8n workflow static/env note or Sheet config cell documented in checklist (recommend workflow sticky + optional env `EXPENSE_CHAT_DM_SPACE_ID` only if already using env pattern; otherwise sticky + Code constant updated locally, **not committed secrets** — space id is OK to commit if non-sensitive; treat as config in checklist)

- [ ] **Step 2: Update customer demo script**

Add steps:

1. Send receipt in Telegram  
2. Show Sheet pending row including `telegramDisplayName`  
3. Show Telegram buttons **and** Chat DM card  
4. Approve in one channel; confirm other channel clears  
5. Repeat with Reject on the other channel for a second receipt  

- [ ] **Step 3: Manually add missing headers** to the live demo Sheet (operator step; not git)

- [ ] **Step 4: Commit docs**

```bash
git add docs/expense-capture/local-provisioning-checklist.md docs/expense-capture/customer-demo-script.md
git commit -m "$(cat <<'EOF'
Document Sheet columns and dual-channel demo steps for Chat Cards.

EOF
)"
```

---

### Task 4: Workflow — display name + richer pending append

**Files:**
- Modify: `workflows/08-expense-capture-telegram.json` (nodes `Prep Image + Meta`, `Parse Extraction`, `Append Pending Row`, `Send Approval Buttons`)

**Interfaces:**
- Consumes: `buildTelegramDisplayName` behavior (inline equivalent in Prep Code)
- Produces: Parse Extraction JSON includes `telegramDisplayName`, `telegramUserId`, `telegramChatId`

- [ ] **Step 1: Update `Prep Image + Meta` jsCode** to set:

```js
const displayName = (() => {
  const username = String(from.username || '').trim();
  if (username) return '@' + username.replace(/^@/, '');
  const full = [from.first_name, from.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  return String(from.id || 'unknown');
})();
// include in returned json:
// telegramDisplayName: displayName,
// telegramUserId: String(from.id || ''),
// telegramUser: displayName + ' / ' + String(from.id || ''),
```

Keep existing `chatId` as `telegramChatId` as well (`telegramChatId: chatId`).

- [ ] **Step 2: Pass fields through `Parse Extraction` success payload** unchanged names.

- [ ] **Step 3: Extend `Append Pending Row` column mapping** for new fields (empty strings OK for message ids / chat ids not yet known):

Map: `telegramDisplayName`, `telegramUserId`, `telegramChatId`, and placeholders `telegramApprovalMessageId=''`, `chatSpaceId=''`, `chatMessageName=''`.

- [ ] **Step 4: Update `Send Approval Buttons` text** to include display name line:

`submitter: {{ $('Parse Extraction').item.json.telegramDisplayName }}`

- [ ] **Step 5: Import workflow to local n8n, activate, smoke `/start` + send small receipt**

Expected: Sheet row includes display name; Telegram approval text shows submitter.

- [ ] **Step 6: Commit**

```bash
git add workflows/08-expense-capture-telegram.json
git commit -m "$(cat <<'EOF'
Add telegramDisplayName fields to expense capture Sheet append.

EOF
)"
```

---

### Task 5: Persist Telegram approval message id after send

**Files:**
- Modify: `workflows/08-expense-capture-telegram.json`

**Interfaces:**
- After `Send Approval Buttons`, Sheets **Update** matching `recordId` sets `telegramApprovalMessageId` from Telegram send result `result.message_id` (and confirm `telegramChatId`).

- [ ] **Step 1: Add node `Save Telegram Approval Message`** (Google Sheets update)

- Match column: `recordId` = `$('Parse Extraction').item.json.recordId`
- Set:
  - `telegramApprovalMessageId` = `={{ String($json.result.message_id) }}`
  - `telegramChatId` = `={{ String($('Parse Extraction').item.json.telegramChatId || $('Parse Extraction').item.json.chatId) }}`

- [ ] **Step 2: Rewire** `Send Approval Buttons` → `Save Telegram Approval Message` → (next Chat send node from Task 6, or End until Task 6)

- [ ] **Step 3: Manual test** — send receipt; confirm Sheet message id filled; Approve still clears buttons.

- [ ] **Step 4: Commit**

```bash
git add workflows/08-expense-capture-telegram.json
git commit -m "$(cat <<'EOF'
Persist Telegram approval message id for cross-channel clear.

EOF
)"
```

---

### Task 6: Send Google Chat pending Cards v2 to 1:1 DM

**Files:**
- Modify: `workflows/08-expense-capture-telegram.json`
- Modify: `docs/expense-capture/local-provisioning-checklist.md` (space id instructions if not done)

**Interfaces:**
- Consumes: pending card JSON shape from Task 2
- Produces: Sheet `chatSpaceId`, `chatMessageName` populated

- [ ] **Step 1: Add Code node `Build Chat Pending Card`** inlining `buildPendingExpenseCard(...)` using Parse Extraction fields.

- [ ] **Step 2: Add HTTP Request `Post Chat Card`**

- Method `POST`
- URL: `https://chat.googleapis.com/v1/{{ $json.spaceId }}/messages`  
  where `spaceId` comes from workflow config (sticky-documented constant in a tiny Code/Set node `Chat DM Config` with `spaceId: "spaces/YOUR_DM_SPACE"` — operator fills locally).
- Auth: predefined credential type for Google service account used by Chat (`googleApi` / credential `Google Chat Expense Capture`). If HTTP Request cannot attach SA Chat scopes cleanly, use **Google Chat** node with **JSON parameters** / raw message body if available; otherwise HTTP + SA credential with Chat scope `https://www.googleapis.com/auth/chat.bot`.
- Body: output of Build Chat Pending Card (`cardsV2`).

- [ ] **Step 3: Add Sheets update `Save Chat Message Ref`**

From Chat API response (`name` like `spaces/AAA/messages/BBB`):

- `chatSpaceId` = space portion
- `chatMessageName` = full `name`

- [ ] **Step 4: Wire** after Save Telegram Approval Message → Build Card → Post Chat → Save Chat Message Ref.

- [ ] **Step 5: Provision**

1. Ensure Chat app endpoint reachable (can still be stub until Task 7).  
2. Open 1:1 DM with app; put space id into `Chat DM Config`.  
3. Send test receipt; confirm card appears in Chat DM.

- [ ] **Step 6: Commit** (do not commit a personal space id if you consider it private; prefer empty placeholder `spaces/REPLACE_ME` in exported JSON + checklist)

```bash
git add workflows/08-expense-capture-telegram.json docs/expense-capture/local-provisioning-checklist.md
git commit -m "$(cat <<'EOF'
Send Google Chat Cards v2 pending approval to configured DM space.

EOF
)"
```

---

### Task 7: Google Chat webhook handshake + CARD_CLICKED parse

**Files:**
- Modify: `workflows/08-expense-capture-telegram.json`
- Modify: `docs/expense-capture/local-provisioning-checklist.md`

**Interfaces:**
- Produces webhook path `expense-google-chat` responding to Chat events
- Consumes: `parseChatCardClick`

Google Chat app verification often sends URL check challenges — implement:

- If body has `type === 'MESSAGE'` and is a simple added/ping, return `{ text: 'Expense approval bot ready' }` (or empty 200 as required by current Chat app config).
- If `type === 'CARD_CLICKED'`, parse via inlined `parseChatCardClick`.
- Always return a Chat-compatible JSON response quickly (e.g. empty `{}` or text ack). For decisions, prefer updating the message via API asynchronously in-workflow rather than only response body.

- [ ] **Step 1: Add Webhook node** `Google Chat Events`

- Path: `expense-google-chat`
- Method: POST
- Response mode: last node / response node as appropriate for Chat’s 30s expectation — prefer **Respond to Webhook** early with `{ "text": "…" }` then continue, **or** respond at end with final private text.

- [ ] **Step 2: Code `Route Chat Event`**

```js
const body = $input.first().json;
if (body.type === 'CARD_CLICKED') {
  // inline parseChatCardClick
}
if (body.type === 'MESSAGE') {
  return [{ json: { kind: 'handshake', reply: { text: 'Expense bot online. Approvals arrive as cards.' } } }];
}
return [{ json: { kind: 'ignore' } }];
```

- [ ] **Step 3: Point Chat app HTTPS endpoint** to  
  `https://<tunnel>/webhook/expense-google-chat`  
  (confirm trailing path vs n8n’s `/webhook/...` convention used by Telegram trigger). Save in GCP Chat API config; restart tunnel docs note.

- [ ] **Step 4: Verify handshake** — message the Chat app; get bot reply / 200 without errors in Chat API logs.

- [ ] **Step 5: Commit**

```bash
git add workflows/08-expense-capture-telegram.json docs/expense-capture/
git commit -m "$(cat <<'EOF'
Add Google Chat webhook handshake and CARD_CLICKED routing.

EOF
)"
```

---

### Task 8: Shared decide path (first wins) + clear both UIs

**Files:**
- Modify: `workflows/08-expense-capture-telegram.json`

**Interfaces:**
- Consumes: Sheet row by `recordId`, `shouldApplyDecision`, final card builder
- Entry points: Telegram `Parse Callback` success **and** Chat `CARD_CLICKED` parse success

Refactor Telegram-only decide into shared sequence:

1. **Lookup Pending Row** (Sheets read/get rows filtered by `recordId`)
2. **Code `Gate Decision`** using `shouldApplyDecision(status)`
3. False branch:
   - Telegram late: `answerCallbackQuery` text “Already decided”
   - Chat late: Respond / update card text “Already decided”
4. True branch:
   - Sheets update status approved/rejected
   - Telegram: edit message clear buttons (use Sheet `telegramChatId` + `telegramApprovalMessageId` when decision came from Chat; when from Telegram callback, existing message ids still work)
   - Chat: `PATCH https://chat.googleapis.com/v1/{{chatMessageName}}?updateMask=cardsV2` with `buildFinalExpenseCard`
   - Telegram-origin: `answerCallbackQuery` Approved/Rejected

- [ ] **Step 1: Implement Lookup + Gate nodes** and rewire Telegram Approved?/Mark path through them **before** Mark Approved/Rejected.

- [ ] **Step 2: Change Disable Buttons nodes** to prefer:

`chatId/messageId` from Sheet lookup fields when present, else Parse Callback fields.

- [ ] **Step 3: Add Chat final card update nodes** on both approve/reject success paths.

- [ ] **Step 4: Wire Chat CARD_CLICKED success into the same Lookup → Gate → Mark → clear both path.**

- [ ] **Step 5: Manual dual-channel tests**

| # | Action | Expected |
|---|--------|----------|
| A | Approve in Telegram | Sheet approved; Telegram buttons gone; Chat card final |
| B | New receipt; Approve in Chat | Sheet approved; Chat final; Telegram buttons gone |
| C | After A/B, click other channel | No status flip; already-decided ack |
| D | Reject path once each channel | status rejected; both UIs cleared |

- [ ] **Step 6: Commit**

```bash
git add workflows/08-expense-capture-telegram.json
git commit -m "$(cat <<'EOF'
Implement first-wins dual approval clearing Telegram and Chat UIs.

EOF
)"
```

---

### Task 9: Dry-run polish + PR

**Files:**
- Modify: `docs/expense-capture/customer-demo-script.md` checklist boxes
- Possibly rename sticky note in workflow to mention dual approval

- [ ] **Step 1: Run full demo script once; tick checklist in docs**

- [ ] **Step 2: Ensure workflow export in git matches activated local workflow**

```bash
# export or re-copy canonical JSON after UI tweaks if any
```

- [ ] **Step 3: Commit + push + open PR**

```bash
git add docs/expense-capture/ workflows/08-expense-capture-telegram.json scripts/expense-capture/
git commit -m "$(cat <<'EOF'
Finish dual-channel expense approval dry-run docs.

EOF
)" || true
git push -u origin HEAD
gh pr create --title "Add Google Chat Cards v2 dual approval for expenses" --body "$(cat <<'EOF'
## Summary
- Dual approval: Telegram inline buttons + Google Chat Cards v2 in 1:1 DM
- First decision wins via Sheet status
- Friendly `telegramDisplayName` on Sheet and both UIs

## Spec
- `docs/superpowers/specs/2026-07-27-expense-google-chat-cards-approval-design.md`

## Test plan
- [ ] Receipt → pending row → Telegram buttons + Chat card
- [ ] Approve Telegram → both UIs finalized; Sheet approved
- [ ] Approve Chat → both UIs finalized; Sheet approved
- [ ] Late click ignored
- [ ] Display name visible on card and Telegram message

EOF
)"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Dual Telegram + Chat Cards v2 | 6, 7, 8 |
| 1:1 DM | 6 + provisioning docs |
| First wins | 1 (`shouldApplyDecision`), 8 |
| Display name | 1, 4 |
| Persist ids for cross-clear | 5, 6 |
| Clear both UIs | 8 |
| Late click behavior | 8 |
| Provisioning / tunnel notes | 3, 7, 9 |
| Non-goals respected | No spaces, no Send-and-Wait links |

## Placeholder scan

No TBD/TODO/implement-later left in task steps.

---
