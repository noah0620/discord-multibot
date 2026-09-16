# Discord MultiBot v5.14.4 共通ヘルパー修正版

Discordで `ReferenceError: ADMIN_COMMANDS is not defined` が発生する問題を修正。

v5.14系の統合作業で欠落していた共通ヘルパーもまとめて復元:
- ADMIN_COMMANDS
- hasConfiguredAdminRole
- isGuildOwner
- isShopManager
- validHttpUrl
- createFfmpegAudio

v5.14.3の天気修正、v5.14.2の地震修正、無制限ロールパネルなども維持。

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.14.4-admin-weather-fixed
npm install
npm run deploy-commands
npm start
```
