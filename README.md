# Discord MultiBot v5.11 ZIP・URL販売対応版

v5.10までの機能を維持。

## 自動販売機の販売データ方式
`/product-add` / `/product-edit` で以下を選択できます。

- `delivery_mode: ZIPファイル`
  - `zip_file` に `.zip` をDiscord添付
  - 支払い確認完了後、購入者DMへZIPの取得URLを送信
- `delivery_mode: ギガファイル便URL`
  - `gigafile_url` と `url_expiry_days` を設定
  - 残り24時間以内で販売者へURL更新通知
- `delivery_mode: 通常URL`
  - `download_url` を設定
  - 支払い確認完了後に購入者へURLを送信

商品選択画面には受取方法を表示しますが、購入前に実際のダウンロードURLは公開しません。

### ギガファイル便
BOTがギガファイル便へファイルを自動アップロードする機能ではありません。
販売者がギガファイル便で発行したURLを商品へ登録します。

### ZIP添付について
ZIPはDiscordの添付URLを保存する方式です。Discord側の添付サイズ上限が適用されます。
長期販売や大容量データはギガファイル便URL方式を推奨します。

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.11-zip-url-sales
npm install
npm run deploy-commands
npm start
```
