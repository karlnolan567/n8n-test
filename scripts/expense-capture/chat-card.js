function widgetText(labeledText) {
  return { textParagraph: { text: labeledText } };
}

function normalizePublicBaseUrl(publicBaseUrl) {
  const base = String(publicBaseUrl || '').trim();
  if (!base) {
    throw new Error('publicBaseUrl is required for Chat openLink buttons');
  }
  return base.endsWith('/') ? base : `${base}/`;
}

function decisionLinkUrl(publicBaseUrl, recordId, decision) {
  const base = normalizePublicBaseUrl(publicBaseUrl);
  const qs = 'recordId=' + encodeURIComponent(String(recordId))
    + '&decision=' + encodeURIComponent(String(decision));
  return `${base}webhook/expense-chat-link?${qs}`;
}

function buildPendingExpenseCard(expense, publicBaseUrl) {
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
  const approveUrl = decisionLinkUrl(publicBaseUrl, recordId, 'approve');
  const rejectUrl = decisionLinkUrl(publicBaseUrl, recordId, 'reject');
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
                          openLink: { url: approveUrl },
                        },
                      },
                      {
                        text: 'Reject',
                        onClick: {
                          openLink: { url: rejectUrl },
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

module.exports = {
  buildPendingExpenseCard,
  buildFinalExpenseCard,
  decisionLinkUrl,
  normalizePublicBaseUrl,
};
