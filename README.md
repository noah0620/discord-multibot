# Discord MultiBot v5.0 完全統合版

これまで作成したBOT機能を、AI生成機能を除いて1つに統合した版です。

## 1. 🛒 自販機・商品・PayPay購入・在庫・管理者

- `/shop-create` 自販機作成
- `/shop-list` 自販機一覧
- `/shop-config` 名前・管理ロール・注文通知先変更
- `/shop-delete` 自販機停止
- `/shop-admin` 管理者用の自販機・注文状況
- `/product-add` 商品追加
  - 商品名
  - 金額
  - 在庫（`-1` で無制限）
  - 商品説明
  - 購入完了DM
  - 配布ファイルURL
  - 購入後ロール
- `/product-list` 商品・在庫確認
- `/order-list` 注文履歴
- `/shop-panel` 購入パネル

購入者が自分の PayPay 受け取りURLを入力し、管理者が入金確認後
「受け取り完了・商品配布」を押すと商品を配布します。
PayPayの入金状態・金額そのものをBOTが自動判定する機能ではありません。

## 2. ✅ 管理者承認型認証・認証管理ページ

- `/verify-panel role:@ロール`
- メンバーが認証申請
- `/verify-admin` で管理者だけが承認待ちを表示
- 承認後に指定ロールを付与
- 却下可能
- `/verify-status` で設定確認
- 管理ページはEphemeral表示

## 3. 🎭 最大5個のロールパネル

- `/role-panel`
- 最大5ロールを1パネルに表示
- ボタンで付与 / 再度押すと解除
- `/role-add` `/role-list` `/role-remove` で最大5個を保存して再利用可能
- BOTのロール順序・ロール管理権限をチェック

## 4. 🚪 入室・退出通知と設定確認

- `/join-leave-settings`
- `/join-leave-status`
- `/guild-settings`
- `/guild-status`
- `/setting` は旧版互換
- 参加・退出をEmbed通知
- Discord Developer Portal の SERVER MEMBERS INTENT が必要

## 5. 🎫 チケット

- `/ticket-panel`
- `/ticket-settings`
- `/ticket-status`
- 作成先カテゴリ設定
- サポートロール設定
- チケット作成
- チケットを閉じるボタン
- 本人 / サポート / 管理者がクローズ可能

## 6. 💬 自動返信

- `/autoreply-add`
- 部分一致 / 完全一致
- `/autoreply-remove`
- `/autoreply-list`

## 7. 📢 予約投稿・自動削除

- `/schedule-post`
- 指定日時に投稿
- `delete_after_minutes` を指定すると投稿後に自動削除
- `/schedule-list`
- `/schedule-cancel`

## 8. 🛡️ モデレーション

- `/moderation-rule`
- 指定語句を検知
- 削除
- タイムアウト
- Kick
- BAN
- `/moderation-list`
- `/moderation-remove`

## 9. 🌤️ 47都道府県・地方・全国・複数地域天気

- 47都道府県すべて
- 北海道 / 東北 / 関東 / 中部 / 近畿 / 中国 / 四国 / 九州・沖縄
- 全国47都道府県一括登録
- 複数地域登録
- `/weather` で登録地域をまとめて表示
- 文字数超過時は複数メッセージに自動分割
- `/weather-register`
- `/weather-list`
- `/weather-admin`
- `/weather-auto`
- サーバーごとに投稿時刻設定
- 地域登録詳細は管理者だけに表示

## 10. 🚨 天気とは独立した地震速報

- 天気地域設定とは別の `earthquakeRegions` を使用
- `/earthquake`
- `/earthquake-register`
- `/earthquake-list`
- `/earthquake-auto`
- 最低震度設定
- 約5秒間隔で新着を監視し、取得後に投稿

## 11. 🎵 VC音楽

- `/play`
- `/queue`
- `/pause`
- `/resume`
- `/skip`
- `/stop`
- `/nowplaying`
- `/volume`

直接再生可能な音声URLに対応します。

## 12. 👑 BOTオーナー機能

- `.env` の `BOT_OWNER_IDS`
- `/owner-status`
- BOTオーナーは自販機などの管理判定で優先権限を持ちます。

## 補助

- `/video` 動画URL投稿

## AI生成について

この版にはAI生成機能、AI生成用API設定、AI生成用依存パッケージを搭載していません。

## `.env`

```env
DISCORD_TOKEN=新しく発行したBOTトークン
DISCORD_CLIENT_ID=Application ID
BOT_OWNER_IDS=自分のDiscordユーザーID
DATA_DIR=./data
EARTHQUAKE_POLL_SECONDS=5
```

以前チャット等に貼り付けたBOTトークンは使用せず、必ずDiscord Developer Portalで再発行した新しいトークンを使用してください。

## 起動

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.0-complete-no-ai
npm install
npm run deploy-commands
npm start
```

新旧コマンドを統合しているため、`npm run deploy-commands` は必ず実行してください。

## データ引き継ぎ

以前のBOTデータを残す場合は、旧版の `data/store.json` を新しいフォルダの `data/store.json` にコピーしてください。
新しいフィールドは起動時に自動補完されます。

Railwayで `/app/data` のVolumeを使用している場合は、そのVolumeを維持してください。
