# Discord MultiBot v5.6.1 天気設定修正版

スクリーンショットの状態
`地域 0/47 / 自動投稿 ON / 投稿先 未設定`
が成立してしまう問題を修正しました。

## 修正内容

- `/weather-auto` に `channel` を追加
- 自動投稿ON時、投稿先未設定ならONにしない
- 自動投稿ON時、地域0件ならONにしない
- `/weather-list` で地方ごとの登録県を表示
- `/weather-register` で地方を追加した際、実際に追加した県名を表示
- `/weather-admin` で設定不足を警告

## 正しい設定例

```text
/weather-register action:追加 region:関東地方
/weather-auto enabled:True time:07:00 channel:#天気
/weather-list
```

関東地方なら茨城県・栃木県・群馬県・埼玉県・千葉県・東京都・神奈川県が表示されます。

注意: 新しいバージョンを別フォルダへ展開した場合、以前の `data/store.json` をコピーしないと旧設定は引き継がれません。

更新:
```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.6.1-weather-settings-fixed
npm install
npm run deploy-commands
npm start
```
