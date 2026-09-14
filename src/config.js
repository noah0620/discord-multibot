import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  botOwners: new Set((process.env.BOT_OWNER_IDS || process.env.ADMIN_USER_IDS || '').split(',').map(v => v.trim()).filter(Boolean)),
  openAiKey: process.env.OPENAI_API_KEY || '',
  openAiImageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
};

export function assertConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('DISCORD_CLIENT_ID');
  if (missing.length) throw new Error(`.env に設定が必要です: ${missing.join(', ')}`);
}
