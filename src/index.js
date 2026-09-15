import {
  Client, GatewayIntentBits, Partials, Events, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder,
  TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits
} from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } from '@discordjs/voice';
import { config, assertConfig, isBotOwner } from './config.js';
import { loadStore, saveStore, guildData } from './db/store.js';
import { searchRegionChoices, searchPrefectureChoices, PREFECTURES, WEATHER_AREAS, expandWeatherRegion } from './regions.js';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import Parser from 'rss-parser';

assertConfig();
const store = loadStore();
const players = new Map();

const rssParser=new Parser({timeout:15000,headers:{'User-Agent':'NoahXJP-Discord-NewsBot/1.0'}});
function parseDiscordChannelUrl(raw,guildId){
  try{
    const u=new URL(raw);
    if(!['discord.com','www.discord.com','discordapp.com','www.discordapp.com'].includes(u.hostname))return null;
    const m=u.pathname.match(/^\/channels\/(\d+)\/(\d+)\/?$/);
    return m&&m[1]===guildId?{guildId:m[1],channelId:m[2]}:null;
  }catch{return null;}
}
function validNewsUrl(raw){try{return ['http:','https:'].includes(new URL(raw).protocol);}catch{return false;}}
function newsItemKey(i){return String(i.guid||i.id||i.link||`${i.title||''}|${i.isoDate||i.pubDate||''}`);}
function cleanNewsText(v,max=700){const t=String(v||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();return t.length>max?`${t.slice(0,max-1)}…`:t;}
function newsEmbed(source,item){
  const e=new EmbedBuilder().setTitle(cleanNewsText(item.title||'新着ニュース',250))
    .setDescription(cleanNewsText(item.contentSnippet||item.summary||item.content||'',700)||'新着記事が公開されました。')
    .setFooter({text:`NEWS ALERT • ${source.name}`}).setTimestamp(item.isoDate||item.pubDate?new Date(item.isoDate||item.pubDate):new Date());
  if(item.link&&validNewsUrl(item.link))e.setURL(item.link);
  const image=item.enclosure?.url||item['media:content']?.url||item['media:thumbnail']?.url;
  if(image&&validNewsUrl(image))e.setImage(image);
  return e;
}
async function fetchNewsFeed(source){return rssParser.parseURL(source.feedUrl);}

function isGuildOwner(interaction){
  return Boolean(interaction.guild && interaction.user?.id === interaction.guild.ownerId);
}

function hasConfiguredAdminRole(interaction){
  if(!interaction.guildId)return false;
  if(isGuildOwner(interaction))return true;
  if(isBotOwner(interaction.user.id))return true; // 緊急復旧用
  const g=guildData(store,interaction.guildId);
  return Boolean(g.adminRoleId && interaction.member?.roles?.cache?.has(g.adminRoleId));
}

const ADMIN_COMMANDS=new Set([
  'shop-admin',
  'verify-panel','verify-admin','verify-status','verify-settings',
  'role-panel','role-add','role-list','role-remove',
  'join-leave-settings','join-leave-status','guild-settings','guild-status','setting',
  'ticket-panel','ticket-settings','ticket-status',
  'autoreply-add','autoreply-remove','autoreply-list',
  'schedule-post','schedule-list','schedule-cancel',
  'moderation-rule','moderation-list','moderation-remove',
  'news-source-add','news-source-remove','news-list','news-auto','news-test',
  'weather-register','weather-list','weather-admin','weather-auto','weather-channel','weather-channel-remove',
  'earthquake-register','earthquake-list','earthquake-auto',
  'diagnostics'
]);


function validHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function createFfmpegAudio(url) {
  if (!ffmpegPath) throw new Error('FFmpegが見つかりません。npm installを実行してください。');
  if (!validHttpUrl(url)) throw new Error('http/https の直接音声URLを指定してください。');

  const proc = spawn(ffmpegPath, [
    '-hide_banner',
    '-loglevel', 'error',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-i', url,
    '-vn',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1'
  ], { windowsHide:true });

  proc.stderr.on('data', d => {
    const msg=String(d).trim();
    if(msg)console.error('ffmpeg:',msg);
  });

  const resource=createAudioResource(proc.stdout,{
    inputType:StreamType.Raw,
    inlineVolume:true
  });

  return {proc,resource};
}


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
  u.searchParams.set('name', name);
  u.searchParams.set('count', '1');
  u.searchParams.set('language', 'ja');
  u.searchParams.set('format', 'json');
  const r = await fetch(u);
  if (!r.ok) throw new Error(`地域検索に失敗しました (${r.status})`);
  const j = await r.json();
  return j.results?.[0] || null;
}

function weatherLookupName(name) {
  const row = PREFECTURES.find(([pref]) => pref === name);
  return row ? row[1] : name;
}

function weatherLabel(name) {
  const row = PREFECTURES.find(([pref, capital]) => pref === name || capital === name);
  return row ? row[0] : name;
}

const WEATHER_CODE_TEXT = {
  0:'晴れ', 1:'ほぼ晴れ', 2:'やや曇り', 3:'曇り',
  45:'霧', 48:'着氷性の霧',
  51:'弱い霧雨', 53:'霧雨', 55:'強い霧雨',
  56:'弱い着氷性霧雨', 57:'強い着氷性霧雨',
  61:'弱い雨', 63:'雨', 65:'強い雨',
  66:'弱い着氷性の雨', 67:'強い着氷性の雨',
  71:'弱い雪', 73:'雪', 75:'強い雪', 77:'雪粒',
  80:'弱いにわか雨', 81:'にわか雨', 82:'激しいにわか雨',
  85:'弱いにわか雪', 86:'強いにわか雪',
  95:'雷雨', 96:'ひょうを伴う雷雨', 99:'激しいひょうを伴う雷雨'
};

function weatherKind(code) {
  if ([95,96,99].includes(code)) return 'thunder';
  if ([71,73,75,77,85,86].includes(code)) return 'snow';
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return 'rain';
  if ([3,45,48].includes(code)) return 'cloudy';
  if ([1,2].includes(code)) return 'partly';
  return 'sunny';
}

function weatherIcon(code) {
  const kind = weatherKind(code);
  if (kind === 'thunder') return '⛈️';
  if (kind === 'snow') return '🌨️';
  if (kind === 'rain') return '☔️';
  if (kind === 'cloudy') return '☁️';
  if (kind === 'partly') return '🌤️';
  return '☀️';
}

function weatherJudgement(code, precipitationMm, probability) {
  const kind = weatherKind(code);
  if (kind === 'thunder') return '雷雨となる可能性があります。';
  if (kind === 'snow') return '雪が降るでしょう。';

  // 天気コードが雨系、日降水量0.1mm以上、または最大降水確率50%以上なら雨予報。
  const rainExpected = kind === 'rain' || precipitationMm >= 0.1 || probability >= 50;
  return rainExpected ? '雨が降るでしょう。' : '雨は降らないでしょう。';
}

function oneDecimal(value) {
  const n = Number(value ?? 0);
  return Math.round(n * 10) / 10;
}

function jpWeatherTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone:'Asia/Tokyo',
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hour12:false
  }).formatToParts(date);
  const get = type => parts.find(p => p.type === type)?.value;
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
}

async function weatherText(name) {
  const lookup = weatherLookupName(name);
  const label = weatherLabel(name);
  const loc = await geocode(lookup);
  if (!loc) return `❌ 「${label}」の天気地点が見つかりませんでした。`;

  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.searchParams.set('latitude', loc.latitude);
  u.searchParams.set('longitude', loc.longitude);
  u.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max'
  );
  u.searchParams.set('timezone', 'Asia/Tokyo');
  u.searchParams.set('forecast_days', '1');

  const r = await fetch(u);
  if (!r.ok) return `❌ ${label} の天気情報取得に失敗しました (${r.status})。`;
  const w = await r.json();

  const code = Number(w.daily?.weather_code?.[0] ?? 0);
  const min = oneDecimal(w.daily?.temperature_2m_min?.[0]);
  const max = oneDecimal(w.daily?.temperature_2m_max?.[0]);
  const precipitation = oneDecimal(w.daily?.precipitation_sum?.[0]);
  const probability = Math.round(Number(w.daily?.precipitation_probability_max?.[0] ?? 0));

  const description = WEATHER_CODE_TEXT[code] || `天気コード${code}`;
  const icon = weatherIcon(code);
  const judgement = weatherJudgement(code, precipitation, probability);

  return [
    `**${label}は【${icon}】${judgement}**`,
    `本日${label}の天気は、${description}`,
    `最低気温 ${min}°C / 最高気温 ${max}°C`,
    `降水量 ${precipitation} mm / 降水確率 ${probability}%`
  ].join('\\n');
}


function splitDiscordBlocks(header, blocks, maxLength = 1900) {
  const pages = [];
  let current = header ? `${header}\n\n` : '';

  for (const block of blocks) {
    const next = current ? `${current}${block}\n\n` : `${block}\n\n`;
    if (next.length > maxLength && current.trim()) {
      pages.push(current.trim());
      current = `${block}\n\n`;
    } else {
      current = next;
    }
  }

  if (current.trim()) pages.push(current.trim());
  return pages;
}

async function buildWeatherPages(regions) {
  const unique = [...new Set(regions)];
  const texts = [];

  for (const region of unique) {
    try {
      texts.push(await weatherText(region));
    } catch (e) {
      texts.push(`❌ ${region} の天気取得に失敗しました。`);
      console.error(`weather ${region}`, e);
    }
  }

  return splitDiscordBlocks(`**${jpWeatherTimestamp()}**`, texts);
}

