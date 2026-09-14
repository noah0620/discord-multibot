# Discord MultiBot v3.3 — Google AI専用版

v3統合版を次の方針へ変更した版です。

## 変更点
- ComfyUI / ローカルAIを削除
- AI画像生成は Google Gemini API のみ
- AI動画生成は Google Veo API のみ
- `/ai-image` で生成画像をDiscordへ添付
- `/ai-video` で生成動画をDiscordへ添付
- `/play` にYouTube URLを入れた場合、DiscordのYouTubeネイティブプレビューとして投稿
- 直接再生可能な音声URLは従来どおりVC再生

## Google API設定

`.env`

```env
DISCORD_TOKEN=新しいBOTトークン
DISCORD_CLIENT_ID=Application ID
BOT_OWNER_IDS=自分のDiscordユーザーID

GOOGLE_API_KEY=Google AI Studioで作成したAPIキー
GOOGLE_IMAGE_MODEL=gemini-3.1-flash-image
GOOGLE_VIDEO_MODEL=veo-3.1-generate-preview

DATA_DIR=./data
```

## インストール

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v3.3-google-only
npm install
npm run deploy-commands
npm start
```

## Discordで画像生成

```text
/ai-image prompt: 赤い髪のアニメ風キャラクター、夜の東京 aspect: 1:1
```

Google API → 画像生成 → BOTが画像を取得 → Discord添付、まで自動です。

## Discordで動画生成

```text
/ai-video prompt: 夜の東京を走る未来的な電車 aspect: 16:9
```

Google Veoの生成完了をBOTが待ち、完成MP4をDiscordへ添付します。

## YouTube

```text
/play url:https://www.youtube.com/watch?v=...
```

YouTube URLの場合はDiscordメッセージへURLを投稿し、Discordが提供するYouTubeプレビュー/プレイヤーで再生します。

### VCでYouTube音声を流す機能について

YouTube公式APIは、Discord VCへYouTube動画から音声ストリームを抽出するためのAPIではありません。
そのため、この版ではYouTubeページから音声を抜き出してVCへ流す実装は入れていません。

YouTube以外の「直接再生可能な音声URL」は従来どおり `/play` でVC再生できます。

## Railway

Variables:
- DISCORD_TOKEN
- DISCORD_CLIENT_ID
- BOT_OWNER_IDS
- GOOGLE_API_KEY
- GOOGLE_IMAGE_MODEL=gemini-3.1-flash-image
- GOOGLE_VIDEO_MODEL=veo-3.1-generate-preview
- DATA_DIR=/app/data

永続保存する場合はVolumeを `/app/data` にマウントしてください。

## 注意

Googleの画像生成・動画生成モデルは利用量に応じて料金が発生する場合があります。
APIキーはGitHubへアップロードせず、`.env` またはRailway Variablesだけに保存してください。
