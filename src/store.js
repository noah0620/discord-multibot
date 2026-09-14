
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || "./data";
const STORE_PATH = path.join(DATA_DIR, "store.json");

const defaults = {
  guilds:{},
  schedules:[],
  moderationRules:[],
  nextIds:{schedule:1, rule:1}
};

export function loadStore(){
  fs.mkdirSync(DATA_DIR,{recursive:true});
  if(!fs.existsSync(STORE_PATH)){
    fs.writeFileSync(STORE_PATH,JSON.stringify(defaults,null,2),"utf8");
    return structuredClone(defaults);
  }
  try { return {...structuredClone(defaults), ...JSON.parse(fs.readFileSync(STORE_PATH,"utf8"))}; }
  catch { return structuredClone(defaults); }
}
export function saveStore(store){
  fs.mkdirSync(DATA_DIR,{recursive:true});
  fs.writeFileSync(STORE_PATH,JSON.stringify(store,null,2),"utf8");
}
