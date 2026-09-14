# Discord MultiBot v3 - Free First

今回の要望を元にした無料優先構成の土台版です。

## 入っているもの
- 都道府県 / 県庁所在地のオートコンプリート
- 天気表示（Open-Meteo、APIキー不要）
- 最新地震情報（P2PQuake、APIキー不要）
- 天気 / 地震の複数地域登録
- ロール選択パネル
- 予約投稿 / 投稿後自動削除
- 指定語句による削除 / timeout / kick / BAN
- VC音楽キュー基盤
- AI画像 / AI動画の free / high 切替口
- JSON保存

## 重要
- `/play` は現在「直接再生可能な音声URL」向けです。YouTube URLの直接再生はまだ未実装です。
- AI画像/動画は「接続口」までです。freeはローカルAI、highは有料APIへ接続する想定です。
- 自動天気配信・自動地震速報・自販機・PayPay・チケット・認証はこのZIPにはまだ統合していません。

## 初期設定
```powershell
npm install
Copy-Item .env.example .env
notepad .env
```

`.env`
```env
DISCORD_TOKEN=新しいBOTトークン
DISCORD_CLIENT_ID=Application ID
BOT_OWNER_IDS=自分のDiscordユーザーID
AI_DEFAULT_MODE=free
AI_PAID_API_ENABLED=false
```

コマンド登録:
```powershell
npm run deploy-commands
```

起動:
```powershell
npm start
```

## 必要なDiscord権限
View Channels / Send Messages / Embed Links / Attach Files / Read Message History /
Manage Roles / Manage Channels / Manage Messages / Moderate Members /
Kick Members / Ban Members / Connect / Speak / Use Application Commands

Gateway Intents:
- SERVER MEMBERS INTENT ON
- MESSAGE CONTENT INTENT ON

## Railway
永続保存するなら Volume を `/app/data` に付けて、
`DATA_DIR=/app/data` をVariablesへ追加してください。
