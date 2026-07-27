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
