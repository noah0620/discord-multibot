import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder().setName('help').setDescription('BOTのヘルプを表示'),
  new SlashCommandBuilder().setName('verify-panel').setDescription('認証パネルを設置'),
  new SlashCommandBuilder().setName('role-panel').setDescription('ロール選択パネルを設置'),
  new SlashCommandBuilder().setName('ticket-panel').setDescription('チケット作成パネルを設置'),

  new SlashCommandBuilder().setName('shop-create').setDescription('自分の自動販売機を作成（誰でも使用可能）')
    .addStringOption(o=>o.setName('name').setDescription('自動販売機名').setRequired(true).setMaxLength(80))
    .addRoleOption(o=>o.setName('manager_role').setDescription('この自販機を設定できるロール（任意）'))
    .addChannelOption(o=>o.setName('order_channel').setDescription('注文通知を送るチャンネル（任意）')),
  new SlashCommandBuilder().setName('shop-list').setDescription('このサーバーの自動販売機一覧'),
  new SlashCommandBuilder().setName('shop-panel').setDescription('指定した自動販売機パネルを設置')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自動販売機ID').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('shop-config').setDescription('自動販売機設定を変更')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自動販売機ID').setRequired(true).setMinValue(1))
    .addRoleOption(o=>o.setName('manager_role').setDescription('設定権限ロール'))
    .addChannelOption(o=>o.setName('order_channel').setDescription('注文通知チャンネル'))
    .addStringOption(o=>o.setName('name').setDescription('新しい自販機名').setMaxLength(80)),
  new SlashCommandBuilder().setName('shop-delete').setDescription('自分の自動販売機を停止')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自動販売機ID').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder().setName('product-add').setDescription('自動販売機に商品を追加')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自動販売機ID').setRequired(true).setMinValue(1))
    .addStringOption(o=>o.setName('name').setDescription('商品名').setRequired(true))
    .addIntegerOption(o=>o.setName('price').setDescription('単価').setRequired(true).setMinValue(0))
    .addIntegerOption(o=>o.setName('stock').setDescription('在庫（-1=無制限）').setRequired(true).setMinValue(-1))
    .addStringOption(o=>o.setName('description').setDescription('説明'))
    .addStringOption(o=>o.setName('delivery_text').setDescription('購入後にDMで送る文章'))
    .addStringOption(o=>o.setName('delivery_file_url').setDescription('購入後に送るファイルURL'))
    .addRoleOption(o=>o.setName('role').setDescription('購入後に付与するロール')),
  new SlashCommandBuilder().setName('product-list').setDescription('指定自動販売機の商品一覧')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自動販売機ID').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('order-list').setDescription('指定自動販売機の注文一覧')
    .addIntegerOption(o=>o.setName('shop_id').setDescription('自動販売機ID').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder().setName('setting').setDescription('サーバー共通BOT設定')
    .addStringOption(o=>o.setName('key').setDescription('設定').setRequired(true).addChoices(
      {name:'認証ロールID',value:'verification_role_id'},
      {name:'入室チャンネルID',value:'welcome_channel_id'},{name:'退室チャンネルID',value:'leave_channel_id'},
      {name:'ログチャンネルID',value:'log_channel_id'},{name:'チケットカテゴリID',value:'ticket_category_id'},
      {name:'サポートロールID',value:'ticket_support_role_id'},{name:'地震速報チャンネルID',value:'earthquake_channel_id'},
      {name:'天気チャンネルID',value:'weather_channel_id'}))
    .addStringOption(o=>o.setName('value').setDescription('値').setRequired(true)),
  new SlashCommandBuilder().setName('autoreply-add').setDescription('自動返信を追加')
    .addStringOption(o=>o.setName('trigger').setDescription('反応語').setRequired(true))
    .addStringOption(o=>o.setName('reply').setDescription('返信').setRequired(true))
    .addStringOption(o=>o.setName('mode').setDescription('判定').setRequired(true).addChoices({name:'部分一致',value:'contains'},{name:'完全一致',value:'exact'})),
  new SlashCommandBuilder().setName('role-add').setDescription('選択可能ロールを追加')
    .addStringOption(o=>o.setName('label').setDescription('表示名').setRequired(true))
    .addRoleOption(o=>o.setName('role').setDescription('ロール').setRequired(true)),
  new SlashCommandBuilder().setName('weather').setDescription('天気予報を表示')
    .addStringOption(o=>o.setName('place').setDescription('都市名（例: Tokyo, Chiba）').setRequired(true)),
  new SlashCommandBuilder().setName('image').setDescription('AI画像を生成')
    .addStringOption(o=>o.setName('prompt').setDescription('画像の内容').setRequired(true)),
  new SlashCommandBuilder().setName('play').setDescription('音楽/音声URLを再生')
    .addStringOption(o=>o.setName('url').setDescription('再生URL').setRequired(true)),
  new SlashCommandBuilder().setName('stop').setDescription('音楽再生を停止')
].map(c=>c.toJSON());
