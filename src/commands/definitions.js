import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

export const commandData = [
  new SlashCommandBuilder().setName('help').setDescription('BOTの機能一覧を表示'),
  new SlashCommandBuilder().setName('ping').setDescription('BOT応答確認'),
  new SlashCommandBuilder().setName('owner-status').setDescription('BOTオーナー判定を確認'),
  new SlashCommandBuilder().setName('admin-role-set').setDescription('【鯖主】管理者コマンドを使えるロールを設定')
    .addRoleOption(o=>o.setName('role').setDescription('管理者ロール').setRequired(true)),
  new SlashCommandBuilder().setName('admin-role-status').setDescription('管理者ロール設定を確認'),
  new SlashCommandBuilder().setName('diagnostics').setDescription('【管理者】BOT権限・設定の動作診断'),

  new SlashCommandBuilder().setName('shop-create').setDescription('自分の自動販売機を作成')
    .addStringOption(o=>o.setName('name').setDescription('自動販売機名').setRequired(true))
    .addRoleOption(o=>o.setName('manager_role').setDescription('管理ロール'))
    .addChannelOption(o=>o.setName('order_channel').setDescription('注文通知先').addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder().setName('shop-list').setDescription('このサーバーの自動販売機一覧'),
  new SlashCommandBuilder().setName('shop-config').setDescription('自動販売機設定')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自販機ID').setRequired(true))
    .addStringOption(o=>o.setName('name').setDescription('新しい自販機名'))
    .addRoleOption(o=>o.setName('manager_role').setDescription('管理ロール'))
    .addChannelOption(o=>o.setName('order_channel').setDescription('注文通知先').addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder().setName('shop-delete').setDescription('自動販売機を停止')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自販機ID').setRequired(true)),
  new SlashCommandBuilder().setName('shop-admin').setDescription('【管理者】自販機・注文状況を確認'),

  new SlashCommandBuilder().setName('product-add').setDescription('自動販売機に商品追加')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自販機ID').setRequired(true))
    .addStringOption(o=>o.setName('name').setDescription('商品名').setRequired(true))
    .addIntegerOption(o=>o.setName('price').setDescription('単価').setRequired(true).setMinValue(0))
    .addIntegerOption(o=>o.setName('stock').setDescription('在庫（-1=無制限）').setRequired(true).setMinValue(-1))
    .addStringOption(o=>o.setName('description').setDescription('商品説明'))
    .addStringOption(o=>o.setName('delivery').setDescription('購入完了後DM内容'))
    .addStringOption(o=>o.setName('delivery_file_url').setDescription('購入完了後に送るファイルURL'))
    .addRoleOption(o=>o.setName('role').setDescription('購入完了後に付与するロール')),
  new SlashCommandBuilder().setName('product-list').setDescription('指定自販機の商品一覧')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自販機ID').setRequired(true)),
  new SlashCommandBuilder().setName('product-edit').setDescription('商品・在庫を変更')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自販機ID').setRequired(true))
    .addStringOption(o=>o.setName('product_id').setDescription('商品ID').setRequired(true))
    .addStringOption(o=>o.setName('name').setDescription('新しい商品名'))
    .addIntegerOption(o=>o.setName('price').setDescription('新しい価格').setMinValue(0))
    .addIntegerOption(o=>o.setName('stock').setDescription('新しい在庫（-1=無制限）').setMinValue(-1))
    .addStringOption(o=>o.setName('description').setDescription('新しい商品説明'))
    .addStringOption(o=>o.setName('delivery').setDescription('新しい購入完了DM'))
    .addStringOption(o=>o.setName('delivery_file_url').setDescription('新しい配布ファイルURL'))
    .addRoleOption(o=>o.setName('role').setDescription('購入後に付与するロール')),
  new SlashCommandBuilder().setName('product-remove').setDescription('商品を販売停止')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自販機ID').setRequired(true))
    .addStringOption(o=>o.setName('product_id').setDescription('商品ID').setRequired(true)),
  new SlashCommandBuilder().setName('order-list').setDescription('指定自販機の注文一覧')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自販機ID').setRequired(true)),
  new SlashCommandBuilder().setName('shop-panel').setDescription('販売パネル設置')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自販機ID').setRequired(true)),

  new SlashCommandBuilder().setName('verify-panel').setDescription('認証パネルを設置')
    .addRoleOption(o=>o.setName('role').setDescription('認証後に付与するロール').setRequired(true))
    .addChannelOption(o=>o.setName('approval_channel').setDescription('認証申請の承認通知を送るチャンネル').setRequired(true).addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder().setName('verify-admin').setDescription('【管理者】認証申請を確認・承認'),
  new SlashCommandBuilder().setName('verify-status').setDescription('【管理者】認証パネル設定を確認'),
  new SlashCommandBuilder().setName('verify-settings').setDescription('【管理者】認証申請の承認通知先を変更')
    .addChannelOption(o=>o.setName('approval_channel').setDescription('承認通知チャンネル').setRequired(true).addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder().setName('join-leave-settings').setDescription('【管理者】入退室通知チャンネルを設定')
    .addChannelOption(o=>o.setName('join').setDescription('参加通知チャンネル').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(o=>o.setName('leave').setDescription('退出通知チャンネル').addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder().setName('join-leave-status').setDescription('【管理者】入退室通知設定を確認'),

  new SlashCommandBuilder().setName('role-panel').setDescription('最大5ロールの選択パネル')
    .addRoleOption(o=>o.setName('role1').setDescription('ロール1（省略時は保存済みロール）'))
    .addStringOption(o=>o.setName('label1').setDescription('表示名1'))
    .addRoleOption(o=>o.setName('role2').setDescription('ロール2'))
    .addStringOption(o=>o.setName('label2').setDescription('表示名2'))
    .addRoleOption(o=>o.setName('role3').setDescription('ロール3'))
    .addStringOption(o=>o.setName('label3').setDescription('表示名3'))
    .addRoleOption(o=>o.setName('role4').setDescription('ロール4'))
    .addStringOption(o=>o.setName('label4').setDescription('表示名4'))
    .addRoleOption(o=>o.setName('role5').setDescription('ロール5'))
    .addStringOption(o=>o.setName('label5').setDescription('表示名5')),
  new SlashCommandBuilder().setName('role-add').setDescription('ロールパネル用ロールを保存')
    .addStringOption(o=>o.setName('label').setDescription('表示名').setRequired(true))
    .addRoleOption(o=>o.setName('role').setDescription('ロール').setRequired(true)),
  new SlashCommandBuilder().setName('role-list').setDescription('保存済みロール一覧'),
  new SlashCommandBuilder().setName('role-remove').setDescription('保存済みロールを削除')
    .addRoleOption(o=>o.setName('role').setDescription('ロール').setRequired(true)),

  new SlashCommandBuilder().setName('ticket-panel').setDescription('チケット作成パネル'),
  new SlashCommandBuilder().setName('ticket-settings').setDescription('チケットカテゴリ・サポートロール設定')
    .addChannelOption(o=>o.setName('category').setDescription('作成先カテゴリ').addChannelTypes(ChannelType.GuildCategory))
    .addRoleOption(o=>o.setName('support_role').setDescription('サポートロール')),
  new SlashCommandBuilder().setName('ticket-status').setDescription('チケット設定を確認'),

  new SlashCommandBuilder().setName('autoreply-add').setDescription('自動返信追加')
    .addStringOption(o=>o.setName('keyword').setDescription('キーワード').setRequired(true))
    .addStringOption(o=>o.setName('reply').setDescription('返信内容').setRequired(true))
    .addStringOption(o=>o.setName('mode').setDescription('判定方法').addChoices(
      {name:'部分一致',value:'contains'},{name:'完全一致',value:'exact'}
    )),
  new SlashCommandBuilder().setName('autoreply-remove').setDescription('自動返信削除')
    .addStringOption(o=>o.setName('keyword').setDescription('キーワード').setRequired(true)),
  new SlashCommandBuilder().setName('autoreply-list').setDescription('登録済み自動返信一覧'),

  new SlashCommandBuilder().setName('guild-settings').setDescription('通知先を設定')
    .addChannelOption(o=>o.setName('join_log').setDescription('参加通知').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(o=>o.setName('leave_log').setDescription('退出通知').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(o=>o.setName('earthquake').setDescription('地震通知').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(o=>o.setName('weather').setDescription('天気通知').addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder().setName('guild-status').setDescription('サーバー通知設定を確認'),
  new SlashCommandBuilder().setName('setting').setDescription('旧版互換: サーバー共通設定をIDで保存')
    .addStringOption(o=>o.setName('key').setDescription('設定項目').setRequired(true).addChoices(
      {name:'認証ロールID',value:'verification_role_id'},
      {name:'入室チャンネルID',value:'welcome_channel_id'},
      {name:'退室チャンネルID',value:'leave_channel_id'},
      {name:'チケットカテゴリID',value:'ticket_category_id'},
      {name:'サポートロールID',value:'ticket_support_role_id'},
      {name:'地震チャンネルID',value:'earthquake_channel_id'},
      {name:'天気チャンネルID',value:'weather_channel_id'}
    ))
    .addStringOption(o=>o.setName('value').setDescription('Discord ID').setRequired(true)),

  new SlashCommandBuilder().setName('weather').setDescription('登録地域の天気を表示。地域指定も可能')
    .addStringOption(o=>o.setName('region').setDescription('省略時は登録済み地域をすべて表示').setAutocomplete(true)),
  new SlashCommandBuilder().setName('weather-register').setDescription('【管理者】天気地域を追加・削除')
    .addStringOption(o=>o.setName('action').setDescription('操作').setRequired(true).addChoices(
      {name:'追加',value:'add'},{name:'削除',value:'remove'},{name:'全削除',value:'clear'}
    ))
    .addStringOption(o=>o.setName('region').setDescription('47都道府県・地方・全国').setAutocomplete(true)),
  new SlashCommandBuilder().setName('weather-admin').setDescription('【管理者】天気地域登録の詳細を表示'),
  new SlashCommandBuilder().setName('weather-list').setDescription('【管理者】登録済み天気地域を表示'),
  new SlashCommandBuilder().setName('weather-auto').setDescription('【管理者】自動天気のON/OFF・時刻・投稿先を設定')
    .addBooleanOption(o=>o.setName('enabled').setDescription('ON/OFF').setRequired(true))
    .addStringOption(o=>o.setName('time').setDescription('毎日の投稿時刻 例: 07:00 / 18:30'))
    .addChannelOption(o=>o.setName('channel').setDescription('自動天気の投稿先').addChannelTypes(ChannelType.GuildText)),

  new SlashCommandBuilder().setName('earthquake').setDescription('最新地震情報'),
  new SlashCommandBuilder().setName('earthquake-register').setDescription('地震通知地域を追加')
    .addStringOption(o=>o.setName('region').setDescription('地域').setAutocomplete(true).setRequired(true))
    .addIntegerOption(o=>o.setName('min_intensity').setDescription('最低震度 1〜7').setMinValue(1).setMaxValue(7)),
  new SlashCommandBuilder().setName('earthquake-list').setDescription('登録済み地震地域'),
  new SlashCommandBuilder().setName('earthquake-auto').setDescription('自動地震速報ON/OFF')
    .addBooleanOption(o=>o.setName('enabled').setDescription('ON/OFF').setRequired(true)),

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
  new SlashCommandBuilder().setName('pause').setDescription('音楽を一時停止'),
  new SlashCommandBuilder().setName('resume').setDescription('音楽を再開'),
  new SlashCommandBuilder().setName('nowplaying').setDescription('現在再生中を表示'),
  new SlashCommandBuilder().setName('volume').setDescription('音量を変更')
    .addIntegerOption(o=>o.setName('percent').setDescription('音量 1〜200').setRequired(true).setMinValue(1).setMaxValue(200)),

  new SlashCommandBuilder().setName('video').setDescription('動画URLを投稿')
    .addStringOption(o=>o.setName('url').setDescription('動画URL').setRequired(true))
];