async function replyWeatherPages(interaction, pages) {
  if (!pages.length) {
    return interaction.editReply('❌ 表示する天気地域が登録されていません。');
  }

  await interaction.editReply(pages[0]);
  for (const page of pages.slice(1)) {
    await interaction.followUp(page);
  }
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
  console.log(`🆔 起動中BOT User ID: ${c.user.id}`);
  console.log(`🆔 .env DISCORD_CLIENT_ID: ${config.clientId || '未設定'}`);

  if (config.clientId && config.clientId !== c.user.id) {
    console.error('❌ 重要: DISCORD_CLIENT_ID と起動中BOTのIDが一致していません。');
    console.error('   deploy-commands はv5.2からBOTトークン側IDへ自動登録します。');
    console.error('   .env の DISCORD_CLIENT_ID も上記「起動中BOT User ID」に修正してください。');
  } else {
    console.log('✅ BOTトークンとApplication IDの対応: OK');
  }
});

client.on(Events.GuildMemberAdd, async member => {
  const g = guildData(store, member.guild.id);
  if (!g.joinLogChannelId) return;

  const ch = member.guild.channels.cache.get(g.joinLogChannelId)
    || await member.guild.channels.fetch(g.joinLogChannelId).catch(()=>null);
  if (!ch?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle('📥 メンバー参加')
    .setDescription(`${member} がサーバーに参加しました。`)
    .addFields(
      {name:'ユーザー', value:`${member.user.tag}`, inline:true},
      {name:'メンバー数', value:String(member.guild.memberCount), inline:true}
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  await ch.send({embeds:[embed]}).catch(e=>console.error('join log error',e));
});

client.on(Events.GuildMemberRemove, async member => {
  const g = guildData(store, member.guild.id);
  if (!g.leaveLogChannelId) return;

  const ch = member.guild.channels.cache.get(g.leaveLogChannelId)
    || await member.guild.channels.fetch(g.leaveLogChannelId).catch(()=>null);
  if (!ch?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle('📤 メンバー退出')
    .setDescription(`**${member.user.tag}** がサーバーから退出しました。`)
    .addFields(
      {name:'ユーザーID', value:member.user.id, inline:true},
      {name:'メンバー数', value:String(member.guild.memberCount), inline:true}
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  await ch.send({embeds:[embed]}).catch(e=>console.error('leave log error',e));
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

  for (const [keyword, raw] of Object.entries(g.autoReplies || {})) {
    const data = typeof raw === 'string' ? { reply:raw, mode:'contains' } : raw;
    const hit = data.mode === 'exact' ? msg.content === keyword : msg.content.includes(keyword);
    if (hit) { await msg.reply(data.reply).catch(()=>{}); break; }
  }
});


function rolePanelProblem(guild, role) {
  if (!guild || !role) return 'ロール情報を取得できません。';
  if (role.id === guild.id) return '@everyone は選択できません。';
  if (role.managed) return '連携サービス・BOT管理ロールは付与/解除できません。';

  const me = guild.members.me;
  if (!me) return 'BOT自身のサーバー情報を取得できません。';

  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return 'BOTに「ロールの管理」権限がありません。';
  }

  if (role.position >= me.roles.highest.position) {
    return `BOTのロールより「${role.name}」が上にあります。サーバー設定 → ロール でBOTのロールを対象ロールより上へ移動してください。`;
  }

  return null;
}

client.on(Events.InteractionCreate, async interaction => {
  console.log(`📨 Interaction受信: type=${interaction.type} command=${interaction.commandName || '-'} user=${interaction.user?.tag || interaction.user?.id || '-'}`);
  try {
    if (interaction.isAutocomplete()) {
      const choices = interaction.commandName.startsWith('earthquake')
        ? searchPrefectureChoices(interaction.options.getFocused())
        : searchRegionChoices(interaction.options.getFocused());
      return interaction.respond(choices);
    }

    if (interaction.isChatInputCommand()) {
      const n = interaction.commandName;

      if(ADMIN_COMMANDS.has(n) && !hasConfiguredAdminRole(interaction)){
        const g=guildData(store,interaction.guildId);
        return interaction.reply({
          content:g.adminRoleId
            ? `❌ 管理者ロール <@&${g.adminRoleId}> を持つメンバーのみ使用できます。`
            : '❌ 管理者ロールが未設定です。サーバー所有者（鯖主）が `/admin-role-set` で設定してください。',
          ephemeral:true
        });
      }


      if (n === 'ping') {
        return interaction.reply({
          content:`✅ BOTは正常にコマンドを受信しています。\nBOT: ${client.user.tag}\nBOT ID: ${client.user.id}\nGuild: ${interaction.guild?.name || 'DM'}\n時刻: ${new Date().toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}`,
          ephemeral:true
        });
      }

      if (n === 'help') {
        return interaction.reply({
          embeds:[new EmbedBuilder()
            .setTitle('🤖 Discord MultiBot v5.0 完全統合版')
            .setDescription(
`1. 🛒 **自販機・商品・PayPay購入・在庫・管理者**
/shop-create /shop-list /shop-config /shop-delete /shop-admin
/product-add /product-list /product-edit /product-remove /order-list /shop-panel

2. ✅ **管理者承認型認証・認証管理ページ**
/verify-panel /verify-admin /verify-status /verify-settings

3. 🎭 **最大5個のロールパネル**
/role-panel /role-add /role-list /role-remove

4. 🚪 **入室・退出通知と設定確認**
/join-leave-settings /join-leave-status /guild-settings /guild-status /setting

5. 🎫 **チケット**
/ticket-panel /ticket-settings /ticket-status

6. 💬 **自動返信**
/autoreply-add /autoreply-remove /autoreply-list

7. 📢 **予約投稿・自動削除**
/schedule-post /schedule-list /schedule-cancel

8. 🛡️ **モデレーション**
/moderation-rule /moderation-list /moderation-remove

9. 📰 **NEWS ALERTS**
/news-source-add /news-source-remove /news-list /news-auto /news-test

10. 🌤️ **47都道府県・地方・全国・複数地域天気**
/weather /weather-register /weather-list /weather-admin /weather-auto /weather-channel /weather-channel-remove

10. 🚨 **天気とは独立した地震速報**
/earthquake /earthquake-register /earthquake-list /earthquake-auto

11. 🎵 **VC音楽**
/play /queue /pause /resume /skip /stop /nowplaying /volume

12. 👑 **管理者権限**
/owner-status /admin-role-set /admin-role-status

🔧 **動作診断**
/diagnostics

補助: /video
AI生成機能は搭載していません。`
            )
          ],
          ephemeral:true
        });
      }

      if (n === 'owner-status') {
        return interaction.reply({ content:isBotOwner(interaction.user.id)?'✅ BOTオーナーです。':'ℹ️ BOTオーナーではありません。', ephemeral:true });
      }
      if (n === 'admin-role-set') {
        if(!isGuildOwner(interaction)){
          return interaction.reply({
            content:'❌ 管理者ロールを設定・変更できるのは、このサーバーの所有者（鯖主）だけです。',
            ephemeral:true
          });
        }
        const role=interaction.options.getRole('role',true);
        if(role.id===interaction.guild.id){
          return interaction.reply({content:'❌ @everyone は管理者ロールに設定できません。',ephemeral:true});
        }
        const g=guildData(store,interaction.guildId);
        g.adminRoleId=role.id;
        saveStore(store);
        return interaction.reply({
          content:`✅ 管理者ロールを ${role} に設定しました。\n\n👑 サーバー所有者: 常に管理可能\n🔐 ${role}: 管理者コマンドを使用可能\n👤 その他のメンバー: 管理者コマンドは使用不可`,
          ephemeral:true
        });
      }

      if (n === 'admin-role-status') {
        const g=guildData(store,interaction.guildId);
        if(!hasConfiguredAdminRole(interaction)){
          return interaction.reply({
            content:'❌ この管理情報を確認できるのは、サーバー所有者または指定された管理者ロールのメンバーだけです。',
            ephemeral:true
          });
        }
        return interaction.reply({
          content:g.adminRoleId
            ? `🔐 **管理者設定**\nサーバー所有者: <@${interaction.guild.ownerId}>\n管理者ロール: <@&${g.adminRoleId}>\nあなたの利用権限: ✅ あり`
            : `⚠️ 管理者ロールは未設定です。\nサーバー所有者 <@${interaction.guild.ownerId}> が \`/admin-role-set\` で設定してください。`,
          ephemeral:true
        });
      }

      if (n === 'diagnostics') {
        const me=interaction.guild?.members?.me;
        const g=guildData(store,interaction.guildId);
        const checks=[
          ['BOT接続', client.isReady()?'✅':'❌'],
          ['ロール管理', me?.permissions?.has(PermissionFlagsBits.ManageRoles)?'✅':'❌'],
          ['チャンネル管理', me?.permissions?.has(PermissionFlagsBits.ManageChannels)?'✅':'❌'],
          ['メッセージ送信', me?.permissions?.has(PermissionFlagsBits.SendMessages)?'✅':'❌'],
          ['メンバー管理イベント', 'Developer Portal の SERVER MEMBERS INTENT がON必須'],
          ['認証ロール', g.verificationRoleId?`<@&${g.verificationRoleId}>`:'未設定'],
          ['認証承認通知先', g.verificationReviewChannelId?`<#${g.verificationReviewChannelId}>`:'未設定'],
          ['入室通知', g.joinLogChannelId?`<#${g.joinLogChannelId}>`:'未設定'],
          ['退出通知', g.leaveLogChannelId?`<#${g.leaveLogChannelId}>`:'未設定'],
          ['天気通知', g.weatherChannelId?`<#${g.weatherChannelId}>`:'未設定'],
          ['地震通知', g.earthquakeChannelId?`<#${g.earthquakeChannelId}>`:'未設定'],
          ['チケットカテゴリ', g.ticketCategoryId?`<#${g.ticketCategoryId}>`:'未設定'],
          ['サポートロール', g.ticketSupportRoleId?`<@&${g.ticketSupportRoleId}>`:'未設定']
        ];
        return interaction.reply({
          content:`🔧 **BOT診断**\n${checks.map(([k,v])=>`**${k}**: ${v}`).join('\n')}`,
          ephemeral:true
        });
      }


      if (n === 'shop-create') {
        const id = store.nextShopId++;
        const shop = {
          id,
          guildId:interaction.guildId,
          ownerId:interaction.user.id,
          name:interaction.options.getString('name',true),
          managerRoleId:interaction.options.getRole('manager_role')?.id || null,
          orderChannelId:interaction.options.getChannel('order_channel')?.id || interaction.channelId,
          active:true,
          products:[]
        };
        store.shops[id]=shop;
        saveStore(store);
        return interaction.reply({
          content:`✅ 自動販売機 #${id}「${shop.name}」を作成しました。\nオーナー: <@${shop.ownerId}>\n注文通知: <#${shop.orderChannelId}>`,
          ephemeral:true
        });
      }

      if (n === 'shop-list') {
        const shops = Object.values(store.shops)
          .filter(s=>s.guildId===interaction.guildId && s.active!==false);
        return interaction.reply({
          content:shops.length
            ? shops.map(s=>`#${s.id} **${s.name}** / owner:<@${s.ownerId}>${s.managerRoleId?` / 管理:<@&${s.managerRoleId}>`:''}`).join('\n')
            : '自動販売機はまだありません。',
          ephemeral:true
        });
      }

      if (n === 'shop-config') {
        const shop=store.shops[interaction.options.getInteger('shop_id')];
        if(!shop||shop.guildId!==interaction.guildId)return interaction.reply({content:'❌ 自販機が見つかりません。',ephemeral:true});
        if(!isShopManager(interaction,shop))return interaction.reply({content:'❌ 管理権限がありません。',ephemeral:true});

        const name=interaction.options.getString('name');
        const role=interaction.options.getRole('manager_role');
        const ch=interaction.options.getChannel('order_channel');
        if(!name&&!role&&!ch)return interaction.reply({content:'❌ 変更する項目を1つ以上指定してください。',ephemeral:true});

        if(name)shop.name=name.trim();
        if(role)shop.managerRoleId=role.id;
        if(ch)shop.orderChannelId=ch.id;
        saveStore(store);
        return interaction.reply({content:'✅ 自販機設定を更新しました。',ephemeral:true});
      }

      if (n === 'shop-delete') {
        const shop=store.shops[interaction.options.getInteger('shop_id')];
        if(!shop||shop.guildId!==interaction.guildId)return interaction.reply({content:'❌ 自販機が見つかりません。',ephemeral:true});

        const allowed = isBotOwner(interaction.user.id)
          || shop.ownerId===interaction.user.id
          || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

        if(!allowed)return interaction.reply({content:'❌ 自販機停止はオーナー・サーバー管理者・BOTオーナーのみ可能です。',ephemeral:true});
        shop.active=false;
        saveStore(store);
        return interaction.reply({content:`🛑 自販機 #${shop.id}「${shop.name}」を停止しました。`,ephemeral:true});
      }

      if (n === 'shop-admin') {
        if(!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) && !isBotOwner(interaction.user.id)){
          return interaction.reply({content:'❌ 管理者のみ使用できます。',ephemeral:true});
        }
        const shops=Object.values(store.shops).filter(s=>s.guildId===interaction.guildId);
        const orders=Object.values(store.orders).filter(o=>o.guildId===interaction.guildId);
        const pending=orders.filter(o=>o.status==='pending');
        const lines=shops.slice(0,25).map(s=>{
          const pc=(s.products||[]).length;
          const oc=orders.filter(o=>Number(o.shopId)===Number(s.id)).length;
          return `#${s.id} ${s.active===false?'🛑':'✅'} **${s.name}** / owner:<@${s.ownerId}> / 商品:${pc} / 注文:${oc}`;
        });
        return interaction.reply({
          content:`🔒 **自販機 管理者ページ**\n自販機: ${shops.length}件 / 注文: ${orders.length}件 / 承認待ち: ${pending.length}件\n\n${lines.join('\n')||'自販機はありません。'}`,
          ephemeral:true
        });
      }

      if (n === 'product-add') {
        const shop=store.shops[interaction.options.getInteger('shop_id')];
        if(!shop||shop.guildId!==interaction.guildId||shop.active===false)return interaction.reply({content:'❌ 自販機が見つかりません。',ephemeral:true});
        if(!isShopManager(interaction,shop))return interaction.reply({content:'❌ 管理権限がありません。',ephemeral:true});

        const p={
          id:Date.now().toString(36),
          name:interaction.options.getString('name',true),
          price:interaction.options.getInteger('price',true),
          stock:interaction.options.getInteger('stock',true),
          description:interaction.options.getString('description') || '',
          delivery:interaction.options.getString('delivery') || '',
          deliveryFileUrl:interaction.options.getString('delivery_file_url') || '',
          roleId:interaction.options.getRole('role')?.id || null,
          active:true
        };
        shop.products ??= [];
        shop.products.push(p);
        saveStore(store);
        return interaction.reply({content:`✅ ${p.name} を追加しました。商品ID: \`${p.id}\``,ephemeral:true});
      }

      if (n === 'product-list') {
        const shop=store.shops[interaction.options.getInteger('shop_id')];
        if(!shop||shop.guildId!==interaction.guildId)return interaction.reply({content:'❌ 自販機が見つかりません。',ephemeral:true});
        if(!isShopManager(interaction,shop))return interaction.reply({content:'❌ 商品一覧を見る権限がありません。',ephemeral:true});

        const products=shop.products||[];
        const lines=products.map(p=>`\`${p.id}\` ${p.active===false?'🛑':'✅'} **${p.name}** / ¥${Number(p.price).toLocaleString()} / 在庫:${p.stock<0?'∞':p.stock}${p.roleId?` / 付与:<@&${p.roleId}>`:''}`);
        return interaction.reply({content:lines.join('\n')||'商品はありません。',ephemeral:true});
      }

      if (n === 'product-edit') {
        const shop=store.shops[interaction.options.getInteger('shop_id')];
        if(!shop||shop.guildId!==interaction.guildId)return interaction.reply({content:'❌ 自販機が見つかりません。',ephemeral:true});
        if(!isShopManager(interaction,shop))return interaction.reply({content:'❌ 管理権限がありません。',ephemeral:true});

        const productId=interaction.options.getString('product_id',true);
        const p=(shop.products||[]).find(x=>x.id===productId);
        if(!p)return interaction.reply({content:'❌ 商品IDが見つかりません。',ephemeral:true});

        const name=interaction.options.getString('name');
        const price=interaction.options.getInteger('price');
        const stock=interaction.options.getInteger('stock');
        const description=interaction.options.getString('description');
        const delivery=interaction.options.getString('delivery');
        const fileUrl=interaction.options.getString('delivery_file_url');
        const role=interaction.options.getRole('role');

        if(name!==null)p.name=name;
        if(price!==null)p.price=price;
        if(stock!==null)p.stock=stock;
        if(description!==null)p.description=description;
        if(delivery!==null)p.delivery=delivery;
        if(fileUrl!==null)p.deliveryFileUrl=fileUrl;
        if(role)p.roleId=role.id;

        saveStore(store);
        return interaction.reply({content:`✅ 商品 \`${p.id}\`「${p.name}」を更新しました。`,ephemeral:true});
      }

      if (n === 'product-remove') {
        const shop=store.shops[interaction.options.getInteger('shop_id')];
        if(!shop||shop.guildId!==interaction.guildId)return interaction.reply({content:'❌ 自販機が見つかりません。',ephemeral:true});
        if(!isShopManager(interaction,shop))return interaction.reply({content:'❌ 管理権限がありません。',ephemeral:true});

        const productId=interaction.options.getString('product_id',true);
        const p=(shop.products||[]).find(x=>x.id===productId);
        if(!p)return interaction.reply({content:'❌ 商品IDが見つかりません。',ephemeral:true});
        p.active=false;
        saveStore(store);
        return interaction.reply({content:`🛑 商品 \`${p.id}\`「${p.name}」を販売停止しました。`,ephemeral:true});
      }

      if (n === 'order-list') {
        const shop=store.shops[interaction.options.getInteger('shop_id')];
        if(!shop||shop.guildId!==interaction.guildId)return interaction.reply({content:'❌ 自販機が見つかりません。',ephemeral:true});
        if(!isShopManager(interaction,shop))return interaction.reply({content:'❌ 注文一覧を見る権限がありません。',ephemeral:true});

        const orders=Object.values(store.orders)
          .filter(o=>Number(o.shopId)===Number(shop.id) && o.guildId===interaction.guildId)
          .sort((a,b)=>Number(b.id)-Number(a.id))
          .slice(0,30);
        const lines=orders.map(o=>`#${o.id} / <@${o.userId}> / x${o.qty} / ¥${Number(o.total).toLocaleString()} / ${o.status}`);
        return interaction.reply({content:lines.join('\n')||'注文はありません。',ephemeral:true});
      }

      if (n === 'shop-panel') {
        const shop=store.shops[interaction.options.getInteger('shop_id')];
        if(!shop||shop.guildId!==interaction.guildId||shop.active===false)return interaction.reply({content:'❌ 自販機が見つかりません。',ephemeral:true});
        if(!isShopManager(interaction,shop))return interaction.reply({content:'❌ 管理権限がありません。',ephemeral:true});

        const products=(shop.products||[]).filter(p=>p.active!==false && p.stock!==0).slice(0,5);
        if(!products.length)return interaction.reply({content:'❌ 販売可能な商品がありません。',ephemeral:true});

        const rows=products.map(p=>
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`buy:${shop.id}:${p.id}`)
              .setLabel(`${p.name} ¥${p.price}${p.stock<0?' / 在庫∞':` / 在庫${p.stock}`}`.slice(0,80))
              .setStyle(ButtonStyle.Success)
          )
        );
        return interaction.reply({
          embeds:[new EmbedBuilder().setTitle(`🛒 ${shop.name}`).setDescription('購入する商品を選択してください。')],
          components:rows
        });
      }

      if (n === 'verify-panel') {
        const role=interaction.options.getRole('role',true);
        const problem=rolePanelProblem(interaction.guild,role);
        if(problem){
          return interaction.reply({
            content:`❌ 認証ロールを設定できません。\n${problem}`,
            ephemeral:true
          });
        }

        const g=guildData(store,interaction.guildId);
        const approvalChannel=interaction.options.getChannel('approval_channel',true);
        g.verificationRoleId=role.id;
        g.verificationReviewChannelId=approvalChannel.id;
        saveStore(store);

        return interaction.reply({
          embeds:[
            new EmbedBuilder()
              .setTitle('✅ 認証申請')
              .setDescription('下の **認証を申請する** ボタンを押してください。\n\n管理者が申請内容を確認して承認すると、認証ロールが付与されます。')
              .addFields(
                {name:'承認後のロール',value:`<@&${role.id}>`},
                {name:'申請通知先',value:`<#${approvalChannel.id}>`}
              )
          ],
          components:[
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('verify')
                .setLabel('認証を申請する')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Primary)
            )
          ]
        });
      }

      if (n === 'verify-admin') {
        const pending=Object.values(store.verificationRequests || {})
          .filter(r=>r.guildId===interaction.guildId && r.status==='pending')
          .sort((a,b)=>a.createdAt.localeCompare(b.createdAt));

        if(!pending.length){
          return interaction.reply({
            content:'🔒 **認証管理者ページ**\n現在、承認待ちの認証申請はありません。',
            ephemeral:true
          });
        }

        const shown=pending.slice(0,5);
        const embeds=shown.map(req=>
          new EmbedBuilder()
            .setTitle(`認証申請 #${req.id}`)
            .setDescription(`<@${req.userId}> から認証申請があります。`)
            .addFields(
              {name:'ユーザーID',value:req.userId},
              {name:'承認後のロール',value:`<@&${req.roleId}>`},
              {name:'申請日時',value:new Date(req.createdAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}
            )
        );

        const components=shown.map(req=>
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`verifyadmin:${req.id}:approve`)
              .setLabel(`#${req.id} 承認`)
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`verifyadmin:${req.id}:reject`)
              .setLabel(`#${req.id} 却下`)
              .setStyle(ButtonStyle.Danger)
          )
        );

        return interaction.reply({
          content:`🔒 **認証管理者ページ**\n承認待ち: **${pending.length}件**${pending.length>5?'（先頭5件を表示）':''}`,
          embeds,
          components,
          ephemeral:true
        });
      }

      if (n === 'verify-settings') {
        const g=guildData(store,interaction.guildId);
        const ch=interaction.options.getChannel('approval_channel',true);
        g.verificationReviewChannelId=ch.id;
        saveStore(store);
        return interaction.reply({
          content:`✅ 認証申請の承認通知先を ${ch} に変更しました。`,
          ephemeral:true
        });
      }

      if (n === 'verify-status') {
        const g=guildData(store,interaction.guildId);
        const roleId=g.verificationRoleId;
        const role=roleId ? await interaction.guild.roles.fetch(roleId).catch(()=>null) : null;
        return interaction.reply({
          content:`🔒 **認証設定**\n認証ロール: ${role?`<@&${role.id}>`:'未設定 / 削除済み'}\n承認通知先: ${g.verificationReviewChannelId?`<#${g.verificationReviewChannelId}>`:'未設定'}\nBOTのロール管理権限: ${interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)?'✅':'❌'}`,
          ephemeral:true
        });
      }

      if (n === 'join-leave-settings') {
        const g=guildData(store,interaction.guildId);
        const join=interaction.options.getChannel('join');
        const leave=interaction.options.getChannel('leave');

        if(!join && !leave){
          return interaction.reply({
            content:'❌ `join` または `leave` のどちらかを指定してください。',
            ephemeral:true
          });
        }

        if(join) g.joinLogChannelId=join.id;
        if(leave) g.leaveLogChannelId=leave.id;
        saveStore(store);

        return interaction.reply({
          content:`✅ **入退室通知設定を更新しました**\n参加通知: ${g.joinLogChannelId?`<#${g.joinLogChannelId}>`:'未設定'}\n退出通知: ${g.leaveLogChannelId?`<#${g.leaveLogChannelId}>`:'未設定'}\n\n※ Developer Portal の **SERVER MEMBERS INTENT** をONにしてください。`,
          ephemeral:true
        });
      }

      if (n === 'join-leave-status') {
        const g=guildData(store,interaction.guildId);
        return interaction.reply({
          content:`🔒 **入退室通知設定**\n参加通知: ${g.joinLogChannelId?`<#${g.joinLogChannelId}>`:'未設定'}\n退出通知: ${g.leaveLogChannelId?`<#${g.leaveLogChannelId}>`:'未設定'}\nSERVER MEMBERS INTENT: Discord Developer Portal側でON必須`,
          ephemeral:true
        });
      }

      if (n === 'role-panel') {
        const buttons=[];
        const errors=[];
        let directCount=0;

        for(let x=1;x<=5;x++){
          const role=interaction.options.getRole(`role${x}`);
          if(!role)continue;
          directCount++;
          const problem=rolePanelProblem(interaction.guild,role);
          if(problem){errors.push(`• ${role.name}: ${problem}`);continue;}
          const label=(interaction.options.getString(`label${x}`)||role.name).slice(0,80);
          buttons.push(new ButtonBuilder().setCustomId(`role:${role.id}`).setLabel(label).setStyle(ButtonStyle.Secondary));
        }

        if(directCount===0){
          const g=guildData(store,interaction.guildId);
          for(const opt of (g.roleOptions||[]).slice(0,5)){
            const role=await interaction.guild.roles.fetch(opt.roleId).catch(()=>null);
            if(!role)continue;
            const problem=rolePanelProblem(interaction.guild,role);
            if(problem){errors.push(`• ${role.name}: ${problem}`);continue;}
            buttons.push(new ButtonBuilder().setCustomId(`role:${role.id}`).setLabel((opt.label||role.name).slice(0,80)).setStyle(ButtonStyle.Secondary));
          }
        }

        if(errors.length)return interaction.reply({content:`❌ ロールパネルを作成できません。\n${errors.join('\n')}`,ephemeral:true});
        if(!buttons.length)return interaction.reply({content:'❌ ロールが指定されていません。直接指定するか `/role-add` で保存してください。',ephemeral:true});

        return interaction.reply({
          embeds:[new EmbedBuilder().setTitle('🎭 ロール選択').setDescription('ボタンを押すとロールを付与します。もう一度押すと解除します。')],
          components:[new ActionRowBuilder().addComponents(buttons)]
        });
      }

      if (n === 'role-add') {
        const g=guildData(store,interaction.guildId);
        const role=interaction.options.getRole('role',true);
        const problem=rolePanelProblem(interaction.guild,role);
        if(problem)return interaction.reply({content:`❌ ${problem}`,ephemeral:true});

        const label=interaction.options.getString('label',true).slice(0,80);
        g.roleOptions=(g.roleOptions||[]).filter(x=>x.roleId!==role.id);
        if(g.roleOptions.length>=5)return interaction.reply({content:'❌ 保存できるロールは最大5個です。先に `/role-remove` で削除してください。',ephemeral:true});
        g.roleOptions.push({roleId:role.id,label});
        saveStore(store);
        return interaction.reply({content:`✅ ${label} → ${role} を保存しました。`,ephemeral:true});
      }

      if (n === 'role-list') {
        const g=guildData(store,interaction.guildId);
        const lines=(g.roleOptions||[]).map((x,i)=>`${i+1}. **${x.label}** → <@&${x.roleId}>`);
        return interaction.reply({content:lines.join('\n')||'保存済みロールはありません。',ephemeral:true});
      }

      if (n === 'role-remove') {
        const g=guildData(store,interaction.guildId);
        const role=interaction.options.getRole('role',true);
        const before=(g.roleOptions||[]).length;
        g.roleOptions=(g.roleOptions||[]).filter(x=>x.roleId!==role.id);
        saveStore(store);
        return interaction.reply({content:before!==g.roleOptions.length?'✅ 保存済みロールを削除しました。':'❌ 登録されていません。',ephemeral:true});
      }

      if (n === 'ticket-panel') {
        return interaction.reply({
          embeds:[new EmbedBuilder().setTitle('🎫 サポートチケット').setDescription('ボタンを押してチケットを作成してください。')],
          components:[new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket:create').setLabel('チケット作成').setStyle(ButtonStyle.Primary)
          )]
        });
      }

      if (n === 'ticket-settings') {
        const g=guildData(store,interaction.guildId);
        const category=interaction.options.getChannel('category');
        const support=interaction.options.getRole('support_role');
        if(!category&&!support)return interaction.reply({content:'❌ カテゴリまたはサポートロールを指定してください。',ephemeral:true});
        if(category)g.ticketCategoryId=category.id;
        if(support)g.ticketSupportRoleId=support.id;
        saveStore(store);
        return interaction.reply({
          content:`✅ チケット設定を保存しました。\nカテゴリ: ${g.ticketCategoryId?`<#${g.ticketCategoryId}>`:'未設定'}\nサポートロール: ${g.ticketSupportRoleId?`<@&${g.ticketSupportRoleId}>`:'未設定'}`,
          ephemeral:true
        });
      }

      if (n === 'ticket-status') {
        const g=guildData(store,interaction.guildId);
        return interaction.reply({
          content:`🔒 **チケット設定**\nカテゴリ: ${g.ticketCategoryId?`<#${g.ticketCategoryId}>`:'未設定'}\nサポートロール: ${g.ticketSupportRoleId?`<@&${g.ticketSupportRoleId}>`:'未設定'}\nオープン: ${Object.values(store.tickets||{}).filter(t=>t.guildId===interaction.guildId&&t.status==='open').length}件`,
          ephemeral:true
        });
      }

      if (n === 'autoreply-add') {
        const g=guildData(store,interaction.guildId);
        const keyword=interaction.options.getString('keyword',true);
        const reply=interaction.options.getString('reply',true);
        const mode=interaction.options.getString('mode') || 'contains';
        g.autoReplies[keyword]={reply,mode};
        saveStore(store);
        return interaction.reply({content:`✅ 自動返信を追加しました。（${mode==='exact'?'完全一致':'部分一致'}）`,ephemeral:true});
      }

      if (n === 'autoreply-remove') {
        const g=guildData(store,interaction.guildId);
        delete g.autoReplies[interaction.options.getString('keyword',true)];
        saveStore(store);
        return interaction.reply({content:'✅ 自動返信を削除しました。',ephemeral:true});
      }

      if (n === 'autoreply-list') {
        const g=guildData(store,interaction.guildId);
        const lines=Object.entries(g.autoReplies||{}).map(([k,v])=>{
          const data=typeof v==='string'?{reply:v,mode:'contains'}:v;
          return `• **${k}** [${data.mode==='exact'?'完全':'部分'}] → ${data.reply}`;
        });
        return interaction.reply({content:lines.join('\n')||'自動返信はありません。',ephemeral:true});
      }

      if (n === 'guild-settings') {
        const g=guildData(store,interaction.guildId);
        const j=interaction.options.getChannel('join_log');
        const l=interaction.options.getChannel('leave_log');
        const e=interaction.options.getChannel('earthquake');
        const w=interaction.options.getChannel('weather');
        if(j)g.joinLogChannelId=j.id;
        if(l)g.leaveLogChannelId=l.id;
        if(e)g.earthquakeChannelId=e.id;
        if(w)g.weatherChannelId=w.id;
        saveStore(store);
        return interaction.reply({content:'✅ サーバー設定を保存しました。',ephemeral:true});
      }

      if (n === 'guild-status') {
        const g=guildData(store,interaction.guildId);
        return interaction.reply({
          content:`🔒 **サーバー設定**\n参加通知: ${g.joinLogChannelId?`<#${g.joinLogChannelId}>`:'未設定'}\n退出通知: ${g.leaveLogChannelId?`<#${g.leaveLogChannelId}>`:'未設定'}\n天気通知: ${g.weatherChannelId?`<#${g.weatherChannelId}>`:'未設定'}\n地震通知: ${g.earthquakeChannelId?`<#${g.earthquakeChannelId}>`:'未設定'}\n認証ロール: ${g.verificationRoleId?`<@&${g.verificationRoleId}>`:'未設定'}\n認証承認通知先: ${g.verificationReviewChannelId?`<#${g.verificationReviewChannelId}>`:'未設定'}\nチケットカテゴリ: ${g.ticketCategoryId?`<#${g.ticketCategoryId}>`:'未設定'}\nサポートロール: ${g.ticketSupportRoleId?`<@&${g.ticketSupportRoleId}>`:'未設定'}`,
          ephemeral:true
        });
      }

      if (n === 'setting') {
        const g=guildData(store,interaction.guildId);
        const key=interaction.options.getString('key',true);
        const value=interaction.options.getString('value',true).trim();
        const map={
          verification_role_id:'verificationRoleId',
          welcome_channel_id:'joinLogChannelId',
          leave_channel_id:'leaveLogChannelId',
          ticket_category_id:'ticketCategoryId',
          ticket_support_role_id:'ticketSupportRoleId',
          earthquake_channel_id:'earthquakeChannelId',
          weather_channel_id:'weatherChannelId'
        };
        g[map[key]]=value;
        saveStore(store);
        return interaction.reply({content:'✅ 旧版互換設定を保存しました。',ephemeral:true});
      }

      if (n === 'news-source-add') {
        const g=guildData(store,interaction.guildId);
        const name=interaction.options.getString('name',true).trim();
        const feedUrl=interaction.options.getString('feed_url',true).trim();
        const channelUrl=interaction.options.getString('channel_url',true).trim();
        if(!validNewsUrl(feedUrl))return interaction.reply({content:'❌ RSS/Atom URLが正しくありません。',ephemeral:true});
        const parsed=parseDiscordChannelUrl(channelUrl,interaction.guildId);
        if(!parsed)return interaction.reply({content:'❌ DiscordチャンネルURLが正しくないか、このサーバーのチャンネルではありません。',ephemeral:true});
        const ch=interaction.guild.channels.cache.get(parsed.channelId)||await interaction.guild.channels.fetch(parsed.channelId).catch(()=>null);
        if(!ch?.isTextBased())return interaction.reply({content:'❌ 指定チャンネルへ投稿できません。',ephemeral:true});
        await interaction.deferReply({ephemeral:true});
        let feed;
        try{feed=await fetchNewsFeed({feedUrl});}catch(e){console.error(e);return interaction.editReply('❌ フィードを取得できません。通常の記事URLではなくRSS/Atom URLを指定してください。');}
        const id=g.nextNewsSourceId++;
        const source={id,name:name.slice(0,80),feedUrl,channelId:parsed.channelId,createdAt:new Date().toISOString()};
        g.newsSources.push(source); g.newsSeen[id]=(feed.items||[]).slice(0,50).map(newsItemKey); saveStore(store);
        return interaction.editReply(`✅ NEWSソース #${id} **${source.name}** を登録しました。\n投稿先: <#${source.channelId}>\n次の新着から通知します。`);
      }
      if (n === 'news-source-remove') {
        const g=guildData(store,interaction.guildId),id=interaction.options.getInteger('id',true),source=g.newsSources.find(x=>x.id===id);
        if(!source)return interaction.reply({content:'❌ NEWSソースIDが見つかりません。',ephemeral:true});
        g.newsSources=g.newsSources.filter(x=>x.id!==id);delete g.newsSeen[id];saveStore(store);
        return interaction.reply({content:`✅ #${id} ${source.name} を削除しました。`,ephemeral:true});
      }
      if (n === 'news-list') {
        const g=guildData(store,interaction.guildId),lines=g.newsSources.map(s=>`**#${s.id} ${s.name}**\n投稿先: <#${s.channelId}>\nRSS: ${s.feedUrl}`);
        const pages=splitDiscordBlocks(`📰 **NEWS ALERTS**\n自動通知: **${g.newsAutoEnabled?'ON':'OFF'}**\n登録: **${g.newsSources.length}件**`,lines,1900);
        await interaction.reply({content:pages[0],ephemeral:true});for(const p of pages.slice(1))await interaction.followUp({content:p,ephemeral:true});return;
      }
      if (n === 'news-auto') {
        const g=guildData(store,interaction.guildId),enabled=interaction.options.getBoolean('enabled',true);
        if(enabled&&!g.newsSources.length)return interaction.reply({content:'❌ 先にNEWSソースを登録してください。',ephemeral:true});
        g.newsAutoEnabled=enabled;saveStore(store);return interaction.reply({content:`📰 NEWS自動通知: **${enabled?'ON':'OFF'}**`,ephemeral:true});
      }
      if (n === 'news-test') {
        const g=guildData(store,interaction.guildId),id=interaction.options.getInteger('id',true),source=g.newsSources.find(x=>x.id===id);
        if(!source)return interaction.reply({content:'❌ NEWSソースIDが見つかりません。',ephemeral:true});
        await interaction.deferReply({ephemeral:true});
        try{
          const feed=await fetchNewsFeed(source),item=feed.items?.[0];if(!item)return interaction.editReply('❌ 記事がありません。');
          const ch=interaction.guild.channels.cache.get(source.channelId)||await interaction.guild.channels.fetch(source.channelId).catch(()=>null);
          if(!ch?.isTextBased())return interaction.editReply('❌ 投稿先を取得できません。');
          await ch.send({content:`📰 **${source.name} / テスト通知**`,embeds:[newsEmbed(source,item)]});
          return interaction.editReply(`✅ <#${source.channelId}> に送信しました。`);
        }catch(e){console.error(e);return interaction.editReply('❌ NEWS取得または投稿に失敗しました。');}
      }

      if (n === 'weather') {
        const g=guildData(store,interaction.guildId);
        const selected=interaction.options.getString('region');

        let regions;
        if(selected){
          const expanded=expandWeatherRegion(selected);
          regions=expanded.length ? expanded : [selected];
        } else {
          regions=[...(g.weatherRegions || [])];
        }

        if(!regions.length){
          return interaction.reply({
            content:'ℹ️ このサーバーでは天気地域がまだ登録されていません。サーバー管理者が `/weather-register` で登録してください。',
            ephemeral:true
          });
        }

        await interaction.deferReply();
        const pages=await buildWeatherPages(regions);
        return replyWeatherPages(interaction,pages);
      }

      if (n === 'weather-register') {
        const g=guildData(store,interaction.guildId);
        const action=interaction.options.getString('action',true);
        const selected=interaction.options.getString('region');

        if(action==='clear'){
          g.weatherRegions=[];
          g.weatherChannelRoutes={};
          g.lastWeatherPostDate=null;
          saveStore(store);
          return interaction.reply({content:'✅ 天気地域をすべて削除しました。',ephemeral:true});
        }

        if(!selected){
          return interaction.reply({content:'❌ 追加または削除する地域を指定してください。',ephemeral:true});
        }

        const expanded=expandWeatherRegion(selected);
        if(!expanded.length){
          return interaction.reply({content:'❌ 地域が見つかりません。都道府県名・地方名・全国47都道府県から選択してください。',ephemeral:true});
        }

        if(action==='add'){
          g.weatherRegions=[...new Set([...(g.weatherRegions || []),...expanded])];
          g.lastWeatherPostDate=null;
          saveStore(store);
          return interaction.reply({
            content:`✅ **${selected}** を追加しました。${expanded.length > 1 ? `（${expanded.length}都道府県）` : ''}\n現在の登録数: **${g.weatherRegions.length}都道府県**`,
            ephemeral:true
          });
        }

        if(action==='remove'){
          const removeSet=new Set(expanded);
          g.weatherRegions=(g.weatherRegions || []).filter(x=>!removeSet.has(x));
          g.weatherChannelRoutes ??= {};
          for(const pref of expanded)delete g.weatherChannelRoutes[pref];
          g.lastWeatherPostDate=null;
          saveStore(store);
          return interaction.reply({
            content:`✅ **${selected}** を削除しました。\n現在の登録数: **${g.weatherRegions.length}都道府県**`,
            ephemeral:true
          });
        }
      }

      if (n === 'weather-list') {
        const g=guildData(store,interaction.guildId);
        const registered=new Set(g.weatherRegions||[]);
        const allRegistered=[...registered].filter(p=>PREFECTURES.some(([name])=>name===p));
        g.weatherChannelRoutes ??= {};
        const areaLines=[];

        for(const [areaName,prefs] of Object.entries(WEATHER_AREAS)){
          const inArea=prefs.filter(p=>registered.has(p));
          if(!inArea.length)continue;
          const details=inArea.map(pref=>{
            const channelId=g.weatherChannelRoutes[pref] || g.weatherChannelId;
            return `${pref} → ${channelId?`<#${channelId}>`:'⚠️ 未設定'}`;
          });
          areaLines.push(`**${areaName} (${inArea.length}/${prefs.length})**\n${details.join('\n')}`);
        }

        const header=`🔒 **登録済み天気地域・投稿先**\n`
          + `合計: **${allRegistered.length}/47都道府県**\n`
          + `自動投稿: **${g.weatherAutoEnabled?'ON':'OFF'}**\n`
          + `投稿時刻: **${g.weatherAutoTime||'07:00'}**（日本時間）\n`
          + `共通投稿先: ${g.weatherChannelId?`<#${g.weatherChannelId}>`:'⚠️ 未設定'}`
          + (!allRegistered.length?`\n\n⚠️ 地域が未登録です。`:'');
        const pages=splitDiscordBlocks(header,areaLines,1900);
        await interaction.reply({content:pages[0],ephemeral:true});
        for(const page of pages.slice(1))await interaction.followUp({content:page,ephemeral:true});
        return;
      }

      if (n === 'weather-channel') {
        const g=guildData(store,interaction.guildId);
        const selected=interaction.options.getString('region',true);
        const channel=interaction.options.getChannel('channel',true);
        const expanded=expandWeatherRegion(selected);
        if(!expanded.length){
          return interaction.reply({content:'❌ 地域が見つかりません。',ephemeral:true});
        }

        g.weatherChannelRoutes ??= {};
        for(const pref of expanded)g.weatherChannelRoutes[pref]=channel.id;
        saveStore(store);

        return interaction.reply({
          content:`✅ **${selected}** の天気投稿先を ${channel} に設定しました。\n`
            + `${expanded.length>1?`対象 ${expanded.length}都道府県: `:''}${expanded.join('、')}`,
          ephemeral:true
        });
      }

      if (n === 'weather-channel-remove') {
        const g=guildData(store,interaction.guildId);
        const selected=interaction.options.getString('region',true);
        const expanded=expandWeatherRegion(selected);
        if(!expanded.length){
          return interaction.reply({content:'❌ 地域が見つかりません。',ephemeral:true});
        }
        g.weatherChannelRoutes ??= {};
        for(const pref of expanded)delete g.weatherChannelRoutes[pref];
        saveStore(store);
        return interaction.reply({
          content:`✅ **${selected}** の個別投稿先設定を解除しました。\n`
            + `以後はサーバー共通投稿先 ${g.weatherChannelId?`<#${g.weatherChannelId}>`:'（未設定）'} を使用します。`,
          ephemeral:true
        });
      }

      if (n === 'weather-admin') {
        const g=guildData(store,interaction.guildId);
        const registered=new Set(g.weatherRegions||[]);
        const areaLines=[];
        for(const [areaName,prefs] of Object.entries(WEATHER_AREAS)){
          const inArea=prefs.filter(p=>registered.has(p));
          const missing=prefs.filter(p=>!registered.has(p));
          const routeDetails=inArea.map(pref=>{
            const channelId=(g.weatherChannelRoutes||{})[pref] || g.weatherChannelId;
            return `${pref} → ${channelId?`<#${channelId}>`:'⚠️ 投稿先未設定'}`;
          });
          areaLines.push(`**${areaName}　${inArea.length} / ${prefs.length}県**\n${routeDetails.length?routeDetails.join('\n'):'登録済み: なし'}${missing.length&&inArea.length?`\n未登録: ${missing.join('、')}`:''}`);
        }
        const allRegistered=[...registered].filter(p=>PREFECTURES.some(([name])=>name===p));
        const header=`🔒 **天気地域 管理者ページ**\n自動投稿: ${g.weatherAutoEnabled?'ON':'OFF'}\n投稿時刻: ${g.weatherAutoTime||'07:00'}（日本時間）\n共通投稿先: ${g.weatherChannelId?`<#${g.weatherChannelId}>`:'未設定'}\n合計登録: **${allRegistered.length} / 47都道府県**`;
        const pages=splitDiscordBlocks(header,areaLines,1900);
        await interaction.reply({content:pages[0],ephemeral:true});
        for(const page of pages.slice(1)) await interaction.followUp({content:page,ephemeral:true});
        return;
      }

      if (n === 'weather-auto') {
        const g=guildData(store,interaction.guildId);
        const enabled=interaction.options.getBoolean('enabled',true);
        const raw=interaction.options.getString('time');
        const channel=interaction.options.getChannel('channel');

        if(raw){
          const value=raw.trim();
          if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)){
            return interaction.reply({content:'❌ 時刻は `07:00` や `18:30` のように24時間表記で入力してください。',ephemeral:true});
          }
          g.weatherAutoTime=value;
          g.lastWeatherPostDate=null;
        }

        if(channel)g.weatherChannelId=channel.id;

        const registeredForAuto=g.weatherRegions||[];
        const missingRoute=registeredForAuto.filter(pref=>!(g.weatherChannelRoutes||{})[pref] && !g.weatherChannelId);
        if(enabled && missingRoute.length){
          return interaction.reply({
            content:`❌ 投稿先が未設定の地域があります: ${missingRoute.join('、')}\n`
              + '`/weather-channel` で地域ごとの投稿先を設定するか、`/weather-auto channel:` で共通投稿先を設定してください。',
            ephemeral:true
          });
        }

        if(enabled && !(g.weatherRegions||[]).length){
          return interaction.reply({
            content:'❌ 自動投稿をONにする前に天気地域を1つ以上登録してください。\n例: `/weather-register action:追加 region:関東地方`',
            ephemeral:true
          });
        }

        g.weatherAutoEnabled=enabled;
        saveStore(store);
        return interaction.reply({
          content:`✅ **自動天気設定を保存しました**\n`
            + `自動投稿: **${g.weatherAutoEnabled?'ON':'OFF'}**\n`
            + `投稿時刻: **${g.weatherAutoTime||'07:00'}**（日本時間）\n`
            + `共通投稿先: ${g.weatherChannelId?`<#${g.weatherChannelId}>`:'未設定（地域別設定を使用可能）'}\n`
            + `登録地域: **${(g.weatherRegions||[]).length}/47都道府県**`,
          ephemeral:true
        });
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
        const g=guildData(store,interaction.guildId);
        g.earthquakeAutoEnabled=interaction.options.getBoolean('enabled',true);
        saveStore(store);
        return interaction.reply({
          content:`✅ 自動地震速報: ${g.earthquakeAutoEnabled?'ON':'OFF'}\n⚡ 新着地震を約${config.earthquakePollSeconds}秒間隔で監視し、取得後すぐ投稿します。`,
          ephemeral:true
        });
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
        const url=interaction.options.getString('url',true);

        if (/(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\/)/i.test(url)) {
          return interaction.reply(`▶️ YouTube動画
${url}

※ YouTube URLはDiscord内プレビュー再生です。`);
        }

        const vc=interaction.member?.voice?.channel;
        if(!vc)return interaction.reply({content:'❌ 先にボイスチャンネルへ参加してください。',ephemeral:true});

        let s=players.get(interaction.guildId);
        if(!s){
          const connection=joinVoiceChannel({channelId:vc.id,guildId:interaction.guildId,adapterCreator:interaction.guild.voiceAdapterCreator});
          const player=createAudioPlayer();
          connection.subscribe(player);
          s={connection,player,queue:[],playing:false,current:null,volume:100,ffmpeg:null};
          player.on(AudioPlayerStatus.Idle,()=>{try{s.ffmpeg?.kill();}catch{} s.ffmpeg=null;s.playing=false;s.current=null;playNext(interaction.guildId).catch(console.error);});
          players.set(interaction.guildId,s);
        }

        s.queue.push(url);

        const controls=new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('music:pause').setLabel('⏸ 一時停止').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('music:resume').setLabel('▶ 再開').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('music:skip').setLabel('⏭ スキップ').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('music:stop').setLabel('⏹ 停止').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
          embeds:[new EmbedBuilder().setTitle('🎵 Music Player').setDescription(`キューに追加しました。
${url}`)],
          components:[controls]
        });
        if(!s.playing)playNext(interaction.guildId).catch(console.error);
        return;
      }
      if (n === 'queue') {
        const s=players.get(interaction.guildId);const lines=[];if(s?.current)lines.push(`▶️ ${s.current}`);if(s?.queue?.length)lines.push(...s.queue.map((x,k)=>`${k+1}. ${x}`));
        return interaction.reply(lines.join('\n')||'キューは空です。');
      }
      if (n === 'skip') { players.get(interaction.guildId)?.player.stop(true); return interaction.reply('⏭️ スキップしました。'); }
      if (n === 'stop') {
        const s=players.get(interaction.guildId);if(s){s.queue.length=0;try{s.ffmpeg?.kill();}catch{}s.player.stop(true);s.connection.destroy();players.delete(interaction.guildId);}
        return interaction.reply('⏹️ 停止しました。');
      }
      if (n === 'pause') {
        const s=players.get(interaction.guildId);
        if(!s)return interaction.reply({content:'再生中の音楽はありません。',ephemeral:true});
        s.player.pause();
        return interaction.reply('⏸️ 一時停止しました。');
      }
      if (n === 'resume') {
        const s=players.get(interaction.guildId);
        if(!s)return interaction.reply({content:'再生中の音楽はありません。',ephemeral:true});
        s.player.unpause();
        return interaction.reply('▶️ 再開しました。');
      }
      if (n === 'nowplaying') {
        const s=players.get(interaction.guildId);
        return interaction.reply(s?.current ? `🎵 現在再生中\n${s.current}` : '現在再生中の音楽はありません。');
      }
      if (n === 'volume') {
        const s=players.get(interaction.guildId);
        if(!s)return interaction.reply({content:'再生中の音楽はありません。',ephemeral:true});
        const v=interaction.options.getInteger('percent',true);
        s.volume=v;
        s.player.state.resource?.volume?.setVolume(v/100);
        return interaction.reply(`🔊 音量を ${v}% に変更しました。`);
      }
      if (n === 'video') return interaction.reply(`🎬 ${interaction.options.getString('url',true)}`);
    }

    if (interaction.isButton()) {
      const [kind,a,b]=interaction.customId.split(':');

      if (kind === 'verify') {
        const roleId=guildData(store,interaction.guildId).verificationRoleId;
        if(!roleId)return interaction.reply({content:'❌ 認証ロール未設定です。',ephemeral:true});

        const role=await interaction.guild.roles.fetch(roleId).catch(()=>null);
        if(!role)return interaction.reply({content:'❌ 認証ロールが見つかりません。管理者が認証パネルを作り直してください。',ephemeral:true});

        const problem=rolePanelProblem(interaction.guild,role);
        if(problem)return interaction.reply({content:`❌ ${problem}`,ephemeral:true});

        const member=await interaction.guild.members.fetch(interaction.user.id).catch(()=>null);
        if(!member)return interaction.reply({content:'❌ メンバー情報を取得できませんでした。',ephemeral:true});

        if(member.roles.cache.has(role.id)){
          return interaction.reply({content:`✅ すでに **${role.name}** が付与されています。`,ephemeral:true});
        }

        const existing=Object.values(store.verificationRequests || {}).find(
          r=>r.guildId===interaction.guildId && r.userId===interaction.user.id && r.status==='pending'
        );
        if(existing){
          return interaction.reply({
            content:`⏳ すでに認証申請済みです。管理者の承認をお待ちください。（申請 #${existing.id}）`,
            ephemeral:true
          });
        }

        const id=store.nextVerificationRequestId++;
        store.verificationRequests[id]={
          id,
          guildId:interaction.guildId,
          userId:interaction.user.id,
          roleId,
          status:'pending',
          createdAt:new Date().toISOString(),
          reviewedAt:null,
          reviewedBy:null
        };
        saveStore(store);

        const g=guildData(store,interaction.guildId);
        let notifySent=false;
        if(g.verificationReviewChannelId){
          const reviewChannel=interaction.guild.channels.cache.get(g.verificationReviewChannelId)
            || await interaction.guild.channels.fetch(g.verificationReviewChannelId).catch(()=>null);

          if(reviewChannel?.isTextBased()){
            const reviewEmbed=new EmbedBuilder()
              .setTitle(`✅ 認証申請 #${id}`)
              .setDescription(`<@${interaction.user.id}> から認証申請があります。`)
              .addFields(
                {name:'申請者',value:`<@${interaction.user.id}>`},
                {name:'ユーザーID',value:interaction.user.id},
                {name:'承認後のロール',value:`<@&${roleId}>`},
                {name:'申請日時',value:new Date().toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}
              )
              .setThumbnail(interaction.user.displayAvatarURL())
              .setTimestamp();

            const reviewRow=new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`verifyadmin:${id}:approve`)
                .setLabel('承認する')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`verifyadmin:${id}:reject`)
                .setLabel('却下する')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
            );

            const sent=await reviewChannel.send({
              content:'🔔 **新しい認証申請があります。**',
              embeds:[reviewEmbed],
              components:[reviewRow]
            }).catch(e=>{
              console.error('verification review notification error',e);
              return null;
            });

            if(sent){
              store.verificationRequests[id].reviewMessageId=sent.id;
              store.verificationRequests[id].reviewChannelId=reviewChannel.id;
              saveStore(store);
              notifySent=true;
            }
          }
        }

        return interaction.reply({
          content:notifySent
            ? `✅ 認証申請を送信しました。（申請 #${id}）\n管理者へ通知しました。承認されると **${role.name}** が付与されます。`
            : `✅ 認証申請を保存しました。（申請 #${id}）\n⚠️ 承認通知チャンネルへの通知に失敗しました。管理者は \`/verify-admin\` から確認できます。`,
          ephemeral:true
        });
      }

      if (kind === 'verifyadmin') {
        if(!hasConfiguredAdminRole(interaction)){
          return interaction.reply({content:'❌ 指定された管理者ロールが必要です。',ephemeral:true});
        }

        const req=store.verificationRequests?.[a];
        if(!req || req.guildId!==interaction.guildId){
          return interaction.reply({content:'❌ 認証申請が見つかりません。',ephemeral:true});
        }
        if(req.status!=='pending'){
          return interaction.reply({content:`ℹ️ この申請はすでに **${req.status==='approved'?'承認':'却下'}済み** です。`,ephemeral:true});
        }

        req.reviewedAt=new Date().toISOString();
        req.reviewedBy=interaction.user.id;

        if(b==='reject'){
          req.status='rejected';
          saveStore(store);
          const user=await client.users.fetch(req.userId).catch(()=>null);
          await user?.send(`❌ ${interaction.guild.name} の認証申請 #${req.id} は却下されました。`).catch(()=>{});
          return interaction.update({
            content:`❌ 認証申請 #${req.id} を却下しました。`,
            embeds:[],
            components:[]
          });
        }

        if(b==='approve'){
          const role=await interaction.guild.roles.fetch(req.roleId).catch(()=>null);
          const member=await interaction.guild.members.fetch(req.userId).catch(()=>null);

          if(!role || !member){
            return interaction.reply({content:'❌ 対象メンバーまたは認証ロールを取得できません。',ephemeral:true});
          }

          const problem=rolePanelProblem(interaction.guild,role);
          if(problem){
            return interaction.reply({content:`❌ 承認できません。${problem}`,ephemeral:true});
          }

          try{
            if(!member.roles.cache.has(role.id)){
              await member.roles.add(role,`認証申請 #${req.id} を管理者が承認`);
            }
            req.status='approved';
            saveStore(store);

            const user=await client.users.fetch(req.userId).catch(()=>null);
            await user?.send(`✅ ${interaction.guild.name} の認証申請 #${req.id} が承認され、${role.name} が付与されました。`).catch(()=>{});

            return interaction.update({
              content:`✅ 認証申請 #${req.id} を承認し、<@${req.userId}> に <@&${role.id}> を付与しました。`,
              embeds:[],
              components:[]
            });
          }catch(e){
            console.error('verify approve error',e);
            return interaction.reply({
              content:'❌ ロール付与に失敗しました。BOTの「ロールの管理」権限とロール順序を確認してください。',
              ephemeral:true
            });
          }
        }
      }
      if (kind === 'role') {
        const role=await interaction.guild.roles.fetch(a).catch(()=>null);
        if(!role){
          return interaction.reply({content:'❌ このロールは削除されているか、取得できません。管理者にパネルの作り直しを依頼してください。',ephemeral:true});
        }

        const problem=rolePanelProblem(interaction.guild,role);
        if(problem){
          return interaction.reply({content:`❌ ${problem}`,ephemeral:true});
        }

        const member=await interaction.guild.members.fetch(interaction.user.id).catch(()=>null);
        if(!member){
          return interaction.reply({content:'❌ メンバー情報を取得できませんでした。',ephemeral:true});
        }

        const has=member.roles.cache.has(role.id);

        try{
          if(has){
            await member.roles.remove(role,'ロールパネルから解除');
            return interaction.reply({content:`✅ **${role.name}** を外しました。`,ephemeral:true});
          }

          await member.roles.add(role,'ロールパネルから付与');
          return interaction.reply({content:`✅ **${role.name}** を付与しました。`,ephemeral:true});
        }catch(e){
          console.error('role panel error',e);
          return interaction.reply({
            content:'❌ ロールを変更できませんでした。BOTの「ロールの管理」権限とロール順序を確認してください。',
            ephemeral:true
          });
        }
      }
      if (kind === 'music') {
        const s=players.get(interaction.guildId);
        if(a==='stop'){
          if(s){
            s.queue.length=0;
            try{s.ffmpeg?.kill();}catch{}
            s.player.stop(true);
            try{s.connection.destroy();}catch{}
            players.delete(interaction.guildId);
          }
          return interaction.reply({content:'⏹️ 再生を停止しました。',ephemeral:true});
        }
        if(!s)return interaction.reply({content:'現在再生中の音楽はありません。',ephemeral:true});
        if(a==='pause'){s.player.pause();return interaction.reply({content:'⏸️ 一時停止しました。',ephemeral:true});}
        if(a==='resume'){s.player.unpause();return interaction.reply({content:'▶️ 再開しました。',ephemeral:true});}
        if(a==='skip'){s.player.stop(true);return interaction.reply({content:'⏭️ スキップしました。',ephemeral:true});}
      }

      if (kind === 'ticket' && a === 'create') {
        const g=guildData(store,interaction.guildId);
        const overwrites=[
          {id:interaction.guild.id,deny:[PermissionFlagsBits.ViewChannel]},
          {id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}
        ];
        if(g.ticketSupportRoleId){
          overwrites.push({
            id:g.ticketSupportRoleId,
            allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]
          });
        }

        const ch=await interaction.guild.channels.create({
          name:`ticket-${interaction.user.username}`.slice(0,90),
          type:ChannelType.GuildText,
          parent:g.ticketCategoryId || undefined,
          permissionOverwrites:overwrites
        });

        const ticketId=store.nextTicketId++;
        store.tickets[ticketId]={
          id:ticketId,guildId:interaction.guildId,channelId:ch.id,userId:interaction.user.id,
          status:'open',createdAt:new Date().toISOString()
        };
        saveStore(store);

        await ch.send({
          content:`<@${interaction.user.id}>`,
          embeds:[new EmbedBuilder().setTitle(`🎫 チケット #${ticketId}`).setDescription('サポート内容を送信してください。')],
          components:[new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`ticketclose:${ticketId}`).setLabel('チケットを閉じる').setStyle(ButtonStyle.Danger)
          )]
        });
        return interaction.reply({content:`✅ ${ch} を作成しました。`,ephemeral:true});
      }

      if (kind === 'ticketclose') {
        const ticket=store.tickets?.[a];
        if(!ticket||ticket.guildId!==interaction.guildId)return interaction.reply({content:'❌ チケット情報がありません。',ephemeral:true});

        const g=guildData(store,interaction.guildId);
        const canClose =
          interaction.user.id===ticket.userId ||
          interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
          isBotOwner(interaction.user.id) ||
          Boolean(g.ticketSupportRoleId && interaction.member?.roles?.cache?.has(g.ticketSupportRoleId));

        if(!canClose)return interaction.reply({content:'❌ チケットを閉じる権限がありません。',ephemeral:true});
        ticket.status='closed';
        ticket.closedAt=new Date().toISOString();
        saveStore(store);
        await interaction.reply('🔒 チケットを閉じます。');
        setTimeout(()=>interaction.channel?.delete('チケット終了').catch(()=>{}),1500);
        return;
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
          const p=shop.products.find(x=>x.id===order.productId);
          if(!p)return interaction.reply({content:'❌ 商品が見つかりません。',ephemeral:true});
          if(p.stock>=0 && p.stock<order.qty)return interaction.reply({content:'❌ 在庫不足です。',ephemeral:true});

          if(p.stock>=0)p.stock-=order.qty;
          order.status='completed';
          order.completedAt=new Date().toISOString();
          saveStore(store);

          const user=await client.users.fetch(order.userId).catch(()=>null);
          const dm=[
            `✅ 注文 #${order.id} 完了`,
            `商品: ${p.name} × ${order.qty}`,
            p.delivery ? `\n${p.delivery}` : '',
            p.deliveryFileUrl ? `\nファイル: ${p.deliveryFileUrl}` : ''
          ].join('\n');
          await user?.send(dm).catch(()=>{});

          if(p.roleId){
            const member=await interaction.guild.members.fetch(order.userId).catch(()=>null);
            const role=await interaction.guild.roles.fetch(p.roleId).catch(()=>null);
            if(member&&role&&!rolePanelProblem(interaction.guild,role)){
              await member.roles.add(role,`購入商品 ${p.name} の特典ロール`).catch(()=>{});
            }
          }

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
      if(p.stock>=0 && qty>p.stock)return interaction.reply({content:`❌ 在庫不足です。現在 ${p.stock} 個です。`,ephemeral:true});
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
    console.error('❌ Interaction処理エラー:', e);
    if(interaction.isRepliable()){
      const m={content:'❌ エラーが発生しました。コンソールを確認してください。',ephemeral:true};
      if(interaction.replied||interaction.deferred)interaction.followUp(m).catch(()=>{});else interaction.reply(m).catch(()=>{});
    }
  }
});

