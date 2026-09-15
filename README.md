# Discord MultiBot v5.8 NEWS ALERTS 統合版

v5.7の全機能を維持し、RSS/Atomニュース自動通知を追加。

設定:
1. Discord投稿先チャンネルを右クリック → リンクをコピー
2. `/news-source-add name:ニュース名 feed_url:RSS_URL channel_url:DiscordチャンネルURL`
3. `/news-auto enabled:True`

管理:
- `/news-list`
- `/news-test id:1`
- `/news-source-remove id:1`

約60秒ごとに新着を確認し、未投稿の記事だけ指定チャンネルへEmbed通知します。
ソースごとに別チャンネルURLを設定可能です。
登録時点の記事は既読扱いにするため、過去記事を一斉投稿しません。

`feed_url` は通常の記事ページではなくRSS/AtomフィードURLを指定してください。
各配信元のRSS利用条件に従って利用してください。

更新:
```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.8-news-alerts
npm install
npm run deploy-commands
npm start
```
