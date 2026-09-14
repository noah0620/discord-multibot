import { Client, GatewayIntentBits, Partials, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { config, assertConfig } from './config.js';
import { db, getSettings, setSetting } from './db/database.js';
import { requireAdmin, canManageShop, getShop, isBotOwner, isServerAdmin } from './utils/permissions.js';
import { verifyPanel, ticketPanel, rolePanel, shopPanel, productPurchaseView } from './systems/panels.js';
import { showPurchaseModal, submitOrder, approveOrder, rejectOrder, cancelOrder } from './systems/shop.js';
import { createTicket, closeTicket } from './systems/tickets.js';
import { weather } from './systems/weather.js';
import { startEarthquakeWatcher } from './systems/earthquake.js';
import { playAudio, stopAudio } from './systems/music.js';
import { generateImage } from './systems/images.js';
import { onJoin, onLeave } from './events/member.js';

assertConfig();
const client = new Client({
  intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates,GatewayIntentBits.DirectMessages],
  partials:[Partials.Channel]
});

client.once('ready',()=>{ console.log(`✅ ${client.user.tag} 起動 / ${client.guilds.cache.size} servers`); startEarthquakeWatcher(client); });
client.on('guildMemberAdd',onJoin);
client.on('guildMemberRemove',onLeave);
client.on('messageCreate',async m=>{
  if(m.author.bot||!m.guildId)return;
  const rows=db.prepare('SELECT * FROM auto_replies WHERE guild_id=?').all(m.guildId);
  for(const r of rows){
    const hit=r.mode==='exact'?m.content===r.trigger:m.content.includes(r.trigger);
    if(hit){await m.reply(r.reply);break;}
  }
});

