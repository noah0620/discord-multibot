# Discord MultiBot v5.1 安定化修正版 — 完全統合 / AI生成なし

v5.0の全機能を維持し、動作しにくかった箇所を重点的に修正した版です。

## 今回の修正

### VC音楽
`/play` の直接音声URL再生を FFmpeg 経由に変更しました。
必要な `ffmpeg-static / opusscript / libsodium-wrappers` を依存関係へ追加しています。

対応:
- `/play`
- `/queue`
- `/pause`
- `/resume`
- `/skip`
- `/stop`
- `/nowplaying`
- `/volume`

YouTube URLは引き続きVC音声抽出ではなくDiscordの動画プレビュー表示です。

### 自販機・在庫
商品追加だけでなく、既存商品と在庫を変更できるようにしました。

- `/product-edit`
- `/product-remove`
- 在庫 `-1` = 無制限
- 購入完了DM
- 配布ファイルURL
- 購入後ロール
- `/shop-admin`
- `/order-list`

### BOT診断
`/diagnostics` を追加しました。

確認できる内容:
- BOT接続状態
- ロール管理権限
- チャンネル管理権限
- メッセージ送信権限
- 認証ロール
- 入退室通知先
- 天気通知先
- 地震通知先
- チケットカテゴリ
- サポートロール

機能が動かない場合は最初に `/diagnostics` を実行してください。

### 天気・地震
- 天気自動投稿でチャンネルがキャッシュされていなくても取得
- 1サーバーの天気取得エラーで他サーバーの処理が止まらないよう修正
- 地震速報も通知チャンネルを再取得
- 天気地域と地震地域は引き続き完全に別設定

## 搭載機能

1. 🛒 自販機・商品・PayPay購入・在庫・管理者
2. ✅ 管理者承認型認証・認証管理ページ
3. 🎭 最大5個のロールパネル
4. 🚪 入室・退出通知と設定確認
5. 🎫 チケット
6. 💬 自動返信
7. 📢 予約投稿・自動削除
8. 🛡️ モデレーション
9. 🌤️ 47都道府県・地方・全国・複数地域天気
10. 🚨 天気とは独立した地震速報
11. 🎵 VC音楽
12. 👑 BOTオーナー機能

AI生成機能は搭載していません。

## 必須設定

Discord Developer Portal → Bot → Privileged Gateway Intents:

- SERVER MEMBERS INTENT: ON
- MESSAGE CONTENT INTENT: ON

BOT権限:
- Manage Roles
- Manage Channels
- View Channels
- Send Messages
- Embed Links
- Read Message History
- Use Application Commands
- Connect
- Speak
- Manage Messages
- Moderate Members
- Kick Members
- Ban Members

ロール付与系は **BOTのロールを付与対象ロールより上** にしてください。

## `.env`

```env
DISCORD_TOKEN=新しく再発行したBOTトークン
DISCORD_CLIENT_ID=Application ID
BOT_OWNER_IDS=自分のDiscordユーザーID
DATA_DIR=./data
EARTHQUAKE_POLL_SECONDS=5
```

## 起動

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.1-stability-fixed
npm install
npm run deploy-commands
npm start
```

新しいコマンドを追加しているため `npm run deploy-commands` は必ず実行してください。

## 旧データの引き継ぎ

旧版の `data/store.json` を新しいフォルダの `data/store.json` にコピーできます。
不足フィールドは起動時に自動補完されます。
