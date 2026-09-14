import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

export const commandData = [
  new SlashCommandBuilder().setName('help').setDescription('BOTの機能一覧を表示'),
  new SlashCommandBuilder().setName('owner-status').setDescription('BOTオーナー判定を確認'),

  new SlashCommandBuilder().setName('shop-create').setDescription('自分の自動販売機を作成')
    .addStringOption(o=>o.setName('name').setDescription('自動販売機名').setRequired(true))
    .addRoleOption(o=>o.setName('manager_role').setDescription('管理ロール'))
    .addChannelOption(o=>o.setName('order_channel').setDescription('注文通知先').addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder().setName('shop-list').setDescription('このサーバーの自動販売機一覧'),
  new SlashCommandBuilder().setName('shop-config').setDescription('自動販売機設定')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自販機ID').setRequired(true))
    .addRoleOption(o=>o.setName('manager_role').setDescription('管理ロール'))
    .addChannelOption(o=>o.setName('order_channel').setDescription('注文通知先').addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder().setName('product-add').setDescription('自動販売機に商品追加')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自販機ID').setRequired(true))
    .addStringOption(o=>o.setName('name').setDescription('商品名').setRequired(true))
    .addIntegerOption(o=>o.setName('price').setDescription('単価').setRequired(true).setMinValue(0))
    .addIntegerOption(o=>o.setName('stock').setDescription('在庫').setRequired(true).setMinValue(0))
    .addStringOption(o=>o.setName('delivery').setDescription('購入完了後DM内容').setRequired(true)),
  new SlashCommandBuilder().setName('shop-panel').setDescription('販売パネル設置')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自販機ID').setRequired(true)),

  new SlashCommandBuilder().setName('verify-panel').setDescription('認証パネル')
    .addRoleOption(o=>o.setName('role').setDescription('認証後付与ロール').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('role-panel').setDescription('最大5ロールの選択パネル')
    .addRoleOption(o=>o.setName('role1').setDescription('ロール1').setRequired(true))
    .addStringOption(o=>o.setName('label1').setDescription('表示名1').setRequired(true))
    .addRoleOption(o=>o.setName('role2').setDescription('ロール2'))
    .addStringOption(o=>o.setName('label2').setDescription('表示名2'))
    .addRoleOption(o=>o.setName('role3').setDescription('ロール3'))
    .addStringOption(o=>o.setName('label3').setDescription('表示名3'))
    .addRoleOption(o=>o.setName('role4').setDescription('ロール4'))
    .addStringOption(o=>o.setName('label4').setDescription('表示名4'))
    .addRoleOption(o=>o.setName('role5').setDescription('ロール5'))
    .addStringOption(o=>o.setName('label5').setDescription('表示名5'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder().setName('ticket-panel').setDescription('チケット作成パネル')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder().setName('autoreply-add').setDescription('自動返信追加')
    .addStringOption(o=>o.setName('keyword').setDescription('キーワード').setRequired(true))
    .addStringOption(o=>o.setName('reply').setDescription('返信内容').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('autoreply-remove').setDescription('自動返信削除')
    .addStringOption(o=>o.setName('keyword').setDescription('キーワード').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('guild-settings').setDescription('通知先を設定')
    .addChannelOption(o=>o.setName('join_log').setDescription('参加通知').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(o=>o.setName('leave_log').setDescription('退出通知').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(o=>o.setName('earthquake').setDescription('地震通知').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(o=>o.setName('weather').setDescription('天気通知').addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('weather').setDescription('都道府県・県庁所在地の天気')
    .addStringOption(o=>o.setName('region').setDescription('地域').setAutocomplete(true).setRequired(true)),
  new SlashCommandBuilder().setName('weather-register').setDescription('自動天気通知地域を追加')
    .addStringOption(o=>o.setName('region').setDescription('地域').setAutocomplete(true).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('weather-list').setDescription('登録済み天気地域')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('weather-auto').setDescription('毎日の自動天気投稿をON/OFF')
    .addBooleanOption(o=>o.setName('enabled').setDescription('ON/OFF').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('earthquake').setDescription('最新地震情報'),
  new SlashCommandBuilder().setName('earthquake-register').setDescription('地震通知地域を追加')
    .addStringOption(o=>o.setName('region').setDescription('地域').setAutocomplete(true).setRequired(true))
    .addIntegerOption(o=>o.setName('min_intensity').setDescription('最低震度 1〜7').setMinValue(1).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('earthquake-list').setDescription('登録済み地震地域')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('earthquake-auto').setDescription('自動地震速報ON/OFF')
    .addBooleanOption(o=>o.setName('enabled').setDescription('ON/OFF').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('schedule-post').setDescription('予約投稿')
    .addChannelOption(o=>o.setName('channel').setDescription('投稿先').setRequired(true).addChannelTypes(ChannelType.GuildText))
    .addStringOption(o=>o.setName('datetime').setDescription('例 2026-09-15 20:00').setRequired(true))
    .addStringOption(o=>o.setName('message').setDescription('本文').setRequired(true))
    .addIntegerOption(o=>o.setName('delete_after_minutes').setDescription('投稿後に削除する分数').setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName('schedule-list').setDescription('予約投稿一覧')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName('schedule-cancel').setDescription('予約投稿削除')
    .addIntegerOption(o=>o.setName('id').setDescription('予約ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder().setName('moderation-rule').setDescription('指定発言への自動処理ルール')
    .addStringOption(o=>o.setName('keyword').setDescription('検知語句').setRequired(true))
    .addStringOption(o=>o.setName('action').setDescription('処理').setRequired(true).addChoices(
      {name:'削除',value:'delete'},{name:'タイムアウト',value:'timeout'},{name:'Kick',value:'kick'},{name:'BAN',value:'ban'}
    ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('moderation-list').setDescription('自動処理ルール一覧')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('moderation-remove').setDescription('自動処理ルール削除')
    .addIntegerOption(o=>o.setName('id').setDescription('ルールID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder().setName('play').setDescription('直接音声URLをVCキューへ追加')
    .addStringOption(o=>o.setName('url').setDescription('直接再生可能な音声URL').setRequired(true)),
  new SlashCommandBuilder().setName('queue').setDescription('音楽キュー'),
  new SlashCommandBuilder().setName('skip').setDescription('現在曲をスキップ'),
  new SlashCommandBuilder().setName('stop').setDescription('音楽停止'),

  new SlashCommandBuilder().setName('ai-image').setDescription('Google APIでAI画像を生成')
    .addStringOption(o=>o.setName('prompt').setDescription('生成内容').setRequired(true))
    .addStringOption(o=>o.setName('aspect').setDescription('画像比率').addChoices(
      {name:'1:1',value:'1:1'},{name:'16:9',value:'16:9'},{name:'9:16',value:'9:16'}
    )),
  new SlashCommandBuilder().setName('ai-video').setDescription('Google Veo APIでAI動画を生成')
    .addStringOption(o=>o.setName('prompt').setDescription('生成内容').setRequired(true))
    .addStringOption(o=>o.setName('aspect').setDescription('動画比率').addChoices(
      {name:'16:9',value:'16:9'},{name:'9:16',value:'9:16'}
    )),
  new SlashCommandBuilder().setName('video').setDescription('動画URLを投稿')
    .addStringOption(o=>o.setName('url').setDescription('動画URL').setRequired(true))
];
