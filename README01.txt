Discord MultiBot 2026-09-20 安定化・管理機能追加版

【追加】
/weather-setup : 全国47都道府県または地方を1コマンドで自動天気設定
/earthquake-setup : 全国/地方・投稿先・最低震度を1コマンドで設定
/role-create : 名前・権限プリセット・メンション可否・表示分離を指定後、Discord内カラーパネルから色を選んでロール作成
/role-delete : ロール削除。ロールパネル内の参照も自動除去
/verify-panel : name/description/role/approval_channel を個別指定。R18閲覧など用途別の認証パネルを複数設置可能
/shop-create /shop-config : history_channel を追加。購入履歴の管理者用固定チャンネルを自販機ごとに指定可能

【ロールパネル】
チャンネルごとに独立保存。登録数のBOT側固定上限なし。20件ずつページ切替。
Discord自体の1メッセージのコンポーネント制限を避けるためページ分割します。

【安定化】
天気APIは12秒タイムアウト・最大3回再試行。
地震APIも12秒タイムアウト。
天気/地震watcherはbusyロックとtry/finallyで多重実行を防止し、個別エラーでBOT全体を停止しにくい構成。
予期しないPromiseエラーはログ化して監視処理を継続。

【導入】
1. 既存 .env と data/store.json をバックアップ
2. この版を展開
3. package.json のあるフォルダーで npm install
4. npm run deploy-commands
5. npm start

例:
/weather-setup area:全国47都道府県 channel:#天気 time:07:00
/earthquake-setup channel:#地震 area:全国 min_intensity:3
/role-create name:R18閲覧 permission:権限なし
/verify-panel name:R18閲覧 description:18歳以上の方のみ申請してください role:@R18 approval_channel:#認証審査
