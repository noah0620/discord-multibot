import { REST, Routes } from 'discord.js';
import { config, assertConfig } from './config.js';
import { commandData } from './commands/definitions.js';

assertConfig();
const rest = new REST({ version: '10' }).setToken(config.token);
await rest.put(Routes.applicationCommands(config.clientId), { body: commandData.map(c => c.toJSON()) });
console.log(`✅ Global commands registered: ${commandData.length}`);
