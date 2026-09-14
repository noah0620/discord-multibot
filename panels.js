import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { db } from '../db/database.js';

export function verifyPanel() {
  return { embeds:[new EmbedBuilder().setTitle('✅ 認証').setDescription('下のボタンを押して認証してください。')], components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify').setLabel('認証する').setStyle(ButtonStyle.Success))] };
}
export function ticketPanel() {
  return { embeds:[new EmbedBuilder().setTitle('🎫 サポートチケット').setDescription('問い合わせがある場合はチケットを作成してください。')], components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_create').setLabel('チケット作成').setStyle(ButtonStyle.Primary))] };
}
export function rolePanel(guildId) {
  const roles = db.prepare('SELECT * FROM role_options WHERE guild_id=? ORDER BY id LIMIT 25').all(guildId);
  if (!roles.length) return null;
  const menu = new StringSelectMenuBuilder().setCustomId('role_select').setPlaceholder('ロールを選択').setMinValues(0).setMaxValues(Math.min(roles.length,25)).addOptions(roles.map(r=>({label:r.label,value:r.role_id})));
  return { embeds:[new EmbedBuilder().setTitle('🎭 ロール選択').setDescription('必要なロールを選択してください。何も選ばず確定すると解除します。')], components:[new ActionRowBuilder().addComponents(menu)] };
}
export function shopPanel(guildId, shopId) {
  const shop = db.prepare('SELECT * FROM shops WHERE id=? AND guild_id=? AND active=1').get(shopId, guildId);
  if (!shop) return null;
  const products = db.prepare('SELECT * FROM products WHERE guild_id=? AND shop_id=? AND active=1 AND stock != 0 ORDER BY id LIMIT 25').all(guildId, shopId);
  if (!products.length) return { shop, payload:null };
  const menu = new StringSelectMenuBuilder().setCustomId(`shop_select:${shopId}`).setPlaceholder('商品を選択').addOptions(products.map(p=>({label:p.name.slice(0,100),description:`¥${p.price.toLocaleString()} / 在庫 ${p.stock<0?'∞':p.stock}`.slice(0,100),value:String(p.id)})));
  return {
    shop,
    payload:{
      embeds:[new EmbedBuilder().setTitle(`🛒 ${shop.name}`).setDescription(`オーナー: <@${shop.owner_user_id}>\n商品を選択 → 数量とPayPay受け取りリンクを入力してください。`)],
      components:[new ActionRowBuilder().addComponents(menu)]
    }
  };
}
export function productPurchaseView(guildId, shopId, product) {
  const shop = db.prepare('SELECT * FROM shops WHERE id=? AND guild_id=? AND active=1').get(shopId, guildId);
  if (!shop || !product) return null;
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`buy:${shopId}:${product.id}`).setLabel('購入手続き').setStyle(ButtonStyle.Success)
  );
  return {
    embeds:[new EmbedBuilder()
      .setTitle(product.name)
      .setDescription(product.description || '説明なし')
      .addFields(
        {name:'自動販売機',value:shop.name,inline:true},
        {name:'単価',value:`¥${product.price.toLocaleString()}`,inline:true},
        {name:'在庫',value:product.stock<0?'無制限':String(product.stock),inline:true},
        {name:'支払い方法',value:'購入者がPayPay受け取りリンクを入力',inline:false}
      )
      .setFooter({text:'購入手続きで数量を入力すると合計金額を自動計算します。'})],
    components:[buttons],
    ephemeral:true
  };
}
