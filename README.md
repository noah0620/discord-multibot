# Discord MultiBot v5.5 管理者ロール版

BOTオーナーがサーバーごとに管理者ロールを設定できます。

```text
/admin-role-set role:@BOT管理者
```

以後、認証管理、ロールパネル管理、入退室設定、チケット設定、自動返信管理、
予約投稿、モデレーション、天気・地震設定、管理ページ、診断などは、
その管理者ロールを持つメンバーとBOTオーナーだけが使用できます。

```text
/admin-role-status
```

で現在の設定を確認できます。

一般ユーザー向けの天気表示、地震表示、音楽、購入などは制限しません。
認証通知の「承認する / 却下する」ボタンも管理者ロールで制限します。

更新:
```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.5-admin-role
npm install
npm run deploy-commands
npm start
```
