
import "dotenv/config";
import {REST, Routes, SlashCommandBuilder, PermissionFlagsBits} from "discord.js";

const token=process.env.DISCORD_TOKEN, clientId=process.env.DISCORD_CLIENT_ID;
if(!token||!clientId) throw new Error("DISCORD_TOKEN / DISCORD_CLIENT_ID が未設定です");

const commands=[
new SlashCommandBuilder().setName("help").setDescription("BOTの機能一覧"),
new SlashCommandBuilder().setName("weather").setDescription("天気予報")
  .addStringOption(o=>o.setName("region").setDescription("都道府県・県庁所在地").setAutocomplete(true).setRequired(true)),
new SlashCommandBuilder().setName("weather-register").setDescription("天気通知地域を登録")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption(o=>o.setName("region").setDescription("都道府県・県庁所在地").setAutocomplete(true).setRequired(true)),
new SlashCommandBuilder().setName("earthquake").setDescription("最新地震情報"),
new SlashCommandBuilder().setName("earthquake-register").setDescription("地震通知地域を登録")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption(o=>o.setName("region").setDescription("都道府県・県庁所在地").setAutocomplete(true).setRequired(true))
  .addIntegerOption(o=>o.setName("min_intensity").setDescription("最低震度").setMinValue(1).setMaxValue(7)),
new SlashCommandBuilder().setName("role-panel").setDescription("ロール選択パネル")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addRoleOption(o=>o.setName("role").setDescription("付与ロール").setRequired(true))
  .addStringOption(o=>o.setName("label").setDescription("表示名").setRequired(true))
  .addStringOption(o=>o.setName("emoji").setDescription("絵文字")),
new SlashCommandBuilder().setName("schedule-post").setDescription("予約投稿")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addChannelOption(o=>o.setName("channel").setDescription("投稿先").setRequired(true))
  .addStringOption(o=>o.setName("datetime").setDescription("例 2026-09-15 20:00").setRequired(true))
  .addStringOption(o=>o.setName("message").setDescription("本文").setRequired(true))
  .addIntegerOption(o=>o.setName("delete_after_minutes").setDescription("投稿後削除までの分").setMinValue(1)),
new SlashCommandBuilder().setName("schedule-list").setDescription("予約投稿一覧").setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
new SlashCommandBuilder().setName("schedule-cancel").setDescription("予約投稿削除")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption(o=>o.setName("id").setDescription("予約ID").setRequired(true)),
new SlashCommandBuilder().setName("moderation-rule").setDescription("指定発言への自動処理")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addStringOption(o=>o.setName("keyword").setDescription("検知語句").setRequired(true))
  .addStringOption(o=>o.setName("action").setDescription("処理").setRequired(true).addChoices(
    {name:"削除",value:"delete"},{name:"タイムアウト",value:"timeout"},{name:"Kick",value:"kick"},{name:"BAN",value:"ban"}
  )),
new SlashCommandBuilder().setName("play").setDescription("音楽URLを再生キューへ追加")
  .addStringOption(o=>o.setName("url").setDescription("直接再生可能な音声URL").setRequired(true)),
new SlashCommandBuilder().setName("queue").setDescription("音楽キュー"),
new SlashCommandBuilder().setName("skip").setDescription("スキップ"),
new SlashCommandBuilder().setName("stop").setDescription("停止"),
new SlashCommandBuilder().setName("ai-image").setDescription("AI画像生成")
  .addStringOption(o=>o.setName("prompt").setDescription("生成内容").setRequired(true))
  .addStringOption(o=>o.setName("quality").setDescription("モード").addChoices({name:"無料優先",value:"free"},{name:"高精度API",value:"high"})),
new SlashCommandBuilder().setName("ai-video").setDescription("AI動画生成")
  .addStringOption(o=>o.setName("prompt").setDescription("生成内容").setRequired(true))
  .addStringOption(o=>o.setName("quality").setDescription("モード").addChoices({name:"無料優先",value:"free"},{name:"高精度API",value:"high"}))
];

const rest=new REST({version:"10"}).setToken(token);
await rest.put(Routes.applicationCommands(clientId),{body:commands.map(c=>c.toJSON())});
console.log(`登録完了: ${commands.length} commands`);
