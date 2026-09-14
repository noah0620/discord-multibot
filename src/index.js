
import "dotenv/config";
import {
 Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle
} from "discord.js";
import {joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus} from "@discordjs/voice";
import {loadStore, saveStore} from "./store.js";
import {searchRegionChoices} from "./regions.js";

if(!process.env.DISCORD_TOKEN) throw new Error("DISCORD_TOKEN が未設定です");

const client=new Client({intents:[
 GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,
 GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates
]});
const store=loadStore();
const players=new Map();

function gs(id){ store.guilds[id] ??= {weatherRegions:[],earthquakeRegions:[],minIntensity:3}; return store.guilds[id]; }

async function geocode(name){
 const u=new URL("https://geocoding-api.open-meteo.com/v1/search");
 u.searchParams.set("name",name);u.searchParams.set("count","1");u.searchParams.set("language","ja");u.searchParams.set("format","json");
 const r=await fetch(u);const j=await r.json();return j.results?.[0]||null;
}
async function weatherText(name){
 const g=await geocode(name); if(!g) return `「${name}」を検索できませんでした。`;
 const u=new URL("https://api.open-meteo.com/v1/forecast");
 u.searchParams.set("latitude",g.latitude);u.searchParams.set("longitude",g.longitude);
 u.searchParams.set("current","temperature_2m,apparent_temperature,precipitation,wind_speed_10m");
 u.searchParams.set("daily","temperature_2m_max,temperature_2m_min,precipitation_probability_max");
 u.searchParams.set("timezone","Asia/Tokyo");
 const r=await fetch(u), j=await r.json();
 return `📍 ${g.name}${g.admin1?`（${g.admin1}）`:""}\n🌡 現在 ${j.current?.temperature_2m??"-"}℃ / 体感 ${j.current?.apparent_temperature??"-"}℃\n💧 降水 ${j.current?.precipitation??"-"} mm\n💨 風速 ${j.current?.wind_speed_10m??"-"} km/h\n📈 最高 ${j.daily?.temperature_2m_max?.[0]??"-"}℃ / 最低 ${j.daily?.temperature_2m_min?.[0]??"-"}℃\n☔ 降水確率 ${j.daily?.precipitation_probability_max?.[0]??"-"}%`;
}
async function latestEq(){
 const r=await fetch("https://api.p2pquake.net/v2/history?codes=551&limit=1"), j=await r.json(), e=j?.[0]?.earthquake;
 if(!e) return "地震情報を取得できませんでした。";
 return `🟠 ${e.time||"時刻不明"}\n震源: ${e.hypocenter?.name||"不明"}\nM${e.hypocenter?.magnitude??"?"} / 深さ ${e.hypocenter?.depth??"?"}km\n最大震度: ${e.maxScale??"不明"}`;
}

client.once(Events.ClientReady,c=>console.log(`Logged in as ${c.user.tag}`));

