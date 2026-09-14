import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } from '@discordjs/voice';
import play from 'play-dl';
const players=new Map();
export async function playAudio(interaction,url){
 const vc=interaction.member?.voice?.channel; if(!vc) throw new Error('先にボイスチャンネルへ参加してください。');
 const conn=joinVoiceChannel({channelId:vc.id,guildId:interaction.guildId,adapterCreator:interaction.guild.voiceAdapterCreator,selfDeaf:true});
 let resource;
 if(/^https?:\/\//.test(url)){
   try { const stream=await play.stream(url); resource=createAudioResource(stream.stream,{inputType:stream.type}); }
   catch { resource=createAudioResource(url); }
 } else throw new Error('URLを指定してください。');
 const player=createAudioPlayer(); conn.subscribe(player); player.play(resource); players.set(interaction.guildId,player); player.on(AudioPlayerStatus.Idle,()=>{});
}
export function stopAudio(guildId){ const p=players.get(guildId); p?.stop(); getVoiceConnection(guildId)?.destroy(); players.delete(guildId); }
