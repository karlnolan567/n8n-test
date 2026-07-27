function shouldApplyDecision(currentStatus) {
  return String(currentStatus || '') === 'pending approval';
}

module.exports = { shouldApplyDecision };
