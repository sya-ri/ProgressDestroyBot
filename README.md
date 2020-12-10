# 進捗破壊ボット

## プロジェクトプロパティ
|プロパティ名|説明|
|---|---|
|SlackApiToken|スラックボットを作成|
|ProgressReportSheet|スプレッドシート URL https://docs.google.com/spreadsheets/d/XXXXXXXXXX/ の XXXXXXXXXX|

## 導入する
### 0. 導入する際はフォークしてください

### 1. GoogleAppsScript(GAS) のプロジェクトを作る
1. https://script.google.com/ で `新しいプロジェクト` を押す
2. `無題のプロジェクト` を押して、自分で好きなプロジェクト名を付ける

### 2. プロジェクトプロパティの変更
1. GAS のプロジェクトを開く
2. `ファイル > プロジェクトのプロパティ` を押す
3. `スクリプトのプロパティ` を選択
4. 行を追加で `プロパティ` に名前、 `値` に設定する値を入力
5. `保存` で終了

### 3. スラックボットの作り方
1. https://api.slack.com/apps で `Create New App` を押す
2. AppName を入力。  Development Slack Workspace で運用するワークスペースを選択
3. `Features` から `App Home` を選択
4. `App Display Name > Edit` を選択し、 `Display Name`, `Default Name` を設定
5. `Features` から `OAuth & Permissions` を選択
6. `Bot Token Scopes` に以下を追加
> - channels:history
> - channels:join
> - chat:write
> - commands
> - im:history
7. ワークスペースにインストールする
8. `Bot User OAuth Access Token` を `SlackApiToken` としてプロパティに追加

### 4. 進捗報告を管理するスプレッドシートを設定する
1. https://docs.google.com/spreadsheets で新規作成する
2. 開いたURL `https://docs.google.com/spreadsheets/d/XXXXXXXXXX/` の `XXXXXXXXXX` の部分を切り取る
3. 切り取ったIDを `ProgressReportSheet` としてプロパティに追加

### 5. ウェブアプリを公開する
1. `公開 > ウェブアプリケーションとして導入` を選択
2. `Project version` を `New` に変更
3. `Who has access to the app` を `Anyone, even anonymous` に変更
4. `Deploy` で公開し、URLをコピー(`7.1` の手順で後からでもURLをコピーできる)

### 6. イベントを受け付ける
1. `Features` から `Event Subscriptions` を選択
2. `Enable Events` を `On` に変更
3. `7.4` でコピーしたURLの末尾に `?path=event` を付加して、`Request URL` に貼り付ける
4. `Subscribe to bot events` を選択
5. `message.channels` を追加し、保存

### 7. コマンドを追加する
1. `Features` から `Slash Commands` を選択
2. `Create New Command` を選択
3. `7.4` でコピーしたURLの末尾に `?path=cmd` を付加して、`Request URL` に貼り付ける
4. `Short Description` を `進捗破壊ボット` に変更
5. `Escape channels, users, and links sent to your app` にチェックをつけて、保存

### 8. 進捗報告するチャンネルを設定する
1. スラックでチャンネルを作成する
2. 作成したチャンネルで `/nagao channel set` で設定
3. `/nagao channel check` で確認

### 9. 日付投稿・進捗破壊の時間を設定する
1. スラックで `/nagao time date [Hour]` で設定  
   例: `/nagao time date 8` ... ８時に投稿
2. スラックで `/nagao time destory [Hour]` で設定  
   例: `/nagao time date 20` ... 20時に破壊

### 10. 進捗報告する人を設定する
1. スラックで `/nagao user add [@User] [Name]` で追加  
   例: `/nagao user add @Slackの名前 表示名`
2. `/nagao user remove [@User]` で削除可能
3. `/nagao user list` で一覧を表示

### 11. 進捗報告する日付を設定する
1. 毎週、報告する曜日は `/nagao date every` で設定
2. 日付単位で設定する場合は `/nagao date inverse` を使用  
   `inverse` は反転という意味。  
   `every` によって報告する予定となっていた日は報告しない日になる。  
   報告しない予定となっていた日は報告する日になる。

### 12. 実行テストをしてみる
1. main.gs の内容を GAS プロジェクト の main.gs にコピペする
2. `関数を選択` をクリックし `runTest` を選択
3. 実行の許可が必要なので、許可する。
   安全ではないと言われたら `詳細` を押し、`安全ではないページ　に移動` を押す
