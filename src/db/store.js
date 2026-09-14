import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const dir = path.resolve(config.dataDir);
const file = path.join(dir, 'store.json');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function initial() {
  return {
    guilds: {},
    shops: {},
    orders: {},
    schedules: [],
    moderationRules: [],
    nextShopId: 1,
    nextOrderId: 1,
    nextScheduleId: 1,
    nextRuleId: 1,
    lastEarthquakeEventId: null
  };
}

export function loadStore() {
  if (!fs.existsSync(file)) {
    const s = initial();
    fs.writeFileSync(file, JSON.stringify(s, null, 2), 'utf8');
    return s;
  }
  try {
    return { ...initial(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    const s = initial();
    fs.writeFileSync(file, JSON.stringify(s, null, 2), 'utf8');
    return s;
  }
}
export function saveStore(store) {
  fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf8');
}
export function guildData(store, guildId) {
  store.guilds[guildId] ??= {
    joinLogChannelId: null,
    leaveLogChannelId: null,
    verificationRoleId: null,
    earthquakeChannelId: null,
    weatherChannelId: null,
    autoReplies: {},
    weatherRegions: [],
    earthquakeRegions: [],
    minIntensity: 3,
    weatherAutoEnabled: false,
    weatherAutoTime: '07:00',
    earthquakeAutoEnabled: false,
    lastWeatherPostDate: null
  };
  const g = store.guilds[guildId];
  g.weatherAutoTime ??= '07:00';
  g.weatherAutoEnabled ??= false;
  g.earthquakeAutoEnabled ??= false;
  g.minIntensity ??= 3;
  g.weatherRegions ??= [];
  g.earthquakeRegions ??= [];
  return g;
}
