# Discord MultiBot v4.1 完全統合復旧版 — AI生成なし

この版は **v3.6までに存在した非AI機能を全部残した上で**、
v3.7〜v4.0で追加した地域設定・入退室・管理者承認型認証を統合しています。

## 復旧・維持している機能

- 自販機 / PayPay受取リンク / 商品 / 在庫 / 商品DM
- 管理者承認型の認証パネル
- 最大5ロールのロールパネル
- 入室・退出通知
- チケット
- 自動返信
- サーバー通知先設定
- 47都道府県・地方・全国の天気設定
- 複数地域表示
- `/weather-list` を復旧
- 管理者専用 `/weather-admin`
- サーバー別天気投稿時刻
- 天気設定とは独立した地震速報
- 約5秒間隔の地震新着監視
- 予約投稿 / 投稿後自動削除
- 自動モデレーション
- 音楽キュー / 一時停止 / 再開 / スキップ / 停止 / 音量
- 動画URL投稿
- BOTオーナー機能

## AI生成について

この版にはAI生成機能・AI生成用API設定・AI生成用依存パッケージを搭載していません。

## 更新手順

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v4.1-full-restored-no-ai
npm install
npm run deploy-commands
npm start
```

**`npm run deploy-commands` は必ず実行してください。**

Discord側に古い不要コマンドが残っている場合も、現在のコマンド一覧を再登録してください。
