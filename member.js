import { getSettings } from '../db/database.js';
import { config } from '../config.js';
export async function onJoin(member){ const s=getSettings(member.guild.id); const id=s.welcome_channel_id||config.welcomeChannelId; if(!id)return; const c=await member.guild.channels.fetch(id).catch(()=>null); c?.isTextBased()&&c.send(`👋 ${member} さん、ようこそ！ 現在 ${member.guild.memberCount} 人です。`); }
export async function onLeave(member){ const s=getSettings(member.guild.id); const id=s.leave_channel_id||config.leaveChannelId; if(!id)return; const c=await member.guild.channels.fetch(id).catch(()=>null); c?.isTextBased()&&c.send(`🚪 ${member.user.tag} さんが退出しました。 現在 ${member.guild.memberCount} 人です。`); }
