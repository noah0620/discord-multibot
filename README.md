# Discord MultiBot v3 統合版

v2の自販機/PayPay/認証/チケット/自動返信/入退出ログを、v3の天気・地震・予約投稿・投稿削除・自動モデレーション・無料優先AI設計へ結合した版です。

## 統合済み
- 誰でも自分の自販機作成
- 自販機ごとのオーナー/管理ロール
- 商品/在庫/配布内容
- 購入者が PayPay受け取りURL を入力
- 店舗管理者が受取確認後に商品DM配布
- 認証パネル
- 最大5個のロール選択パネル
- チケット作成
- 自動返信
- 参加/退出ログ
- 都道府県/県庁所在地の入力候補
- 天気の複数地域登録・毎日自動投稿
- 地震の複数地域登録・最低震度・自動速報
- 予約投稿
- 投稿後指定時間で削除
- 指定発言: 削除/timeout/Kick/BAN
- 音楽キュー基盤
- AI画像/動画 free/high 切替
- BOT_OWNER_IDS

## まだ接続していない部分
- YouTubeページURLからの音声抽出再生
- 実際のローカルAI画像/動画生成エンジン
- highモードの外部AI API本体

`/play` は直接再生できる音声URLのみです。

## 初期設定

```powershell
npm install
Copy-Item .env.example .env
notepad .env
```

.env:
```env
DISCORD_TOKEN=新しいBOTトークン
DISCORD_CLIENT_ID=Application ID
BOT_OWNER_IDS=自分のDiscordユーザーID
AI_DEFAULT_MODE=free
AI_PAID_API_ENABLED=false
DATA_DIR=./data
```

コマンド登録:
```powershell
npm run deploy-commands
```

起動:
```powershell
npm start
```

## Discord Developer Portal
Gateway Intents:
- SERVER MEMBERS INTENT: ON
- MESSAGE CONTENT INTENT: ON

推奨権限:
- View Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Manage Roles
- Manage Channels
- Manage Messages
- Moderate Members
- Kick Members
- Ban Members
- Connect
- Speak
- Use Application Commands

## Railway
永続保存する場合:
- Volume mount: `/app/data`
- Variable: `DATA_DIR=/app/data`

## 注意
PayPayはAPI自動決済確認ではありません。購入者が作成した受け取りリンクを店舗管理者が確認し、管理者が「受け取り完了・商品配布」を押す方式です。
