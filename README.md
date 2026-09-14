# Discord MultiBot v5.2 コマンド受信修正版

この版は「BOTは起動しているのに、スラッシュコマンドが全く反応しない」問題を切り分け・修正する版です。

## v5.2の重要変更

`npm run deploy-commands` が `.env` の `DISCORD_CLIENT_ID` をそのまま信用せず、
**BOTトークン自身のBOT IDをDiscord APIから取得して、そのApplicationへ直接コマンド登録**します。

これにより、古いBOTのApplication IDや別BOTのIDが `.env` に残っていた場合の
「コマンド名は表示されるが、起動中BOTへInteractionが届かない」状態を防ぎます。

さらに `/ping` を追加しました。

起動後:

```text
/ping
```

を実行してください。

正常ならDiscordに「BOTは正常にコマンドを受信しています」と表示され、
PowerShellには次のようなログが出ます。

```text
📨 Interaction受信: type=2 command=ping user=...
```

PowerShellにこの `Interaction受信` が一切出ない場合、
Discordで実行しているコマンドが別Application/BOTのコマンドです。

## 更新手順

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.2-command-routing-fixed
npm install
npm run deploy-commands
npm start
```

`deploy-commands` 実行時に次の2つを確認してください。

```text
🤖 Token BOT: ...
✅ Global commands registered to <BOT ID>: ...
```

そのIDと、`npm start` 後の

```text
🆔 起動中BOT User ID: ...
```

が同じである必要があります。

## 機能

v5.1までの非AI機能をすべて維持しています。

- 自販機・PayPay・商品・在庫・管理
- 管理者承認型認証
- 最大5ロールパネル
- 入退室通知
- チケット
- 自動返信
- 予約投稿・自動削除
- モデレーション
- 47都道府県・地方・全国・複数地域天気
- 天気とは独立した地震速報
- VC音楽
- BOTオーナー
- `/diagnostics`
- `/ping`

AI生成機能は搭載していません。
