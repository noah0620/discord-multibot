# Discord MultiBot v5.6 鯖主管理者ロール版

管理者権限の仕組みを変更しました。

## 権限構成

**サーバー所有者（鯖主）**
- `/admin-role-set` を使用可能
- 管理者ロールを設定・変更可能
- 管理者コマンドを常に使用可能

**鯖主が指定した管理者ロール**
- 認証管理
- ロールパネル管理
- 入退室設定
- チケット設定
- 自動返信管理
- 予約投稿
- モデレーション
- 天気・地震設定
- 各管理ページ
- `/diagnostics`
などを使用・閲覧可能

**その他のメンバー**
- 管理者コマンド・管理情報は使用不可
- 一般向けの天気、地震、音楽、購入などは従来どおり利用可能

BOTオーナーは設定事故時の緊急復旧用として管理コマンドを利用できますが、
`/admin-role-set` によるサーバー管理者ロールの変更は鯖主だけです。

## 最初の設定

鯖主が:

```text
/admin-role-set role:@BOT管理者
```

確認:

```text
/admin-role-status
```

## 更新

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.6-guild-owner-admin-role
npm install
npm run deploy-commands
npm start
```

`.env` は前バージョンからコピーしてください。
AI生成機能は搭載していません。
