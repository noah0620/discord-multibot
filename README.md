# Discord MultiBot v5.14.5 自動天気・地震監視修正版

## 修正
- Discordログイン完了後に天気・地震watcherを確実に開始
- 起動ログを追加
- watcherの多重実行防止
- `/weather-channel` で投稿先を設定した地域を自動的に天気登録地域へ追加
- `/earthquake-auto` に `channel` を追加
- 地震ON時に投稿先未設定なら明示エラー
- 地震地域未設定時は全国
- 天気はJSTの指定時刻を15秒ごとに判定
- 投稿成功時だけ当日投稿済みとして保存

起動時に以下が表示されればwatcher開始済み:
`✅ Discordログイン完了`
`🌤️ 天気自動投稿監視: 15秒間隔 / JST`
`🌏 地震速報監視: 約5秒間隔`

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.14.5-auto-watchers-fixed
npm install
npm run deploy-commands
npm start
```

## 追加機能（今回）
- `/weather-auto-add region:東京都 channel:#天気 time:07:00`：地域・チャンネル・時刻の組み合わせを複数登録。`/weather-auto-list` で確認、`/weather-auto-remove id:` で削除。既存 `/weather-auto` は維持。
- `/supportchannel` または `/help` のサポートボタン：指定の招待リンクを表示。
- 注文記録に購入者の Discord ID・ユーザー名を保存。購入時の注文通知にも表示。
- ロールパネルは従来どおり `/role-add` で追加し、25件ごとにページ分割。Discord の1メニュー25件制限に対応。
- 自動投稿にはBOTのチャンネル閲覧・メッセージ送信権限が必要。起動し続ける環境で `npm run deploy-commands` のあと `npm start` を実行。
- 既存の `data/store.json` は上書きしないでください。実際のDiscordへの送信は接続情報がないため未検証です。


## 2026-09 天気取得修正
- 47都道府県の代表地点を固定緯度・経度に変更し、曖昧な地名検索を廃止。
- APIタイムアウト12秒、最大3回試行、10分キャッシュ。
- `/weather-register` などの地域選択で「九州地方」「沖縄地方」を個別に選択可能（従来の「九州・沖縄地方」も維持）。
- 既存の設定・自動投稿ジョブ・地震・販売機・ロールパネルは保持。
- 実際のDiscord投稿と外部API通信はこの環境では未確認。

## v5.14.5 チャンネル独立ボタン式ロールパネル
- ロール設定をチャンネルIDごとに独立保存
- `/role-add` は現在チャンネル、または `channel` 指定先だけに追加
- `/role-panel` は現在チャンネル専用パネルを作成
- Discordのボタン式（押すと付与、再度押すと解除）
- 1ページ20ロール、20件を超えると前へ/次へでページ切替（登録数は固定上限なし）
- `/role-panel title:... description:...` で見出し・説明文を変更可能
- `/role-list` `/role-remove` もチャンネル単位
