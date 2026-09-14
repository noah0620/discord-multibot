# Discord MultiBot v3.4 — AI完全削除版

これまでの統合機能を残したまま、AI関連を完全削除し、音楽再生の操作ボタンを追加した版です。

## 継続機能
自販機 / PayPay受取リンク / 在庫 / 商品DM / 認証 / ロール選択 / チケット /
自動返信 / 参加退出ログ / 天気 / 自動天気投稿 / 地震 / 自動地震速報 /
予約投稿 / 投稿後削除 / 指定語句の削除・timeout・Kick・BAN / 音楽キュー / 動画URL投稿

## 削除
- /ai-image
- /ai-video
- Google Gemini / Veo
- ComfyUI
- AI用APIキーとAI依存パッケージ

## 音楽
直接再生可能な音声URL:
`/play url:https://example.com/song.mp3`

再生パネル:
- ⏸ 一時停止
- ▶ 再開
- ⏭ スキップ
- ⏹ 停止

停止ボタンはキューを空にし、再生停止後にVCから退出します。

コマンド:
`/pause` `/resume` `/skip` `/stop` `/queue` `/nowplaying` `/volume`

YouTube URLはDiscord内のYouTubeプレビューとして投稿します。YouTube音声抽出は含みません。

## 初期設定
```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v3.4-no-ai
npm install
Copy-Item .env.example .env
notepad .env
npm run deploy-commands
npm start
```

`.env`
```env
DISCORD_TOKEN=新しいBOTトークン
DISCORD_CLIENT_ID=Application ID
BOT_OWNER_IDS=自分のDiscordユーザーID
DATA_DIR=./data
EARTHQUAKE_POLL_SECONDS=60
WEATHER_DAILY_HOUR=7
```
