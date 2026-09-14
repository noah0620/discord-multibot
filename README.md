# Discord MultiBot v3.6 — 天気表示・判定修正版

v3.5 の全機能を残したまま、天気表示と雨判定を修正した版です。

## 修正内容

- サーバーごとの天気投稿時刻設定を維持
- 天気投稿の一番上に日本時間を `YYYY/MM/DD HH:mm` で表示
- 都道府県を指定した場合は県庁所在地を予報地点として使用
- 地域ごとに天気コード、降水量、降水確率から雨判定
- 「やや曇り・降水量0」なのに☔️になる誤判定を改善
- 降水量を `m` ではなく `mm` で表示
- 最大降水確率も表示
- 晴れ / 曇り / 雨 / 雪 / 雷雨でアイコンを自動変更
- 地震の約5秒間隔監視を維持
- AI生成機能は引き続き完全削除
- 自販機、PayPay、認証、ロール、チケット、モデレーション、音楽等は維持

## 天気表示例

```text
**2026/09/14 07:00**

**茨城県は【☔️】雨が降るでしょう。**
本日茨城県の天気は、雨
最低気温 24°C / 最高気温 34°C
降水量 1 mm / 降水確率 70%

**千葉県は【🌤️】雨は降らないでしょう。**
本日千葉県の天気は、やや曇り
最低気温 23°C / 最高気温 31°C
降水量 0 mm / 降水確率 20%
```

## 天気のサーバー別投稿時刻

```text
/weather-auto enabled:True time:07:00
```

別サーバーでは、

```text
/weather-auto enabled:True time:18:30
```

のように別の時間を保存できます。

## 地震速報

初期設定では約5秒間隔で新着を確認します。

```env
EARTHQUAKE_POLL_SECONDS=5
```

登録した地域と最低震度に一致した新着地震を取得後、Discordへ投稿します。

## 起動

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v3.6-weather-corrected
npm install
npm run deploy-commands
npm start
```

`.env`

```env
DISCORD_TOKEN=新しいBOTトークン
DISCORD_CLIENT_ID=Application ID
BOT_OWNER_IDS=自分のDiscordユーザーID
DATA_DIR=./data
EARTHQUAKE_POLL_SECONDS=5
```
