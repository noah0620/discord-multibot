# Discord Multi BOT - 複数サーバー / 個別自動販売機版

Node.js + discord.js の多機能Discord BOTです。

## 今回の仕様

- `DISCORD_GUILD_ID` は不要
- スラッシュコマンドはグローバル登録
- BOTを招待した複数のDiscordサーバーで利用可能
- サーバーごとに設定・自動返信・ロール・自販機・注文を分離
- BOTオーナー権限あり
- 自動販売機は誰でも作成可能
- 自動販売機ごとにオーナーが存在
- 自動販売機ごとに「設定できるロール」を指定可能
- 自動販売機ごとに注文通知チャンネルを指定可能
- 商品・注文は自動販売機ごとに完全分離
- PayPay受け取りリンクは購入者が注文時に入力

## 権限

### BOTオーナー
`.env` の `BOT_OWNER_IDS` にDiscordユーザーIDを設定します。

BOTオーナーは全サーバーの全自動販売機を管理できます。

```env
BOT_OWNER_IDS=123456789012345678
```

複数人の場合:

```env
BOT_OWNER_IDS=123456789012345678,987654321098765432
```

### サーバー管理者
DiscordのAdministrator権限を持つユーザーは、そのサーバーの共通設定と自動販売機を管理できます。

### 自動販売機オーナー
`/shop-create` を実行したユーザーがその自販機のオーナーになります。

### 自動販売機 管理ロール
自販機作成時または `/shop-config` でロールを設定すると、そのロールを持つユーザーも以下を操作できます。

- 商品追加
- 商品一覧
- 注文一覧
- 自販機パネル設置
- 自販機設定変更
- PayPay受け取り完了処理
- 注文却下

自販機自体の停止は、オーナー・サーバー管理者・BOTオーナーのみです。

## セットアップ

### 1. Node.js
Node.js 20以上を使用してください。

確認:

```powershell
node -v
npm -v
```

### 2. インストール

```powershell
npm install
```

### 3. .env作成

```powershell
Copy-Item .env.example .env
notepad .env
```

```env
DISCORD_TOKEN=BOTトークン
DISCORD_CLIENT_ID=Application_ID
BOT_OWNER_IDS=あなたのDiscordユーザーID
```

`DISCORD_GUILD_ID` は設定しません。

### 4. グローバルコマンド登録

```powershell
npm run deploy-commands
```

グローバルコマンドのため、Discord側への反映に少し時間がかかる場合があります。

### 5. 起動

```powershell
npm start
```

## 自動販売機の使い方

### 誰でも自販機を作成

```text
/shop-create
```

入力項目:

- `name` 自動販売機名
- `manager_role` 管理を許可するロール（任意）
- `order_channel` 注文通知先（任意。未指定なら実行したチャンネル）

作成後に `shop_id` が表示されます。

### 自販機一覧

```text
/shop-list
```

### 管理ロールや通知チャンネルを変更

```text
/shop-config shop_id:1 manager_role:@販売スタッフ order_channel:#注文通知
```

### 商品追加

```text
/product-add shop_id:1
```

商品ごとに以下を設定できます。

- 商品名
- 単価
- 在庫（-1で無制限）
- 説明
- 購入後DM文章
- 購入後ファイルURL
- 購入後付与ロール

### 自販機を設置

```text
/shop-panel shop_id:1
```

## 購入フロー

1. 購入者が自販機から商品選択
2. 購入手続き
3. 数量入力
4. `https://pay.paypay.ne.jp/...` のPayPay受け取りリンク入力
5. BOTが単価 × 数量を計算
6. 自販機専用の注文通知チャンネルへ注文を送信
7. 自販機オーナー / 管理ロール / サーバー管理者 / BOTオーナーがリンクを確認
8. 「受け取り完了・商品配布」
9. 在庫減算
10. 商品DM送信
11. 必要なら購入者ロール付与

PayPayリンクに設定された実際の金額をBOT自身が検証する機能はないため、受取処理前にPayPay画面上の金額を確認してください。

## その他の機能

- 認証パネル
- ロール選択
- チケット
- 自動返信
- 入退室通知
- 地震速報
- 天気
- AI画像生成
- 音声再生

サーバー共通設定はAdministratorまたはBOTオーナーが操作します。

## GitHub

`.env` は `.gitignore` 対象です。BOTトークンやAPIキーをGitHubへアップロードしないでください。
