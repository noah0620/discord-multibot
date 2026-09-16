# Discord MultiBot v5.14.2 地震速報修正版

v5.14.1で発生していた
`ReferenceError: fetchLatestEarthquake is not defined`
を修正しました。

欠落していた以下を復元:
- `fetchLatestEarthquake()` — P2PQuake APIから最新地震情報を取得
- `scaleToNumber()` — 震度コード判定
- `earthquakeText()` — Discord投稿用地震情報生成

地域未設定なら全国、地域設定済みなら登録地域のみ、というv5.13の仕様も維持しています。

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.14.2-earthquake-fixed
npm install
npm run deploy-commands
npm start
```
