今回の追加・修正

1. 参加通知タイトル設定
/welcome-settings title:好きなタイトル

2. 入室時に認証パネルを案内
/welcome-settings verification_channel:#認証
参加通知本文に「認証はこちら: #認証」が自動表示されます。

3. ロールパネル
チャンネルごとに設定を独立保存します。
/role-add label:A role:@ロール
/role-panel title:チャンネルアクセス権限 description:基本的なやり方はこのロールを付けて確認してください。
登録数にBOT独自の固定上限は設けず、Discordの表示上限に合わせページ切替します。

4. 自動販売機
購入時、販売者DMにも購入者ユーザー名・メンション・Discord IDを通知します。

5. 画像・動画検索
/media-add name:名前 url:https://... tags:タグ1,タグ2 type:画像
/media-search keyword:検索語
/media-remove id:番号

6. 最新情報を簡単登録
/latest-add url:プロフィールURLまたはRSS URL channel:#投稿先
URLから取得方法を自動判定します。

導入
1) .env を設定
2) package.json があるこのフォルダーで以下を実行
npm install
npm run deploy-commands
npm start

既存の天気・地震・自動販売機・SNS/RSS等の機能は残しています。
