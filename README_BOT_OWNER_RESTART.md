# BOTオーナー / 再起動機能（Discord ID のみ）

`.env` に `BOT_OWNER_IDS=985029300484968520` を設定してください。複数指定する場合はカンマ区切りです。

- `/owner-status`: 実行ユーザーのDiscord IDが設定されたオーナーIDに一致するか確認
- `/bot-restart`: BOTオーナーIDに一致するユーザーだけ実行可能

ユーザー名（noa1955 など）による判定は廃止しました。`BOT_OWNER_USERNAMES` は不要です。既存の `.env` に残っていても無視されます。管理者ロールだけでは再起動できません。

既存の `.env` と `data` を上書きせずに導入してください。通常の `npm start` で起動し、必要に応じて `npm run deploy-commands` でコマンドを再登録してください。
