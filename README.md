# Discord MultiBot v5.14.3 天気機能修正版

v5.14.2で欠落していた天気共通関数を復元しました。

復元:
- splitDiscordBlocks
- buildWeatherPages
- replyWeatherPages
- Open-Meteo県庁所在地天気取得
- 天気コード表示

`/weather`, `/weather-list`, `/weather-admin`, `/weather-channel`, `/weather-auto` と自動天気投稿で共通利用します。

エラー時はDiscordにもエラー名・メッセージを表示するため、今後の原因特定がしやすくなっています。

v5.14.2の地震修正、地域未設定=全国、v5.14の無制限ロールパネル、その他従来機能を維持。

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.14.3-weather-fixed
npm install
npm run deploy-commands
npm start
```
