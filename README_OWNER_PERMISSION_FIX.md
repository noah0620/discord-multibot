# BOTオーナー / 管理者ロール権限 修正版

## 修正内容
- `.env` をPowerShellの現在位置ではなく、BOT本体フォルダー直下から固定で読み込みます。
- `DATA_DIR=./data` もBOT本体基準に固定しました。起動場所が変わって管理者ロール設定が別の store.json に保存される問題を防ぎます。
- `/bot-restart` は `BOT_OWNER_IDS` に一致するDiscordユーザーIDだけ実行できます。管理者ロール・Discord Administrator権限・サーバー所有者だけでは実行できません。
- `/owner-status` に、BOT_OWNER_IDSが読み込まれているかの診断表示を追加しました。
- 起動ログに `.env` 読込先とデータ保存先を表示します。

## .env
BOT本体（package.json と同じフォルダー）の `.env` に以下を設定してください。

BOT_OWNER_IDS=985029300484968520

既存の DISCORD_TOKEN / DISCORD_CLIENT_ID も同じ .env に残してください。

## 更新後
npm install
npm run deploy-commands
npm start

起動時に `BOTオーナーID読込: 1件` と表示されることを確認してください。
