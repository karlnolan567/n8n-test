const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPendingExpenseCard,
  buildFinalExpenseCard,
  decisionLinkUrl,
} = require('./chat-card.js');

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
  it('pending card uses openLink approve/reject URLs', () => {
    const msg = buildPendingExpenseCard(expense, 'https://n8n.example/');
    const card = msg.cardsV2[0].card;
    const buttons = card.sections.at(-1).widgets[0].buttonList.buttons;
    assert.equal(buttons.length, 2);
    assert.equal(
      buttons[0].onClick.openLink.url,
      'https://n8n.example/webhook/expense-chat-link?recordId=exp_1&decision=approve',
    );
    assert.equal(
      buttons[1].onClick.openLink.url,
      'https://n8n.example/webhook/expense-chat-link?recordId=exp_1&decision=reject',
    );
    assert.equal(buttons[0].onClick.action, undefined);
  });

  it('decisionLinkUrl normalizes missing trailing slash', () => {
    assert.equal(
      decisionLinkUrl('https://n8n.example', 'r1', 'reject'),
      'https://n8n.example/webhook/expense-chat-link?recordId=r1&decision=reject',
    );
  });

  it('final card has no buttons', () => {
    const msg = buildFinalExpenseCard(expense, 'APPROVED');
    const widgets = msg.cardsV2[0].card.sections.flatMap((s) => s.widgets);
    assert.ok(!widgets.some((w) => w.buttonList));
    assert.match(JSON.stringify(msg), /APPROVED/);
  });
});
