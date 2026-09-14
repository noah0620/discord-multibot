import {
  Client, GatewayIntentBits, Partials, Events, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder,
  TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits
} from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import { config, assertConfig, isBotOwner } from './config.js';
import { loadStore, saveStore, guildData } from './db/store.js';
import { searchRegionChoices } from './regions.js';

assertConfig();
const store = loadStore();
const players = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

function isShopManager(interaction, shop) {
  if (!shop) return false;
  if (isBotOwner(interaction.user.id)) return true;
  if (shop.ownerId === interaction.user.id) return true;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  return Boolean(shop.managerRoleId && interaction.member?.roles?.cache?.has(shop.managerRoleId));
}
function scaleToNumber(scale) {
  if (typeof scale !== 'number') return 0;
  const map = {10:1,20:2,30:3,40:4,45:5,46:5,50:5,55:6,60:6,70:7};
  return map[scale] || 0;
}
async function geocode(name) {
  const u = new URL('https://geocoding-api.open-meteo.com/v1/search');
  u.searchParams.set('name', name); u.searchParams.set('count', '1');
  u.searchParams.set('language', 'ja'); u.searchParams.set('format', 'json');
  const r = await fetch(u); const j = await r.json();
  return j.results?.[0] || null;
}
async function weatherText(name) {
  const loc = await geocode(name);
  if (!loc) return `❌ 「${name}」が見つかりませんでした。`;
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.searchParams.set('latitude', loc.latitude); u.searchParams.set('longitude', loc.longitude);
  u.searchParams.set('current', 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m');
  u.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max');
  u.searchParams.set('timezone', 'Asia/Tokyo');
  const r = await fetch(u); const w = await r.json();
  return `🌤 **${loc.name}${loc.admin1 ? `（${loc.admin1}）` : ''}**
🌡 現在 ${w.current?.temperature_2m ?? '-'}℃ / 体感 ${w.current?.apparent_temperature ?? '-'}℃
☔ 降水 ${w.current?.precipitation ?? '-'}mm / 最大降水確率 ${w.daily?.precipitation_probability_max?.[0] ?? '-'}%
📈 最高 ${w.daily?.temperature_2m_max?.[0] ?? '-'}℃ / 最低 ${w.daily?.temperature_2m_min?.[0] ?? '-'}℃
💨 風速 ${w.current?.wind_speed_10m ?? '-'}km/h`;
}
async function fetchLatestEarthquake() {
  const d = await fetch('https://api.p2pquake.net/v2/history?codes=551&limit=1').then(r=>r.json());
  return d?.[0] || null;
}
function earthquakeText(item) {
  const e = item?.earthquake;
  if (!e) return '地震情報を取得できませんでした。';
  return `🚨 **地震情報**
時刻: ${e.time || '不明'}
震源: ${e.hypocenter?.name || '不明'}
最大震度: ${e.maxScale ?? '不明'}
M${e.hypocenter?.magnitude ?? '?'} / 深さ ${e.hypocenter?.depth ?? '?'}km
津波: ${e.domesticTsunami || '情報なし'}`;
}

client.once(Events.ClientReady, c => {
  console.log(`✅ ${c.user.tag} 起動 / ${c.guilds.cache.size} servers`);
});

client.on(Events.GuildMemberAdd, async member => {
  const g = guildData(store, member.guild.id);
  if (g.joinLogChannelId) member.guild.channels.cache.get(g.joinLogChannelId)?.send(`📥 ${member.user.tag} が参加しました。`).catch(()=>{});
});
client.on(Events.GuildMemberRemove, async member => {
  const g = guildData(store, member.guild.id);
  if (g.leaveLogChannelId) member.guild.channels.cache.get(g.leaveLogChannelId)?.send(`📤 ${member.user.tag} が退出しました。`).catch(()=>{});
});

client.on(Events.MessageCreate, async msg => {
  if (!msg.guild || msg.author.bot) return;
  const g = guildData(store, msg.guild.id);

  for (const r of store.moderationRules.filter(x => x.guildId === msg.guild.id)) {
    if (!msg.content.toLowerCase().includes(r.keyword.toLowerCase())) continue;
    try {
      if (r.action === 'delete') await msg.delete();
      if (r.action === 'timeout' && msg.member?.moderatable) await msg.member.timeout(10*60*1000, `自動モデレーション: ${r.keyword}`);
      if (r.action === 'kick' && msg.member?.kickable) await msg.member.kick(`自動モデレーション: ${r.keyword}`);
      if (r.action === 'ban' && msg.member?.bannable) await msg.member.ban({ reason:`自動モデレーション: ${r.keyword}` });
    } catch (e) { console.error(e); }
    return;
  }

  for (const [keyword, reply] of Object.entries(g.autoReplies || {})) {
    if (msg.content.includes(keyword)) { await msg.reply(reply).catch(()=>{}); break; }
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isAutocomplete()) {
      return interaction.respond(searchRegionChoices(interaction.options.getFocused()));
    }

    if (interaction.isChatInputCommand()) {
      const n = interaction.commandName;

      if (n === 'help') {
        return interaction.reply({
          embeds:[new EmbedBuilder().setTitle('🤖 Discord MultiBot v3 統合版').setDescription(
`🛒 自販機 / PayPay受取リンク
/shop-create /shop-list /shop-config /product-add /shop-panel

✅ 認証・ロール・チケット
/verify-panel /role-panel /ticket-panel

💬 管理
/autoreply-add /autoreply-remove /guild-settings
/schedule-post /schedule-list /schedule-cancel
/moderation-rule /moderation-list /moderation-remove

🌤 天気
/weather /weather-register /weather-list /weather-auto

🚨 地震
/earthquake /earthquake-register /earthquake-list /earthquake-auto

🎵 音楽
/play /queue /skip /stop

🎨 AI
/ai-image /ai-video

※ 無料優先。high APIは管理者が許可した場合のみ。`
          )],
          ephemeral:true
        });
      }

      if (n === 'owner-status') {
        return interaction.reply({ content:isBotOwner(interaction.user.id)?'✅ BOTオーナーです。':'ℹ️ BOTオーナーではありません。', ephemeral:true });
      }

      if (n === 'shop-create') {
        const id = store.nextShopId++;
        const shop = {
          id, guildId:interaction.guildId, ownerId:interaction.user.id,
          name:interaction.options.getString('name',true),
          managerRoleId:interaction.options.getRole('manager_role')?.id || null,
          orderChannelId:interaction.options.getChannel('order_channel')?.id || null,
          products:[]
        };
        store.shops[id]=shop; saveStore(store);
        return interaction.reply(`✅ 自動販売機 #${id}「${shop.name}」を作成しました。`);
      }
      if (n === 'shop-list') {
        const shops = Object.values(store.shops).filter(s=>s.guildId===interaction.guildId);
        return interaction.reply({content:shops.length?shops.map(s=>`#${s.id} ${s.name} / owner:<@${s.ownerId}>`).join('\n'):'まだありません。',ephemeral:true});
      }
      if (n === 'shop-config') {
        const shop=store.shops[interaction.options.getInteger('shop_id')];
        if(!shop||shop.guildId!==interaction.guildId)return interaction.reply({content:'❌ 自販機が見つかりません。',ephemeral:true});
        if(!isShopManager(interaction,shop))return interaction.reply({content:'❌ 管理権限がありません。',ephemeral:true});
        const role=interaction.options.getRole('manager_role'),ch=interaction.options.getChannel('order_channel');
        if(role)shop.managerRoleId=role.id;if(ch)shop.orderChannelId=ch.id;saveStore(store);
        return interaction.reply({content:'✅ 自販機設定を更新しました。',ephemeral:true});
      }
      if (n === 'product-add') {
        const shop=store.shops[interaction.options.getInteger('shop_id')];
        if(!shop||shop.guildId!==interaction.guildId)return interaction.reply({content:'❌ 自販機が見つかりません。',ephemeral:true});
        if(!isShopManager(interaction,shop))return interaction.reply({content:'❌ 管理権限がありません。',ephemeral:true});
        const p={id:Date.now().toString(36),name:interaction.options.getString('name',true),price:interaction.options.getInteger('price',true),stock:interaction.options.getInteger('stock',true),delivery:interaction.options.getString('delivery',true)};
        shop.products.push(p);saveStore(store);return interaction.reply({content:`✅ ${p.name} を追加しました。`,ephemeral:true});
      }
      if (n === 'shop-panel') {
        const shop=store.shops[interaction.options.getInteger('shop_id')];
        if(!shop||shop.guildId!==interaction.guildId)return interaction.reply({content:'❌ 自販機が見つかりません。',ephemeral:true});
        if(!isShopManager(interaction,shop))return interaction.reply({content:'❌ 管理権限がありません。',ephemeral:true});
        const rows=shop.products.slice(0,5).map(p=>new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`buy:${shop.id}:${p.id}`).setLabel(`${p.name} ¥${p.price}`).setStyle(ButtonStyle.Success)));
        return interaction.reply({embeds:[new EmbedBuilder().setTitle(`🛒 ${shop.name}`).setDescription('購入する商品を選択してください。')],components:rows});
      }

      if (n === 'verify-panel') {
        const role=interaction.options.getRole('role',true);guildData(store,interaction.guildId).verificationRoleId=role.id;saveStore(store);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('✅ 認証').setDescription('ボタンを押して認証してください。')],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify').setLabel('認証する').setStyle(ButtonStyle.Primary))]});
      }

      if (n === 'role-panel') {
        const buttons=[];
        for(let x=1;x<=5;x++){
          const role=interaction.options.getRole(`role${x}`);
          if(!role)continue;
          const label=interaction.options.getString(`label${x}`)||role.name;
          buttons.push(new ButtonBuilder().setCustomId(`role:${role.id}`).setLabel(label).setStyle(ButtonStyle.Secondary));
        }
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎭 ロール選択').setDescription('ボタンを押すと付与/解除します。')],components:[new ActionRowBuilder().addComponents(buttons)]});
      }

      if (n === 'ticket-panel') {
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎫 チケット').setDescription('問い合わせチャンネルを作成します。')],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket:create').setLabel('チケット作成').setStyle(ButtonStyle.Primary))]});
      }

      if (n === 'autoreply-add') {
        const g=guildData(store,interaction.guildId);g.autoReplies[interaction.options.getString('keyword',true)]=interaction.options.getString('reply',true);saveStore(store);
        return interaction.reply({content:'✅ 自動返信を追加しました。',ephemeral:true});
      }
      if (n === 'autoreply-remove') {
        const g=guildData(store,interaction.guildId);delete g.autoReplies[interaction.options.getString('keyword',true)];saveStore(store);
        return interaction.reply({content:'✅ 自動返信を削除しました。',ephemeral:true});
      }
      if (n === 'guild-settings') {
        const g=guildData(store,interaction.guildId);
        const j=interaction.options.getChannel('join_log'),l=interaction.options.getChannel('leave_log'),e=interaction.options.getChannel('earthquake'),w=interaction.options.getChannel('weather');
        if(j)g.joinLogChannelId=j.id;if(l)g.leaveLogChannelId=l.id;if(e)g.earthquakeChannelId=e.id;if(w)g.weatherChannelId=w.id;saveStore(store);
        return interaction.reply({content:'✅ サーバー設定を保存しました。',ephemeral:true});
      }

      if (n === 'weather') {
        await interaction.deferReply();return interaction.editReply(await weatherText(interaction.options.getString('region',true)));
      }
      if (n === 'weather-register') {
        const g=guildData(store,interaction.guildId),r=interaction.options.getString('region',true);
        if(!g.weatherRegions.includes(r))g.weatherRegions.push(r);saveStore(store);
        return interaction.reply({content:`✅ 天気地域: ${g.weatherRegions.join(' / ')}`,ephemeral:true});
      }
      if (n === 'weather-list') {
        const g=guildData(store,interaction.guildId);return interaction.reply({content:g.weatherRegions.length?g.weatherRegions.join(' / '):'未登録です。',ephemeral:true});
      }
      if (n === 'weather-auto') {
        const g=guildData(store,interaction.guildId);g.weatherAutoEnabled=interaction.options.getBoolean('enabled',true);saveStore(store);
        return interaction.reply({content:`✅ 自動天気投稿: ${g.weatherAutoEnabled?'ON':'OFF'}`,ephemeral:true});
      }

      if (n === 'earthquake') {
        await interaction.deferReply();return interaction.editReply(earthquakeText(await fetchLatestEarthquake()));
      }
      if (n === 'earthquake-register') {
        const g=guildData(store,interaction.guildId),r=interaction.options.getString('region',true),min=interaction.options.getInteger('min_intensity');
        if(!g.earthquakeRegions.includes(r))g.earthquakeRegions.push(r);if(min)g.minIntensity=min;saveStore(store);
        return interaction.reply({content:`✅ 地震地域: ${g.earthquakeRegions.join(' / ')} / 最低震度 ${g.minIntensity}`,ephemeral:true});
      }
      if (n === 'earthquake-list') {
        const g=guildData(store,interaction.guildId);return interaction.reply({content:`地域: ${g.earthquakeRegions.join(' / ')||'未登録'} / 最低震度 ${g.minIntensity}`,ephemeral:true});
      }
      if (n === 'earthquake-auto') {
        const g=guildData(store,interaction.guildId);g.earthquakeAutoEnabled=interaction.options.getBoolean('enabled',true);saveStore(store);
        return interaction.reply({content:`✅ 自動地震速報: ${g.earthquakeAutoEnabled?'ON':'OFF'}`,ephemeral:true});
      }

      if (n === 'schedule-post') {
        const ch=interaction.options.getChannel('channel',true),raw=interaction.options.getString('datetime',true),message=interaction.options.getString('message',true),del=interaction.options.getInteger('delete_after_minutes');
        const when=new Date(raw.replace(' ','T')+':00+09:00');
        if(Number.isNaN(when.getTime()))return interaction.reply({content:'❌ 日時は 2026-09-15 20:00 の形式にしてください。',ephemeral:true});
        const id=store.nextScheduleId++;store.schedules.push({id,guildId:interaction.guildId,channelId:ch.id,message,at:when.toISOString(),deleteAfterMinutes:del,done:false});saveStore(store);
        return interaction.reply({content:`✅ 予約 #${id} を登録しました。`,ephemeral:true});
      }
      if (n === 'schedule-list') {
        const a=store.schedules.filter(x=>x.guildId===interaction.guildId&&!x.done);return interaction.reply({content:a.length?a.map(x=>`#${x.id} ${x.at} → <#${x.channelId}>`).join('\n'):'予約はありません。',ephemeral:true});
      }
      if (n === 'schedule-cancel') {
        const id=interaction.options.getInteger('id',true),before=store.schedules.length;store.schedules=store.schedules.filter(x=>!(x.guildId===interaction.guildId&&x.id===id));saveStore(store);
        return interaction.reply({content:before!==store.schedules.length?`✅ 予約 #${id} を削除しました。`:'該当予約がありません。',ephemeral:true});
      }

      if (n === 'moderation-rule') {
        const id=store.nextRuleId++;store.moderationRules.push({id,guildId:interaction.guildId,keyword:interaction.options.getString('keyword',true),action:interaction.options.getString('action',true)});saveStore(store);
        return interaction.reply({content:`✅ ルール #${id} を追加しました。`,ephemeral:true});
      }
      if (n === 'moderation-list') {
        const a=store.moderationRules.filter(x=>x.guildId===interaction.guildId);return interaction.reply({content:a.length?a.map(x=>`#${x.id} "${x.keyword}" → ${x.action}`).join('\n'):'ルールなし',ephemeral:true});
      }
      if (n === 'moderation-remove') {
        const id=interaction.options.getInteger('id',true),before=store.moderationRules.length;store.moderationRules=store.moderationRules.filter(x=>!(x.guildId===interaction.guildId&&x.id===id));saveStore(store);
        return interaction.reply({content:before!==store.moderationRules.length?`✅ #${id} 削除完了`:'該当なし',ephemeral:true});
      }

      if (n === 'play') {
        const vc=interaction.member?.voice?.channel;
        if(!vc)return interaction.reply({content:'❌ 先にボイスチャンネルへ参加してください。',ephemeral:true});
        const url=interaction.options.getString('url',true);
        if(/(?:youtube\.com|youtu\.be)/i.test(url))return interaction.reply({content:'⚠️ この統合版ではYouTubeページURLの音声抽出は未実装です。直接再生可能な音声URLを使用してください。',ephemeral:true});
        let s=players.get(interaction.guildId);
        if(!s){
          const connection=joinVoiceChannel({channelId:vc.id,guildId:interaction.guildId,adapterCreator:interaction.guild.voiceAdapterCreator});
          const player=createAudioPlayer();connection.subscribe(player);s={connection,player,queue:[],playing:false,current:null};
          player.on(AudioPlayerStatus.Idle,()=>{s.playing=false;s.current=null;playNext(interaction.guildId).catch(console.error);});players.set(interaction.guildId,s);
        }
        s.queue.push(url);await interaction.reply(`🎵 キューに追加しました。\n${url}`);if(!s.playing)playNext(interaction.guildId);return;
      }
      if (n === 'queue') {
        const s=players.get(interaction.guildId);const lines=[];if(s?.current)lines.push(`▶️ ${s.current}`);if(s?.queue?.length)lines.push(...s.queue.map((x,k)=>`${k+1}. ${x}`));
        return interaction.reply(lines.join('\n')||'キューは空です。');
      }
      if (n === 'skip') { players.get(interaction.guildId)?.player.stop(true); return interaction.reply('⏭️ スキップしました。'); }
      if (n === 'stop') {
        const s=players.get(interaction.guildId);if(s){s.queue.length=0;s.player.stop(true);s.connection.destroy();players.delete(interaction.guildId);}
        return interaction.reply('⏹️ 停止しました。');
      }

      if (n === 'ai-image' || n === 'ai-video') {
        const mode=interaction.options.getString('quality')||config.aiDefaultMode;
        if(mode==='high'&&!config.aiPaidEnabled)return interaction.reply({content:'🔒 高精度APIは無効です。無料優先モードを使用してください。',ephemeral:true});
        const kind=n==='ai-image'?'画像':'動画';
        return interaction.reply({content:`🎨 ${kind}生成 / ${mode}\n${interaction.options.getString('prompt',true)}\n\n現在は生成エンジン接続口まで実装済みです。`,ephemeral:true});
      }
      if (n === 'video') return interaction.reply(`🎬 ${interaction.options.getString('url',true)}`);
    }

    if (interaction.isButton()) {
      const [kind,a,b]=interaction.customId.split(':');

      if (kind === 'verify') {
        const roleId=guildData(store,interaction.guildId).verificationRoleId;
        if(!roleId)return interaction.reply({content:'❌ 認証ロール未設定です。',ephemeral:true});
        await interaction.member.roles.add(roleId);return interaction.reply({content:'✅ 認証しました。',ephemeral:true});
      }
      if (kind === 'role') {
        const has=interaction.member.roles.cache.has(a);
        if(has)await interaction.member.roles.remove(a);else await interaction.member.roles.add(a);
        return interaction.reply({content:has?'✅ ロールを外しました。':'✅ ロールを付与しました。',ephemeral:true});
      }
      if (kind === 'ticket' && a === 'create') {
        const ch=await interaction.guild.channels.create({
          name:`ticket-${interaction.user.username}`.slice(0,90),type:ChannelType.GuildText,
          permissionOverwrites:[
            {id:interaction.guild.id,deny:[PermissionFlagsBits.ViewChannel]},
            {id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages]}
          ]
        });
        return interaction.reply({content:`✅ ${ch} を作成しました。`,ephemeral:true});
      }
      if (kind === 'buy') {
        const shop=store.shops[a],product=shop?.products?.find(p=>p.id===b);
        if(!shop||!product)return interaction.reply({content:'❌ 商品が見つかりません。',ephemeral:true});
        const modal=new ModalBuilder().setCustomId(`buyModal:${shop.id}:${product.id}`).setTitle(product.name);
        const qty=new TextInputBuilder().setCustomId('qty').setLabel('購入数量').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('1');
        const pay=new TextInputBuilder().setCustomId('paypay').setLabel('PayPay受け取りURL').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('https://pay.paypay.ne.jp/...');
        modal.addComponents(new ActionRowBuilder().addComponents(qty),new ActionRowBuilder().addComponents(pay));
        return interaction.showModal(modal);
      }
      if (kind === 'order') {
        const order=store.orders[a];if(!order)return interaction.reply({content:'❌ 注文が見つかりません。',ephemeral:true});
        const shop=store.shops[order.shopId];if(!isShopManager(interaction,shop))return interaction.reply({content:'❌ 管理権限がありません。',ephemeral:true});
        if(b==='complete'){
          if(order.status==='completed')return interaction.reply({content:'処理済みです。',ephemeral:true});
          const p=shop.products.find(x=>x.id===order.productId);if(!p||p.stock<order.qty)return interaction.reply({content:'❌ 在庫不足です。',ephemeral:true});
          p.stock-=order.qty;order.status='completed';saveStore(store);
          const user=await client.users.fetch(order.userId);await user.send(`✅ 注文 #${order.id} 完了\n商品: ${p.name} × ${order.qty}\n\n${p.delivery}`).catch(()=>{});
          return interaction.reply('✅ 受け取り完了・商品配布しました。');
        }
        if(b==='reject'){order.status='rejected';saveStore(store);return interaction.reply('❌ 注文を却下しました。');}
      }
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('buyModal:')) {
      const [,shopId,productId]=interaction.customId.split(':'),shop=store.shops[shopId],p=shop?.products?.find(x=>x.id===productId);
      if(!shop||!p)return interaction.reply({content:'❌ 商品が見つかりません。',ephemeral:true});
      const qty=Number(interaction.fields.getTextInputValue('qty')),paypay=interaction.fields.getTextInputValue('paypay').trim();
      if(!Number.isInteger(qty)||qty<1)return interaction.reply({content:'❌ 数量が不正です。',ephemeral:true});
      if(qty>p.stock)return interaction.reply({content:`❌ 在庫不足です。現在 ${p.stock} 個です。`,ephemeral:true});
      if(!paypay.startsWith('https://pay.paypay.ne.jp/'))return interaction.reply({content:'❌ PayPay受け取りURLを入力してください。',ephemeral:true});
      const id=store.nextOrderId++,order={id,guildId:interaction.guildId,shopId:Number(shopId),productId,userId:interaction.user.id,qty,total:p.price*qty,paypay,status:'pending',createdAt:new Date().toISOString()};
      store.orders[id]=order;saveStore(store);
      const ch=interaction.guild.channels.cache.get(shop.orderChannelId||interaction.channelId);
      if(ch){
        await ch.send({
          embeds:[new EmbedBuilder().setTitle(`💰 注文 #${id}`).setDescription(`購入者: <@${interaction.user.id}>\n商品: ${p.name}\n数量: ${qty}\n合計: ¥${order.total.toLocaleString()}\nPayPay: ${paypay}`)],
          components:[new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('PayPayリンクを開く').setStyle(ButtonStyle.Link).setURL(paypay),
            new ButtonBuilder().setCustomId(`order:${id}:complete`).setLabel('受け取り完了・商品配布').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`order:${id}:reject`).setLabel('却下').setStyle(ButtonStyle.Danger)
          )]
        });
      }
      return interaction.reply({content:`✅ 注文 #${id} を送信しました。合計 ¥${order.total.toLocaleString()} です。`,ephemeral:true});
    }
  } catch (e) {
    console.error(e);
    if(interaction.isRepliable()){
      const m={content:'❌ エラーが発生しました。コンソールを確認してください。',ephemeral:true};
      if(interaction.replied||interaction.deferred)interaction.followUp(m).catch(()=>{});else interaction.reply(m).catch(()=>{});
    }
  }
});

