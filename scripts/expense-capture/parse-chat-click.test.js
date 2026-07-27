const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseChatCardClick } = require('./parse-chat-click.js');

describe('parseChatCardClick', () => {
  it('parses approve from the legacy actionMethodName payload', () => {
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
  it('parses reject from a Cards v2 invokedFunction payload', () => {
    const body = {
      type: 'CARD_CLICKED',
      common: {
        invokedFunction: 'expense_decide',
      },
      action: {
        parameters: [
          { key: 'recordId', value: 'exp_v2' },
          { key: 'decision', value: 'reject' },
        ],
      },
    };
    assert.deepEqual(parseChatCardClick(body), {
      ok: true,
      recordId: 'exp_v2',
      approved: false,
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
  it('rejects unknown card actions', () => {
    const r = parseChatCardClick({
      type: 'CARD_CLICKED',
      common: { invokedFunction: 'other_action' },
    });
    assert.deepEqual(r, { ok: false, error: 'unknown_action' });
  });
});
