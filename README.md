# 進捗破壊ボット

## プロジェクトプロパティ
|プロパティ名|説明|
|---|---|
|SlackApiToken|スラックボットを作成|
|ProgressReportSheet|スプレッドシート URL https://docs.google.com/spreadsheets/d/XXXXXXXXXX/ の XXXXXXXXXX|
|UserIdTableSheet|ProgressReportSheet 内のユーザー一覧のシート|
|TargetDateTableSheet|ProgressReportSheet 内の日付一覧のシート|
|ProgressReportChannel|スラックのチャンネル URL https://~~~~~~.slack.com/archives/XXXXXXXXXXX の XXXXXXXXXXX|

## 導入する
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
3. `Features` から `OAuth & Permissions` を選択
4. `Bot Token Scopes` に以下を追加
> - channels:history
> - channels:read
> - chat:write
> - files:read
> - im:history
> - im:read
> - im:write
> - users:read
5. ワークスペースにインストールする
6. `Bot User OAuth Access Token` を `SlackApiToken` としてプロパティに追加

### 4. 進捗報告するチャンネルを設定する
1. スラックでチャンネルを作成する
2. 作成したチャンネルを右クリックでリンクをコピー
3. `https://~~~~~.slack.com/archives/XXXXXXXXXXX` というURLを取得できると思うので、 `XXXXXXXXXXX` の部分を切り取る
4. 切り取ったチャンネルIDを　`ProgressReportChannel` としてプロパティに追加

### 5. 進捗報告を管理するスプレッドシートを設定する
1. https://docs.google.com/spreadsheets で新規作成する
2. 開いたURL `https://docs.google.com/spreadsheets/d/XXXXXXXXXX/` の `XXXXXXXXXX` の部分を切り取る
3. 切り取ったIDを `ProgressReportSheet` としてプロパティに追加
