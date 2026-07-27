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
