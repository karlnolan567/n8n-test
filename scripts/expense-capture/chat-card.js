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
