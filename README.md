# 進捗破壊ボット

## プロジェクトプロパティ
|プロパティ名|説明|
|---|---|
|SlackApiToken|スラックボットを作成|
|ProgressReportSheet|スプレッドシート URL https://docs.google.com/spreadsheets/d/XXXXXXXXXX//edit#gid=0 の XXXXXXXXXX|

## 導入する
### 1. GoogleAppsScript(GAS) のプロジェクトを作る [GAS]
1. https://script.google.com/ で `新しいプロジェクト` を押す
2. `無題のプロジェクト` を押して、自分で好きなプロジェクト名を付ける
3. main.js の内容を GAS プロジェクトにコピペする

### 2. プロジェクトプロパティの変更の仕方 [GAS]
> `3.8` と `4.3` で必要になる
1. GAS のプロジェクトを開く
2. `以前のエディタを使用` を押す
3. `ファイル > プロジェクトのプロパティ` を押す
4. `スクリプトのプロパティ` を選択
5. 行を追加で `プロパティ` に名前、 `値` に設定する値を入力
6. `保存` で終了

### 3. スラックボットの作り方 [SlackAPI]
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
7. `Install to Workspase` を押し、ボットをワークスペースにインストールする
8. `Bot User OAuth Access Token` を `SlackApiToken` としてプロパティに追加 [GAS]

### 4. 進捗報告を管理するスプレッドシートを設定する
1. https://docs.google.com/spreadsheets で新規作成する
2. 開いたURL `https://docs.google.com/spreadsheets/d/XXXXXXXXXX/edit#gid=0` の `XXXXXXXXXX` の部分を切り取る
3. 切り取ったIDを `ProgressReportSheet` としてプロパティに追加 [GAS]

### 5. ウェブアプリを公開する [GAS]
1. `公開 > ウェブアプリケーションとして導入` を選択
2. `Project version` を `New` に変更
3. `Who has access to the app` を `Anyone, even anonymous` に変更
4. `Deploy` で公開し、URLをコピー(`5.1` の手順で後からでもURLをコピーできる)
5. `このアプリは Google で確認されていません` と言われたら `詳細` を押し、`「プロジェクト名」（安全ではないページ）に移動` を押す

### 6. イベントを受け付ける [SlackAPI]
1. `Features` から `Event Subscriptions` を選択
2. `Enable Events` を `On` に変更
3. `5.4` でコピーしたURLの末尾に `?path=event` を付加して、`Request URL` に貼り付ける
4. `Subscribe to bot events` を選択
5. `message.channels` を追加し、保存

### 7. コマンドを追加する [SlackAPI]
1. `Features` から `Slash Commands` を選択
2. `Create New Command` を選択
3. `nagao` を `Command` に入力する
4. `5.4` でコピーしたURLの末尾に `?path=cmd` を付加して、`Request URL` に貼り付ける
5. `Short Description` を `進捗破壊ボット` に変更
6. `Escape channels, users, and links sent to your app` にチェックをつけて、保存

### 8. 進捗報告するチャンネルを設定する [Slack]
1. スラックでチャンネルを作成する
2. 作成したチャンネルで `/nagao channel set` というコマンドを実行することで設定
3. `/nagao channel check` で確認

### 9. 日付投稿・進捗破壊の時間を設定する [Slack]
1. スラックで `/nagao time date [Hour]` で設定  
   例: `/nagao time date 8` ... ８時に投稿
2. スラックで `/nagao time destory [Hour]` で設定  
   例: `/nagao time date 20` ... 20時に破壊

### 10. 進捗報告する人を設定する [Slack]
1. スラックで `/nagao user add [@User] [Name]` で追加  
   例: `/nagao user add @Slackの名前 任意の表示名`
2. `/nagao user remove [@User]` で削除可能
3. `/nagao user list` で一覧を表示

### 11. 進捗報告する日付を設定する [Slack]
1. 毎週、報告する曜日は `/nagao date every` で設定
2. 日付単位で設定する場合は `/nagao date inverse` を使用  
   `inverse` は反転という意味。  
   `every` によって報告する予定となっていた日は報告しない日になる。  
   報告しない予定となっていた日は報告する日になる。

### 12. 実行テストをしてみる [GAS]
1. `関数を選択` をクリックし `runTest` を選択
2. 実行の許可が必要なので、許可する。
   安全ではないと言われたら `詳細` を押し、`安全ではないページ　に移動` を押す
3. チャンネルが正しく設定されていれば、`テストメッセージ` が届く
