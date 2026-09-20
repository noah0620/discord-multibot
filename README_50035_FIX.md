# Discord API 50035 修正

`verify-panel` のオプション順序を修正しました。
Discord APIでは必須オプションを任意オプションより前に定義する必要があります。

修正後の順序:
1. name (必須)
2. role (必須)
3. approval_channel (必須)
4. description (任意)

導入後:
```
npm install
npm run deploy-commands
npm start
```
