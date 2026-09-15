# Discord MultiBot v5.7 地域別・地方別 天気チャンネル版

天気を地域・地方ごとに別チャンネルへ自動投稿できます。

## 例

関東地方を #関東天気 へ:
```text
/weather-channel region:関東地方 channel:#関東天気
```

大阪府だけ #大阪天気 へ:
```text
/weather-channel region:大阪府 channel:#大阪天気
```

北海道地方を #北海道天気 へ:
```text
/weather-channel region:北海道地方 channel:#北海道天気
```

地方を指定すると、その地方に含まれる全都道府県へ同じ投稿先を設定します。
あとから特定の県だけ別チャンネルへ設定すると、その県だけ上書きできます。

解除:
```text
/weather-channel-remove region:大阪府
```

解除後は `/weather-auto channel:` で設定した共通投稿先を使用します。

`/weather-list` と `/weather-admin` では、
`千葉県 → #関東天気` のように県ごとの実際の投稿先を確認できます。

自動投稿時は、同じチャンネルに設定された県をまとめて投稿します。
天気地域登録と投稿先設定は別なので、`/weather-register` で天気対象地域も登録してください。

更新:
```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.7-weather-channel-routing
npm install
npm run deploy-commands
npm start
```

`.env` と `data/store.json` は旧版から引き継げます。
