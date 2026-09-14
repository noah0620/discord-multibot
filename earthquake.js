import { EmbedBuilder } from 'discord.js';
let lastId='';
export function startEarthquakeWatcher(client){
 setInterval(async()=>{
  for(const guild of client.guilds.cache.values()){
   try{
    const {getSettings}=await import('../db/database.js'); const s=getSettings(guild.id); if(!s.earthquake_channel_id) continue;
    const list=await fetch('https://api.p2pquake.net/v2/history?codes=551&limit=1').then(r=>r.json()); const q=list?.[0]; if(!q||q.id===lastId) continue;
    lastId=q.id; const eq=q.earthquake; if(!eq) continue;
    const ch=await guild.channels.fetch(s.earthquake_channel_id).catch(()=>null); if(!ch?.isTextBased()) continue;
    await ch.send({embeds:[new EmbedBuilder().setTitle('🚨 地震情報').setDescription(`${eq.hypocenter?.name||'震源不明'}\n最大震度: ${eq.maxScale??'不明'}\nマグニチュード: ${eq.hypocenter?.magnitude??'不明'}\n深さ: ${eq.hypocenter?.depth??'不明'}km\n発生時刻: ${eq.time||''}`).setFooter({text:'情報源: P2P地震情報 / 気象庁発表をもとに配信'})]});
   }catch(e){console.error('earthquake',e.message)}
  }
 },60000);
}
