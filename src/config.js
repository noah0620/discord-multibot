import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN?.trim(),
  clientId: process.env.DISCORD_CLIENT_ID?.trim(),
  ownerIds: (process.env.BOT_OWNER_IDS || '').split(',').map(v => v.trim()).filter(Boolean),
  dataDir: process.env.DATA_DIR?.trim() || './data',
  aiDefaultMode: process.env.AI_DEFAULT_MODE?.trim() || 'free',
  aiPaidEnabled: process.env.AI_PAID_API_ENABLED === 'true',
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() || null,
  googleApiKey: process.env.GOOGLE_API_KEY?.trim() || null,
  earthquakePollSeconds: Math.max(30, Number(process.env.EARTHQUAKE_POLL_SECONDS || 60)),
  weatherDailyHour: Math.min(23, Math.max(0, Number(process.env.WEATHER_DAILY_HOUR || 7)))
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
