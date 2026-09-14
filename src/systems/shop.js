import crypto from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { db } from '../db/database.js';
import { canManageShop } from '../utils/permissions.js';

function code() {
  return `NX-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function validPayPayUrl(value) {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' && u.hostname === 'pay.paypay.ne.jp' && u.pathname.length > 1;
  } catch {
    return false;
  }
}

export async function showPurchaseModal(interaction, shopId, productId) {
  const p = db.prepare('SELECT * FROM products WHERE id=? AND shop_id=? AND guild_id=? AND active=1').get(productId, shopId, interaction.guildId);
  const shop = db.prepare('SELECT * FROM shops WHERE id=? AND guild_id=? AND active=1').get(shopId, interaction.guildId);
  if (!shop || !p || p.stock === 0) return interaction.reply({ content: '商品または自動販売機が見つからないか、売り切れです。', ephemeral: true });

  const quantity = new TextInputBuilder().setCustomId('quantity').setLabel(`購入数量（単価 ¥${p.price.toLocaleString()}）`).setStyle(TextInputStyle.Short).setPlaceholder(p.stock < 0 ? '例: 1' : `1〜${p.stock}`).setRequired(true).setMinLength(1).setMaxLength(4).setValue('1');
  const paypayUrl = new TextInputBuilder().setCustomId('paypay_url').setLabel('PayPay受け取りリンク').setStyle(TextInputStyle.Short).setPlaceholder('https://pay.paypay.ne.jp/xxxxxxxx').setRequired(true).setMinLength(20).setMaxLength(200);
  const modal = new ModalBuilder().setCustomId(`purchase_submit:${shopId}:${p.id}`).setTitle(`${p.name.slice(0, 35)} - 購入手続き`).addComponents(new ActionRowBuilder().addComponents(quantity), new ActionRowBuilder().addComponents(paypayUrl));
  return interaction.showModal(modal);
}

export async function submitOrder(interaction, shopId, productId) {
  const shop = db.prepare('SELECT * FROM shops WHERE id=? AND guild_id=? AND active=1').get(shopId, interaction.guildId);
  const p = db.prepare('SELECT * FROM products WHERE id=? AND shop_id=? AND guild_id=? AND active=1').get(productId, shopId, interaction.guildId);
  if (!shop || !p || p.stock === 0) return interaction.reply({ content: '商品または自動販売機が見つからないか、売り切れです。', ephemeral: true });

  const quantity = Number(interaction.fields.getTextInputValue('quantity').trim());
  const paypayUrl = interaction.fields.getTextInputValue('paypay_url').trim();
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return interaction.reply({ content: '購入数量は1以上の整数で入力してください。', ephemeral: true });
  if (p.stock >= 0 && quantity > p.stock) return interaction.reply({ content: `在庫が不足しています。現在の在庫は ${p.stock} 個です。`, ephemeral: true });
  if (!validPayPayUrl(paypayUrl)) return interaction.reply({ content: 'PayPayリンクが正しくありません。`https://pay.paypay.ne.jp/` の受け取りリンクを入力してください。', ephemeral: true });

  const amount = p.price * quantity;
  if (!Number.isSafeInteger(amount) || amount < 0) return interaction.reply({ content: '合計金額を計算できませんでした。', ephemeral: true });

  const orderCode = code();
  db.prepare(`INSERT INTO orders(order_code,guild_id,shop_id,user_id,product_id,quantity,amount,paypay_url,status) VALUES(?,?,?,?,?,?,?,?,'link_submitted')`).run(orderCode, interaction.guildId, shopId, interaction.user.id, p.id, quantity, amount, paypayUrl);

  await interaction.reply({
    embeds:[new EmbedBuilder().setTitle('✅ 注文を送信しました').setDescription(`**${shop.name}** の管理者がPayPayリンクを確認すると商品が配布されます。`).addFields(
      {name:'注文番号',value:orderCode},{name:'商品',value:p.name,inline:true},{name:'数量',value:String(quantity),inline:true},{name:'単価',value:`¥${p.price.toLocaleString()}`,inline:true},{name:'合計',value:`¥${amount.toLocaleString()}`,inline:true}
    ).setFooter({text:`PayPayリンクは合計 ¥${amount.toLocaleString()} と同額で作成してください。`})],
    components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`cancel:${orderCode}`).setLabel('注文をキャンセル').setStyle(ButtonStyle.Danger))],
    ephemeral:true
  });

  const channelId = shop.order_channel_id || interaction.channelId;
  const ch = await interaction.guild.channels.fetch(channelId).catch(()=>null);
  if (ch?.isTextBased()) {
    await ch.send({
      embeds:[new EmbedBuilder().setTitle(`💰 ${shop.name} - 新しい注文`).setDescription(`自販機オーナー: <@${shop.owner_user_id}>\nPayPayリンクを開き、金額を確認してから受け取ってください。`).addFields(
        {name:'注文番号',value:orderCode},{name:'購入者',value:`<@${interaction.user.id}>`},{name:'商品',value:p.name,inline:true},{name:'数量',value:String(quantity),inline:true},{name:'単価',value:`¥${p.price.toLocaleString()}`,inline:true},{name:'注文合計',value:`¥${amount.toLocaleString()}`,inline:true},{name:'確認',value:`PayPay側の金額が **¥${amount.toLocaleString()}** であることを確認してください。`}
      )],
      components:[new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('PayPayリンクを開く').setStyle(ButtonStyle.Link).setURL(paypayUrl),
        new ButtonBuilder().setCustomId(`approve:${orderCode}`).setLabel('受け取り完了・商品配布').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject:${orderCode}`).setLabel('却下').setStyle(ButtonStyle.Danger)
      )]
    });
  }
}

export async function approveOrder(interaction, orderCode) {
  const o = db.prepare(`SELECT o.*,p.name,p.stock,p.delivery_text,p.delivery_file_url,p.role_id,s.owner_user_id,s.manager_role_id,s.name AS shop_name FROM orders o JOIN products p ON p.id=o.product_id JOIN shops s ON s.id=o.shop_id WHERE o.order_code=? AND o.guild_id=?`).get(orderCode, interaction.guildId);
  if (!o) return interaction.reply({ content:'注文がありません。', ephemeral:true });
  if (!canManageShop(interaction, o)) return interaction.reply({ content:'この自動販売機を管理する権限がありません。', ephemeral:true });
  if (o.status !== 'link_submitted') return interaction.reply({ content:`処理できません: ${o.status}`, ephemeral:true });

  const tx = db.transaction(()=>{
    const p = db.prepare('SELECT stock FROM products WHERE id=?').get(o.product_id);
    if (!p) throw new Error('商品が見つかりません');
    if (p.stock >= 0 && p.stock < o.quantity) throw new Error(`在庫不足です。必要数: ${o.quantity} / 在庫: ${p.stock}`);
    if (p.stock >= 0) db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(o.quantity,o.product_id);
    db.prepare("UPDATE orders SET status='completed',updated_at=CURRENT_TIMESTAMP WHERE order_code=?").run(orderCode);
  });
  try { tx(); } catch(e) { return interaction.reply({content:e.message,ephemeral:true}); }

  const user = await interaction.client.users.fetch(o.user_id);
  const dm = {content:`✅ ご購入ありがとうございます。\n自動販売機: ${o.shop_name}\n注文番号: ${o.order_code}\n商品: ${o.name}\n数量: ${o.quantity}\n合計: ¥${o.amount.toLocaleString()}\n${o.delivery_text||''}`};
  if (o.delivery_file_url) dm.files=[o.delivery_file_url];
  await user.send(dm).catch(()=>null);
  if (o.role_id) { const member=await interaction.guild.members.fetch(o.user_id).catch(()=>null); await member?.roles.add(o.role_id).catch(()=>null); }
  return interaction.update({content:`✅ ${o.order_code} を受け取り済みにし、商品を配布しました。`,embeds:[],components:[]});
}

export async function rejectOrder(interaction, orderCode) {
  const o = db.prepare(`SELECT o.*,s.owner_user_id,s.manager_role_id FROM orders o JOIN shops s ON s.id=o.shop_id WHERE o.order_code=? AND o.guild_id=?`).get(orderCode, interaction.guildId);
  if (!o) return interaction.reply({content:'注文がありません。',ephemeral:true});
  if (!canManageShop(interaction,o)) return interaction.reply({content:'この自動販売機を管理する権限がありません。',ephemeral:true});
  if (o.status !== 'link_submitted') return interaction.reply({content:`処理できません: ${o.status}`,ephemeral:true});
  db.prepare("UPDATE orders SET status='rejected',updated_at=CURRENT_TIMESTAMP WHERE order_code=?").run(orderCode);
  return interaction.update({content:`❌ ${orderCode} を却下しました。`,embeds:[],components:[]});
}

export async function cancelOrder(interaction, orderCode) {
  const o=db.prepare('SELECT * FROM orders WHERE order_code=?').get(orderCode);
  if (!o || o.user_id!==interaction.user.id) return interaction.reply({content:'注文がありません。',ephemeral:true});
  if (o.status!=='link_submitted') return interaction.reply({content:'この注文はキャンセルできません。',ephemeral:true});
  db.prepare("UPDATE orders SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE order_code=?").run(orderCode);
  return interaction.update({content:'注文をキャンセルしました。',embeds:[],components:[]});
}
