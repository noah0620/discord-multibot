# Discord MultiBot v5.3 認証申請通知版

v5.2の全機能を維持したまま、認証申請フローを更新しました。

## 認証の新しい流れ

管理者:

```text
/verify-panel role:@認証済み approval_channel:#認証承認
```

これで認証パネルを設置します。

メンバーが「認証を申請する」を押すと、指定した `#認証承認` チャンネルへ自動で通知されます。

通知には次の情報が表示されます。

- 申請番号
- 申請者
- DiscordユーザーID
- 承認後に付与するロール
- 申請日時
- 「承認する」ボタン
- 「却下する」ボタン

管理者が **承認する** を押すと、申請者へ指定ロールを付与します。
**却下する** を押すとロールは付与しません。

承認・却下結果は申請者へDMでも通知します。DMを閉じている場合でも承認処理自体は行われます。

## 承認通知先だけ変更する

```text
/verify-settings approval_channel:#新しい認証承認
```

## 設定確認

```text
/verify-status
```

認証ロールと承認通知先を確認できます。

従来の `/verify-admin` も残しているため、通知を見失った場合でも承認待ちを管理者ページから確認できます。

## 更新

```powershell
cd C:\NoahXJP-site\Discord\discord-multibot-v5.3-verification-notify
npm install
npm run deploy-commands
npm start
```

`/verify-settings` と `/verify-panel` の引数が更新されているため、`npm run deploy-commands` は必須です。

AI生成機能は搭載していません。
