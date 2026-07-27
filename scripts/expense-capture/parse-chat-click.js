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
