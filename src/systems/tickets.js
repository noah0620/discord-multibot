import { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db, getSettings } from '../db/database.js';
export async function createTicket(interaction){
 const existing=db.prepare("SELECT * FROM tickets WHERE guild_id=? AND user_id=? AND status='open'").get(interaction.guildId,interaction.user.id);
 if(existing) return interaction.reply({content:`すでにチケットがあります: <#${existing.channel_id}>`,ephemeral:true});
 const s=getSettings(interaction.guildId);
 const overwrites=[{id:interaction.guild.id,deny:[PermissionFlagsBits.ViewChannel]},{id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},{id:interaction.client.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels]}];
 if(s.ticket_support_role_id) overwrites.push({id:s.ticket_support_role_id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]});
 const ch=await interaction.guild.channels.create({name:`ticket-${interaction.user.username}`.slice(0,95),type:ChannelType.GuildText,parent:s.ticket_category_id||null,permissionOverwrites:overwrites});
 db.prepare('INSERT INTO tickets(guild_id,user_id,channel_id) VALUES(?,?,?)').run(interaction.guildId,interaction.user.id,ch.id);
 await ch.send({content:`<@${interaction.user.id}> チケットを作成しました。`,components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_close').setLabel('チケットを閉じる').setStyle(ButtonStyle.Danger))]});
 await interaction.reply({content:`作成しました: ${ch}`,ephemeral:true});
}
export async function closeTicket(interaction){
 const row=db.prepare("SELECT * FROM tickets WHERE channel_id=? AND status='open'").get(interaction.channelId); if(!row) return interaction.reply({content:'チケットではありません。',ephemeral:true});
 db.prepare("UPDATE tickets SET status='closed' WHERE channel_id=?").run(interaction.channelId); await interaction.reply('5秒後にチケットを削除します。'); setTimeout(()=>interaction.channel.delete().catch(()=>{}),5000);
}