client.on(Events.InteractionCreate,async i=>{
 if(i.isAutocomplete()) return i.respond(searchRegionChoices(i.options.getFocused()));

 if(i.isButton() && i.customId.startsWith("role:")){
   const roleId=i.customId.slice(5), role=i.guild.roles.cache.get(roleId), m=i.member;
   if(!role) return i.reply({content:"ロールが見つかりません。",ephemeral:true});
   try{
     if(m.roles.cache.has(roleId)){await m.roles.remove(role);return i.reply({content:`「${role.name}」を解除しました。`,ephemeral:true});}
     await m.roles.add(role);return i.reply({content:`「${role.name}」を付与しました。`,ephemeral:true});
   }catch{return i.reply({content:"ロール権限またはBOTロール位置を確認してください。",ephemeral:true});}
 }
 if(!i.isChatInputCommand()) return;

 const n=i.commandName;
 if(n==="help") return i.reply({embeds:[new EmbedBuilder().setTitle("Discord MultiBot v3").setDescription(
   "🌤 /weather /weather-register\n🌍 /earthquake /earthquake-register\n🎭 /role-panel\n🗓 /schedule-post /schedule-list /schedule-cancel\n🛡 /moderation-rule\n🎵 /play /queue /skip /stop\n🎨 /ai-image /ai-video"
 )]});

 if(n==="weather"){await i.deferReply();return i.editReply(await weatherText(i.options.getString("region",true)));}
 if(n==="weather-register"){const g=gs(i.guildId),r=i.options.getString("region",true);if(!g.weatherRegions.includes(r))g.weatherRegions.push(r);saveStore(store);return i.reply(`天気通知地域: ${g.weatherRegions.join(" / ")}`);}
 if(n==="earthquake"){await i.deferReply();return i.editReply(await latestEq());}
 if(n==="earthquake-register"){const g=gs(i.guildId),r=i.options.getString("region",true),min=i.options.getInteger("min_intensity");if(!g.earthquakeRegions.includes(r))g.earthquakeRegions.push(r);if(min)g.minIntensity=min;saveStore(store);return i.reply(`地震通知地域: ${g.earthquakeRegions.join(" / ")} / 最低震度 ${g.minIntensity}`);}
 if(n==="role-panel"){
   const role=i.options.getRole("role",true),label=i.options.getString("label",true),emoji=i.options.getString("emoji");
   const b=new ButtonBuilder().setCustomId(`role:${role.id}`).setLabel(label).setStyle(ButtonStyle.Primary);if(emoji)b.setEmoji(emoji);
   return i.reply({embeds:[new EmbedBuilder().setTitle("ロール選択").setDescription("下のボタンで付与・解除できます。")],components:[new ActionRowBuilder().addComponents(b)]});
 }
 if(n==="schedule-post"){
   const ch=i.options.getChannel("channel",true),raw=i.options.getString("datetime",true),msg=i.options.getString("message",true),del=i.options.getInteger("delete_after_minutes");
   const when=new Date(raw.replace(" ","T")+":00+09:00");if(Number.isNaN(when.getTime()))return i.reply({content:"日時形式: 2026-09-15 20:00",ephemeral:true});
   const id=store.nextIds.schedule++;store.schedules.push({id,guildId:i.guildId,channelId:ch.id,message:msg,at:when.toISOString(),deleteAfterMinutes:del,done:false});saveStore(store);return i.reply(`予約 #${id} を登録しました。`);
 }
 if(n==="schedule-list"){const a=store.schedules.filter(x=>x.guildId===i.guildId&&!x.done);return i.reply(a.length?a.map(x=>`#${x.id} ${x.at} → <#${x.channelId}>`).join("\n"):"予約なし");}
 if(n==="schedule-cancel"){const id=i.options.getInteger("id",true),len=store.schedules.length;store.schedules=store.schedules.filter(x=>!(x.guildId===i.guildId&&x.id===id));saveStore(store);return i.reply(len!==store.schedules.length?`#${id} 削除完了`:"該当なし");}
 if(n==="moderation-rule"){const id=store.nextIds.rule++;store.moderationRules.push({id,guildId:i.guildId,keyword:i.options.getString("keyword",true),action:i.options.getString("action",true)});saveStore(store);return i.reply(`ルール #${id} を追加しました。`);}
 if(n==="play"){
   const url=i.options.getString("url",true),vc=i.member?.voice?.channel;if(!vc)return i.reply({content:"先にVCへ参加してください。",ephemeral:true});
   let s=players.get(i.guildId);
   if(!s){
     const connection=joinVoiceChannel({channelId:vc.id,guildId:i.guildId,adapterCreator:i.guild.voiceAdapterCreator});
     const player=createAudioPlayer();connection.subscribe(player);s={connection,player,queue:[],playing:false};
     player.on(AudioPlayerStatus.Idle,()=>{s.playing=false;playNext(i.guildId).catch(console.error);});players.set(i.guildId,s);
   }
   s.queue.push(url);await i.reply(`キュー追加:\n${url}\n※この土台版は直接音声URL向け。YouTube URL抽出再生は未実装です。`);if(!s.playing)playNext(i.guildId).catch(console.error);return;
 }
 if(n==="queue"){const s=players.get(i.guildId);return i.reply(s?.queue?.length?s.queue.map((x,k)=>`${k+1}. ${x}`).join("\n"):"キューは空です。");}
 if(n==="skip"){players.get(i.guildId)?.player.stop(true);return i.reply("スキップしました。");}
 if(n==="stop"){const s=players.get(i.guildId);if(s){s.queue.length=0;s.player.stop(true);s.connection.destroy();players.delete(i.guildId);}return i.reply("停止しました。");}
 if(n==="ai-image"||n==="ai-video"){
   const mode=i.options.getString("quality")||process.env.AI_DEFAULT_MODE||"free";
   if(mode==="high"&&process.env.AI_PAID_API_ENABLED!=="true")return i.reply({content:"高精度APIは無効です。無料優先モードを使用してください。",ephemeral:true});
   return i.reply(`生成モード: ${mode}\n内容: ${i.options.getString("prompt",true)}\n※生成エンジン接続口まで実装済み。ローカルAI/API本体は次段階で接続します。`);
 }
});

async function playNext(gid){
 const s=players.get(gid);if(!s||s.playing||!s.queue.length)return;const url=s.queue.shift();
 try{s.playing=true;s.player.play(createAudioResource(url));}catch(e){s.playing=false;console.error(e);return playNext(gid);}
}

client.on(Events.MessageCreate,async msg=>{
 if(msg.author.bot||!msg.guild)return;
 for(const r of store.moderationRules.filter(x=>x.guildId===msg.guild.id)){
   if(!msg.content.toLowerCase().includes(r.keyword.toLowerCase()))continue;
   try{
     if(r.action==="delete")await msg.delete();
     if(r.action==="timeout"&&msg.member?.moderatable)await msg.member.timeout(10*60*1000,`自動モデレーション: ${r.keyword}`);
     if(r.action==="kick"&&msg.member?.kickable)await msg.member.kick(`自動モデレーション: ${r.keyword}`);
     if(r.action==="ban"&&msg.member?.bannable)await msg.member.ban({reason:`自動モデレーション: ${r.keyword}`});
   }catch(e){console.error(e);}
   break;
 }
});

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

client.login(process.env.DISCORD_TOKEN);
