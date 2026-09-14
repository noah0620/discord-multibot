import { REST, Routes } from 'discord.js';
import { config, assertConfig } from './config.js';
import { commands } from './commands/definitions.js';
assertConfig();
const rest = new REST({ version: '10' }).setToken(config.token);
await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
console.log('✅ Global commands deployed. 複数サーバーで利用できます。反映に時間がかかる場合があります。');