async function playNext(gid){
  const s=players.get(gid);
  if(!s||s.playing||!s.queue.length)return;

  const url=s.queue.shift();
  try{
    const {proc,resource}=createFfmpegAudio(url);
    s.current=url;
    s.playing=true;
    s.ffmpeg=proc;
    resource.volume?.setVolume((s.volume??100)/100);

    proc.on('error',e=>{
      console.error('ffmpeg process error',e);
      s.playing=false;
      s.current=null;
      s.ffmpeg=null;
      try{s.player.stop(true);}catch{}
    });

    proc.on('close',code=>{
      if(code && code!==0)console.error(`ffmpeg exited: ${code}`);
    });

    s.player.play(resource);
  }catch(e){
    s.current=null;
    s.playing=false;
    s.ffmpeg=null;
    console.error('playNext',e);
    return playNext(gid);
  }
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

// NEWS ALERTS: RSS/Atomを60秒ごとに確認
setInterval(async()=>{
  for(const guild of client.guilds.cache.values()){
    const g=guildData(store,guild.id);
    if(!g.newsAutoEnabled||!g.newsSources?.length)continue;
    g.newsSeen??={};
    for(const source of g.newsSources){
      try{
        const feed=await fetchNewsFeed(source),items=(feed.items||[]).slice(0,20),seen=new Set(g.newsSeen[source.id]||[]);
        const fresh=items.filter(i=>!seen.has(newsItemKey(i))).reverse();
        if(!fresh.length)continue;
        const ch=guild.channels.cache.get(source.channelId)||await guild.channels.fetch(source.channelId).catch(()=>null);
        if(!ch?.isTextBased())continue;
        for(const item of fresh.slice(-10))await ch.send({content:`📰 **${source.name} / 新着ニュース**`,embeds:[newsEmbed(source,item)]});
        g.newsSeen[source.id]=[...new Set([...items.map(newsItemKey),...seen])].slice(0,100);saveStore(store);
      }catch(e){console.error(`news watcher ${guild.id}/${source.id}`,e);}
    }
  }
},60*1000);

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
      const quakeChannel=guild.channels.cache.get(g.earthquakeChannelId)
        || await guild.channels.fetch(g.earthquakeChannelId).catch(()=>null);
      if(quakeChannel?.isTextBased())await quakeChannel.send(earthquakeText(item)).catch(()=>{});
    }
  }catch(e){console.error('earthquake watcher',e);}
},config.earthquakePollSeconds*1000);

