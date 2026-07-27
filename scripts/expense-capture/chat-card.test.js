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