async function playNext(gid){
  const s=players.get(gid);if(!s||s.playing||!s.queue.length)return;
  const url=s.queue.shift();
  try{s.current=url;s.playing=true;s.player.play(createAudioResource(url));}
  catch(e){s.current=null;s.playing=false;console.error(e);return playNext(gid);}
}

setInterval(async()=>{
  const now=Date.now();let changed=false;
  for(const s of store.schedules){
    if(s.done||new Date(s.at).getTime()>now)continue;
    try{
      const ch=await client.channels.fetch(s.channelId);
      if(ch?.isTextBased()){
        const sent=await ch.send(s.message);
        if(s.deleteAfterMinutes)setTimeout(()=>sent.delete().catch(()=>{}),s.deleteAfterMinutes*60000);
      }
      s.done=true;changed=true;
    }catch(e){console.error(e);}
  }
  if(changed)saveStore(store);
},15000);

setInterval(async()=>{
  try{
    const item=await fetchLatestEarthquake();
    if(!item)return;
    const eventId=String(item.id || item._id || item.time || JSON.stringify(item).slice(0,80));
    if(store.lastEarthquakeEventId===null){store.lastEarthquakeEventId=eventId;saveStore(store);return;}
    if(store.lastEarthquakeEventId===eventId)return;
    store.lastEarthquakeEventId=eventId;saveStore(store);

    const e=item.earthquake,maxN=scaleToNumber(e?.maxScale);
    const areaText=(item.points||[]).map(p=>p.pref||p.addr||'').join(' ');
    for(const guild of client.guilds.cache.values()){
      const g=guildData(store,guild.id);
      if(!g.earthquakeAutoEnabled||!g.earthquakeChannelId)continue;
      if(maxN<Number(g.minIntensity||3))continue;
      if(g.earthquakeRegions.length && !g.earthquakeRegions.some(r=>areaText.includes(r.replace(/[都道府県]$/,'')))) continue;
      guild.channels.cache.get(g.earthquakeChannelId)?.send(earthquakeText(item)).catch(()=>{});
    }
  }catch(e){console.error('earthquake watcher',e);}
},config.earthquakePollSeconds*1000);

setInterval(async()=>{
  const now=new Date();
  const jp=new Date(now.toLocaleString('en-US',{timeZone:'Asia/Tokyo'}));
  if(jp.getHours()!==config.weatherDailyHour)return;
  const dateKey=`${jp.getFullYear()}-${jp.getMonth()+1}-${jp.getDate()}`;
  for(const guild of client.guilds.cache.values()){
    const g=guildData(store,guild.id);
    if(!g.weatherAutoEnabled||!g.weatherChannelId||!g.weatherRegions.length||g.lastWeatherPostDate===dateKey)continue;
    const ch=guild.channels.cache.get(g.weatherChannelId);if(!ch)continue;
    const texts=[];
    for(const r of g.weatherRegions.slice(0,10))texts.push(await weatherText(r));
    await ch.send(texts.join('\n\n')).catch(()=>{});
    g.lastWeatherPostDate=dateKey;saveStore(store);
  }
},60*1000);

client.login(config.token);
