import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN?.trim(),
  clientId: process.env.DISCORD_CLIENT_ID?.trim(),
  ownerIds: (process.env.BOT_OWNER_IDS || '').split(',').map(v => v.trim()).filter(Boolean),
  dataDir: process.env.DATA_DIR?.trim() || './data',
  earthquakePollSeconds: Math.max(5, Number(process.env.EARTHQUAKE_POLL_SECONDS || 5))
};

export function assertConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('DISCORD_CLIENT_ID');
  if (missing.length) throw new Error(`.env に設定が必要です: ${missing.join(', ')}`);
}
export function isBotOwner(userId) {
  return config.ownerIds.includes(userId);
}
