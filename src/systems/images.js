import OpenAI from 'openai';
import { config } from '../config.js';
export async function generateImage(prompt){
 if(!config.openAiKey) throw new Error('OPENAI_API_KEY が設定されていません。');
 const client=new OpenAI({apiKey:config.openAiKey});
 const r=await client.images.generate({model:config.openAiImageModel,prompt,size:'1024x1024'});
 const item=r.data?.[0]; if(item?.b64_json) return Buffer.from(item.b64_json,'base64');
 if(item?.url) return item.url; throw new Error('画像生成結果を取得できませんでした。');
}