client.on('interactionCreate', async i=>{ try{
  if(i.isChatInputCommand()){
    if(!i.guildId && i.commandName!=='help') return i.reply({content:'このコマンドはサーバー内で使用してください。',ephemeral:true});

    if(i.commandName==='help') return i.reply({embeds:[new EmbedBuilder().setTitle('🤖 Multi BOT Help').setDescription([
      '`/shop-create` 自分の自動販売機を作成（誰でも可能）',
      '`/shop-list` 自販機一覧',
      '`/shop-panel shop_id:` 自販機を設置',
      '`/shop-config` 自販機の管理ロール・通知先変更',
      '`/product-add` 商品追加',
      '`/product-list` 商品確認',
      '`/order-list` 注文確認',
      '',
      '`/verify-panel` 認証 / `/role-panel` ロール / `/ticket-panel` チケット',
      '`/weather` 天気 / `/image` AI画像 / `/play` 音声 / `/stop` 停止',
      '',
      'BOTオーナーは全サーバー・全自販機を管理できます。'
    ].join('\n'))],ephemeral:true});

    if(i.commandName==='weather'){await i.deferReply();return i.editReply({embeds:[await weather(i.options.getString('place'))]});}
    if(i.commandName==='image'){await i.deferReply();const out=await generateImage(i.options.getString('prompt'));return Buffer.isBuffer(out)?i.editReply({files:[new AttachmentBuilder(out,{name:'generated.png'})]}):i.editReply(out);}
    if(i.commandName==='play'){await i.deferReply();await playAudio(i,i.options.getString('url'));return i.editReply('▶️ 再生を開始しました。');}
    if(i.commandName==='stop'){stopAudio(i.guildId);return i.reply('⏹️ 停止しました。');}

    // 誰でも自分の自販機を作成可能
    if(i.commandName==='shop-create'){
      const name=i.options.getString('name').trim();
      const managerRole=i.options.getRole('manager_role');
      const orderChannel=i.options.getChannel('order_channel');
      const result=db.prepare('INSERT INTO shops(guild_id,owner_user_id,name,manager_role_id,order_channel_id) VALUES(?,?,?,?,?)').run(i.guildId,i.user.id,name,managerRole?.id||'',orderChannel?.id||i.channelId);
      return i.reply({content:`✅ 自動販売機を作成しました。\nID: **${result.lastInsertRowid}**\n名前: **${name}**\nオーナー: <@${i.user.id}>${managerRole?`\n設定ロール: ${managerRole}`:''}\n注文通知: <#${orderChannel?.id||i.channelId}>`,ephemeral:true});
    }

    if(i.commandName==='shop-list'){
      const rows=db.prepare('SELECT * FROM shops WHERE guild_id=? AND active=1 ORDER BY id DESC LIMIT 50').all(i.guildId);
      return i.reply({content:rows.length?rows.map(s=>`#${s.id} **${s.name}** / owner <@${s.owner_user_id}>${s.manager_role_id?` / 管理 <@&${s.manager_role_id}>`:''}`).join('\n'):'自動販売機はまだありません。`/shop-create` で作成できます。',ephemeral:true});
    }

    if(i.commandName==='shop-panel'){
      const shopId=i.options.getInteger('shop_id');
      const shop=getShop(i.guildId,shopId);
      if(!shop||!shop.active)return i.reply({content:'自動販売機が見つかりません。',ephemeral:true});
      if(!canManageShop(i,shop))return i.reply({content:'この自動販売機を設置する権限がありません。',ephemeral:true});
      const result=shopPanel(i.guildId,shopId);
      if(!result?.payload)return i.reply({content:'この自動販売機には販売中の商品がありません。先に `/product-add` で追加してください。',ephemeral:true});
      await i.channel.send(result.payload);
      return i.reply({content:'✅ 自動販売機を設置しました。',ephemeral:true});
    }

    if(i.commandName==='shop-config'){
      const shopId=i.options.getInteger('shop_id');
      const shop=getShop(i.guildId,shopId);
      if(!shop)return i.reply({content:'自動販売機が見つかりません。',ephemeral:true});
      if(!canManageShop(i,shop))return i.reply({content:'この自動販売機を設定する権限がありません。',ephemeral:true});
      const name=i.options.getString('name');
      const role=i.options.getRole('manager_role');
      const channel=i.options.getChannel('order_channel');
      if(!name&&!role&&!channel)return i.reply({content:'変更したい項目を1つ以上指定してください。',ephemeral:true});
      if(name)db.prepare('UPDATE shops SET name=? WHERE id=? AND guild_id=?').run(name.trim(),shopId,i.guildId);
      if(role)db.prepare('UPDATE shops SET manager_role_id=? WHERE id=? AND guild_id=?').run(role.id,shopId,i.guildId);
      if(channel)db.prepare('UPDATE shops SET order_channel_id=? WHERE id=? AND guild_id=?').run(channel.id,shopId,i.guildId);
      return i.reply({content:'✅ 自動販売機設定を更新しました。',ephemeral:true});
    }

    if(i.commandName==='shop-delete'){
      const shopId=i.options.getInteger('shop_id');
      const shop=getShop(i.guildId,shopId);
      if(!shop)return i.reply({content:'自動販売機が見つかりません。',ephemeral:true});
      // 停止はオーナー、サーバー管理者、BOTオーナーのみ。管理ロールだけでは削除不可
      const ownerOrHigher=shop.owner_user_id===i.user.id || isServerAdmin(i) || isBotOwner(i);
      if(!ownerOrHigher)return i.reply({content:'自動販売機の停止はオーナー・サーバー管理者・BOTオーナーのみ可能です。',ephemeral:true});
      db.prepare('UPDATE shops SET active=0 WHERE id=? AND guild_id=?').run(shopId,i.guildId);
      db.prepare('UPDATE products SET active=0 WHERE shop_id=? AND guild_id=?').run(shopId,i.guildId);
      return i.reply({content:'🛑 自動販売機を停止しました。',ephemeral:true});
    }

    if(i.commandName==='product-add'){
      const shopId=i.options.getInteger('shop_id');
      const shop=getShop(i.guildId,shopId);
      if(!shop||!shop.active)return i.reply({content:'自動販売機が見つかりません。',ephemeral:true});
      if(!canManageShop(i,shop))return i.reply({content:'この自動販売機に商品を追加する権限がありません。',ephemeral:true});
      db.prepare('INSERT INTO products(guild_id,shop_id,name,price,stock,description,delivery_text,delivery_file_url,role_id) VALUES(?,?,?,?,?,?,?,?,?)').run(i.guildId,shopId,i.options.getString('name'),i.options.getInteger('price'),i.options.getInteger('stock'),i.options.getString('description')||'',i.options.getString('delivery_text')||'',i.options.getString('delivery_file_url')||'',i.options.getRole('role')?.id||'');
      return i.reply({content:`✅ **${shop.name}** に商品を追加しました。`,ephemeral:true});
    }

    if(i.commandName==='product-list'){
      const shopId=i.options.getInteger('shop_id');
      const shop=getShop(i.guildId,shopId);
      if(!shop)return i.reply({content:'自動販売機が見つかりません。',ephemeral:true});
      if(!canManageShop(i,shop))return i.reply({content:'この自動販売機の商品管理権限がありません。',ephemeral:true});
      const rows=db.prepare('SELECT * FROM products WHERE guild_id=? AND shop_id=? ORDER BY id DESC LIMIT 50').all(i.guildId,shopId);
      return i.reply({content:rows.length?rows.map(p=>`#${p.id} ${p.name} ¥${p.price} 在庫:${p.stock<0?'∞':p.stock} ${p.active?'販売中':'停止'}`).join('\n'):'商品なし',ephemeral:true});
    }

    if(i.commandName==='order-list'){
      const shopId=i.options.getInteger('shop_id');
      const shop=getShop(i.guildId,shopId);
      if(!shop)return i.reply({content:'自動販売機が見つかりません。',ephemeral:true});
      if(!canManageShop(i,shop))return i.reply({content:'この自動販売機の注文を見る権限がありません。',ephemeral:true});
      const rows=db.prepare('SELECT o.*,p.name FROM orders o JOIN products p ON p.id=o.product_id WHERE o.guild_id=? AND o.shop_id=? ORDER BY o.id DESC LIMIT 30').all(i.guildId,shopId);
      return i.reply({content:rows.length?rows.map(o=>`${o.order_code} | ${o.name} x${o.quantity||1} | <@${o.user_id}> | ¥${o.amount} | ${o.status}`).join('\n'):'注文なし',ephemeral:true});
    }

    // サーバー共通設定は管理者/BOTオーナーのみ
    if(['verify-panel','role-panel','ticket-panel','setting','autoreply-add','role-add'].includes(i.commandName) && !await requireAdmin(i)) return;
    if(i.commandName==='verify-panel')return i.channel.send(verifyPanel()).then(()=>i.reply({content:'設置しました。',ephemeral:true}));
    if(i.commandName==='ticket-panel')return i.channel.send(ticketPanel()).then(()=>i.reply({content:'設置しました。',ephemeral:true}));
    if(i.commandName==='role-panel'){const p=rolePanel(i.guildId);if(!p)return i.reply({content:'先に /role-add でロールを追加してください。',ephemeral:true});return i.channel.send(p).then(()=>i.reply({content:'設置しました。',ephemeral:true}));}
    if(i.commandName==='setting'){setSetting(i.guildId,i.options.getString('key'),i.options.getString('value'));return i.reply({content:'設定を保存しました。',ephemeral:true});}
    if(i.commandName==='autoreply-add'){db.prepare('INSERT INTO auto_replies(guild_id,trigger,reply,mode) VALUES(?,?,?,?)').run(i.guildId,i.options.getString('trigger'),i.options.getString('reply'),i.options.getString('mode'));return i.reply({content:'自動返信を追加しました。',ephemeral:true});}
    if(i.commandName==='role-add'){const r=i.options.getRole('role');db.prepare('INSERT INTO role_options(guild_id,label,role_id) VALUES(?,?,?)').run(i.guildId,i.options.getString('label'),r.id);return i.reply({content:`${r} を追加しました。`,ephemeral:true});}
  }

  if(i.isStringSelectMenu()){
    if(i.customId.startsWith('shop_select:')){
      const shopId=Number(i.customId.split(':')[1]);
      const p=db.prepare('SELECT * FROM products WHERE id=? AND shop_id=? AND guild_id=? AND active=1').get(Number(i.values[0]),shopId,i.guildId);
      const view=productPurchaseView(i.guildId,shopId,p);
      if(!view)return i.reply({content:'商品が見つかりません。',ephemeral:true});
      return i.reply(view);
    }
    if(i.customId==='role_select'){
      const all=db.prepare('SELECT role_id FROM role_options WHERE guild_id=?').all(i.guildId).map(x=>x.role_id);
      const member=await i.guild.members.fetch(i.user.id);
      for(const id of all){if(i.values.includes(id))await member.roles.add(id).catch(()=>{});else await member.roles.remove(id).catch(()=>{});}
      return i.reply({content:'ロールを更新しました。',ephemeral:true});
    }
  }

  if(i.isModalSubmit()){
    if(i.customId.startsWith('purchase_submit:')){
      const [,shopId,productId]=i.customId.split(':');
      return submitOrder(i,Number(shopId),Number(productId));
    }
  }

  if(i.isButton()){
    if(i.customId==='verify'){const rid=getSettings(i.guildId).verification_role_id;if(!rid)return i.reply({content:'認証ロールが未設定です。',ephemeral:true});await i.member.roles.add(rid);return i.reply({content:'✅ 認証しました。',ephemeral:true});}
    if(i.customId==='ticket_create')return createTicket(i);
    if(i.customId==='ticket_close')return closeTicket(i);
    if(i.customId.startsWith('buy:')){const [,shopId,productId]=i.customId.split(':');return showPurchaseModal(i,Number(shopId),Number(productId));}
    if(i.customId.startsWith('cancel:'))return cancelOrder(i,i.customId.slice(7));
    if(i.customId.startsWith('approve:'))return approveOrder(i,i.customId.slice(8));
    if(i.customId.startsWith('reject:'))return rejectOrder(i,i.customId.slice(7));
  }
}catch(e){
  console.error(e);
  if(i.deferred||i.replied)await i.editReply({content:`エラー: ${e.message}`,components:[]}).catch(()=>{});
  else await i.reply({content:`エラー: ${e.message}`,ephemeral:true}).catch(()=>{});
}});

client.login(config.token);
