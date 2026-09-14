import { PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { db } from '../db/database.js';

export function isBotOwner(interaction) {
  return config.botOwners.has(interaction.user.id);
}

export function isServerAdmin(interaction) {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator));
}

export function isAdmin(interaction) {
  return isBotOwner(interaction) || isServerAdmin(interaction);
}

export async function requireAdmin(interaction) {
  if (isAdmin(interaction)) return true;
  await interaction.reply({ content: 'サーバー管理者またはBOTオーナー専用です。', ephemeral: true });
  return false;
}

export function canManageShop(interaction, shop) {
  if (!shop) return false;
  if (isBotOwner(interaction) || isServerAdmin(interaction)) return true;
  if (shop.owner_user_id === interaction.user.id) return true;
  if (shop.manager_role_id && interaction.member?.roles?.cache?.has(shop.manager_role_id)) return true;
  return false;
}

export function getShop(guildId, shopId) {
  return db.prepare('SELECT * FROM shops WHERE id=? AND guild_id=?').get(shopId, guildId);
}