setInterval(async()=>{
  const now=new Date();
  const parts=new Intl.DateTimeFormat('ja-JP',{
    timeZone:'Asia/Tokyo',
    year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hour12:false
  }).formatToParts(now);
  const get=(type)=>parts.find(p=>p.type===type)?.value;
  const currentTime=`${get('hour')}:${get('minute')}`;
  const dateKey=`${get('year')}-${get('month')}-${get('day')}`;

  for(const guild of client.guilds.cache.values()){
    const g=guildData(store,guild.id);
    const postTime=g.weatherAutoTime || '07:00';

    if(!g.weatherAutoEnabled || !g.weatherRegions.length)continue;
    if(currentTime!==postTime || g.lastWeatherPostDate===dateKey)continue;

    try{
      g.weatherChannelRoutes ??= {};
      const groups=new Map();
      for(const pref of g.weatherRegions){
        const channelId=g.weatherChannelRoutes[pref] || g.weatherChannelId;
        if(!channelId)continue;
        if(!groups.has(channelId))groups.set(channelId,[]);
        groups.get(channelId).push(pref);
      }
      if(!groups.size)continue;

      let sentAny=false;
      for(const [channelId,regions] of groups){
        const ch=guild.channels.cache.get(channelId)
          || await guild.channels.fetch(channelId).catch(()=>null);
        if(!ch?.isTextBased())continue;
        const pages=await buildWeatherPages(regions);
        for(const page of pages)await ch.send(page);
        sentAny=true;
      }

      if(sentAny){
        g.lastWeatherPostDate=dateKey;
        saveStore(store);
      }
    }catch(e){
      console.error(`weather auto ${guild.id}`,e);
    }
  }
},15*1000);

client.login(config.token);
