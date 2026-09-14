# Discord MultiBot v3.7 — 47都道府県 / 地方設定 / 管理者専用地域管理

v3.6までの機能を維持し、天気地域設定を全面修正した版です。

## 天気地域設定

管理者だけが `/weather-register` を使用できます。

### 1都道府県を追加
```text
/weather-register action:追加 region:千葉県
```

### 地方単位で追加
```text
/weather-register action:追加 region:関東地方
```

関東地方を選ぶと、
茨城県 / 栃木県 / 群馬県 / 埼玉県 / 千葉県 / 東京都 / 神奈川県
がまとめて登録されます。

対応地方:
- 北海道地方
- 東北地方
- 関東地方
- 中部地方
- 近畿地方
- 中国地方
- 四国地方
- 九州・沖縄地方

### 全国47都道府県を追加
```text
/weather-register action:追加 region:全国47都道府県
```

Discordの候補表示は最大25件という制限がありますが、入力検索は47都道府県すべてを対象にします。
例えば `沖縄`、`鹿児島`、`長野` と入力すれば候補が表示されます。

## 複数地域の表示

`/weather` で `region` を指定しなければ、そのサーバーに登録されている地域をすべて表示します。

```text
/weather
```

複数地域が登録されていれば複数表示されます。
47都道府県登録時もDiscordの2000文字制限に合わせて自動的に複数メッセージへ分割します。

一時的に特定の県・地方だけ確認したい場合:

```text
/weather region:関東地方
/weather region:千葉県
```

これは登録内容を変更しません。

## 管理者ページ

```text
/weather-admin
```

管理者専用・Ephemeral表示です。一般メンバーには内容を公開しません。

表示内容:
- 自動投稿ON/OFF
- 投稿時間
- 投稿チャンネル
- 登録数（例 20/47）
- 地方別登録状況
- 登録済み47都道府県の詳細

`/weather-register` と `/weather-admin` と `/weather-auto` は Manage Server 権限を持つ管理者向けです。

## 地震速報は完全に別設定

天気の `weatherRegions` と地震の `earthquakeRegions` は別々に保存します。

天気に関東地方や全国47都道府県を登録しても、地震速報の対象地域は変更されません。

地震側は従来どおり:
```text
/earthquake-register
/earthquake-list
/earthquake-auto
```

約5秒間隔の新着監視も維持しています。

## その他の既存機能

自販機 / PayPay受取リンク / 在庫 / 商品DM / 認証 / ロール選択 / チケット /
自動返信 / 参加退出ログ / 予約投稿 / 自動削除 / モデレーション /
音楽再生・操作ボタンを維持しています。

AI生成機能は引き続き完全削除済みです。

## 更新

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v3.7-region-admin
npm install
npm run deploy-commands
npm start
```

`.env`:
```env
DISCORD_TOKEN=新しいBOTトークン
DISCORD_CLIENT_ID=Application ID
BOT_OWNER_IDS=自分のDiscordユーザーID
DATA_DIR=./data
EARTHQUAKE_POLL_SECONDS=5
```
