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
