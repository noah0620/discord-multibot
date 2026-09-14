import { EmbedBuilder } from 'discord.js';
export async function weather(place){
 const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=ja&format=json`).then(r=>r.json());
 if(!geo.results?.length) throw new Error('場所が見つかりません');
 const p=geo.results[0];
 const w=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`).then(r=>r.json());
 return new EmbedBuilder().setTitle(`🌤 ${p.name} の天気`).setDescription(`現在 ${w.current.temperature_2m}℃（体感 ${w.current.apparent_temperature}℃）\n風速 ${w.current.wind_speed_10m} km/h / 降水 ${w.current.precipitation} mm`).addFields(w.daily.time.map((d,i)=>({name:d,value:`最高 ${w.daily.temperature_2m_max[i]}℃ / 最低 ${w.daily.temperature_2m_min[i]}℃\n降水確率 ${w.daily.precipitation_probability_max[i]??'-'}%`,inline:true})));
}
