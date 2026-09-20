# 機能修正版

- /weather-setup: 一括設定時に古い地域別投稿先をリセットし、指定チャンネルへ統一。設定直後のテスト配信を追加。
- /earthquake-setup: 設定直後に現在取得できる最新地震情報を「テスト」と明記して投稿可能。
- /role-create: 管理者権限を色選択時にも再確認。色選択後にロール作成。
- /role-delete: 既存のロール階層・Manage Roles検査を維持。
- /verify-panel: 同一ユーザーでも用途（付与ロール）が違えば複数申請可能。
- 自動販売機 history_channel: 注文通知先と同じチャンネルを指定した場合でも購入履歴を投稿。作成/変更時に履歴先を表示。

更新後は `npm install` → `npm run deploy-commands` → `npm start` を実行してください。
