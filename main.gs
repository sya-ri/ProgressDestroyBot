/* プロジェクトプロパティ */
const properties = PropertiesService.getScriptProperties().getProperties();
const SlackApiToken = properties.SlackApiToken;
const ProgressReportSheet = properties.ProgressReportSheet;
const UserIdTableSheet = properties.UserIdTableSheet;
const TargetDateTableSheet = properties.TargetDateTableSheet;
const ProgressReportChannel = properties.ProgressReportChannel;
/* プロジェクトプロパティ */

const spreadSheet = SpreadsheetApp.openById(ProgressReportSheet);

function runTest(){
  var response;
  // 接続テスト
  response = slackAuthTest();
  if(response.ok){
    Logger.log("SlackAPIに接続しました");
  } else {
    throw new Error("SlackAPIの接続に失敗しました " + JSON.stringify(response));
  }
  // チャンネル参加
  response = slackChannelsJoin(ProgressReportChannel);
  if(response.ok){
    Logger.log("チャンネルに参加しました");
  } else {
    throw new Error("チャンネル参加に失敗しました " + JSON.stringify(response));
  }
  // メッセージ送信
  response = slackChatPostMessage(ProgressReportChannel, "テストメッセージ");
  if(response.ok){
    Logger.log("メッセージ送信に成功しました");
  } else {
    throw new Error("メッセージ送信に失敗しました " + JSON.stringify(response));
  }
  // メッセージ削除
  Utilities.sleep(5000); // 送信から５秒後に削除
  response = slackChatDelete(ProgressReportChannel, response.message.ts);
  if(response.ok){
    Logger.log("メッセージ削除に成功しました");
  } else {
    throw new Error("メッセージ削除に失敗しました " + JSON.stringify(response));
  }
  // メッセージ履歴取得
  response = slackChannelsHistory(ProgressReportChannel, 1);
  if(response.ok){
    Logger.log("メッセージ履歴取得に成功しました");
  } else {
    throw new Error("メッセージ履歴取得に失敗しました " + JSON.stringify(response));
  }
  Logger.log("全てのテスト処理に成功");
}

/*** Slack API ***/
const _uox = function(f, retry) {
  if (retry == null) retry = 3;
  const count = 0;
  while (true) {
    try {
      return f();
    } catch (e) {
      if (retry < count) throw e;
      Utilities.sleep(1000);
      count++;
    }
  }
};

function slackFetch(path, param, option) {
  if (param == null) param = {};
  if (option == null) option = {};
  param.token = SlackApiToken;
  const opt = {
    method: "POST",
    payload: param
  };
  const res = _uox(function() {
    return UrlFetchApp.fetch("https://slack.com/api/" + path, opt);
  });
  return JSON.parse(res.getContentText());
}

// https://api.slack.com/methods/auth.test
function slackAuthTest() {
  return slackFetch("auth.test");
}

// https://api.slack.com/methods/conversations.join
function slackChannelsJoin(channel) {
  return slackFetch("conversations.join", {
    "channel": channel
  });
}

// https://api.slack.com/methods/conversations.history
function slackChannelsHistory(channel, limit) {
  return slackFetch("conversations.history", {
    "channel": channel,
    "limit": limit
  });
}

// https://api.slack.com/methods/conversations.list
function slackChannelsList(limit) {
  return slackFetch("conversations.list", {
    "limit": limit
  });
}

// https://api.slack.com/methods/chat.postMessage
function slackChatPostMessage(channel, text) {
  return slackFetch("chat.postMessage", {
    "channel": channel,
    "text": text
  });
}

// https://api.slack.com/methods/chat.delete
function slackChatDelete(channel, ts) {
  return slackFetch("chat.delete", {
    "channel": channel,
    "ts": ts
  });
}
/*** Slack API ***/

/*** User Option ***/
// --- option: JSON
// {
//   "users": {
//     "$slack_user_name": "$display_name
//   }
// }
function saveOption(name, json) {
  PropertiesService.getScriptProperties().setProperty(name, JSON.stringify(json));
}

function getOption(name) {
  const rawJson = PropertiesService.getScriptProperties().getProperty(name);
  var json = (rawJson == null)? {} : JSON.parse(rawJson);
  return json;
}

function editOption(name, action) {
  const json = getOption(name);
  action(json);
  saveOption(name, json);
}

function addUser(id, name) {
  editOption("users", (json) => {
    json[id] = name;
  });
}

function removeUser(id) {
  editOption("users", (json) => {
    delete json[id];
  });
}

function getUser(id) {
  const json = getOption("users");
  if(json) return json[id];
  return null;
}

function getUsers() {
  const json = getOption("users");
  if(json) return json;
  return {};
}
/*** User Option ***/

function doPost(e) {
  switch(e.parameter["path"]) {
    case "cmd":
      return doPostCmd(e);
    case "event":
      return doPostEvent(e);
  }
}

function doPostCmd(e) {
  const result = ContentService.createTextOutput();
  const arg = e.parameter["text"].split(RegExp("\\s+"));
  if (arg[0] == e.parameter["command"]) arg.shift();
  switch (arg[0].toLowerCase()) {
    case "user":
      switch ((arg[1])? arg[1].toLowerCase() : "") {
        case "add":
          if (arg.length != 4) return result.setContent("*/nagao user add [@User] [Name]*: ユーザーを追加します");
          if (!(/<@.+|.+>/.test(arg[2]))) return result.setContent("ユーザーを指定してください");
          var id = /<@([^|]+)|[^>]+>/.exec(arg[2])[1];
          var name = arg[3];
          addUser(id, name);
          return result.setContent("<@" + id + "> を " + name + " として登録しました");
        case "remove":
          if (arg.length != 3) return result.setContent("*/nagao user remove [@User]*: ユーザーを削除します");
          if (!(/<@.+|.+>/.test(arg[2]))) return result.setContent("ユーザーを指定してください");
          var id = /<@([^|]+)|[^>]+>/.exec(arg[2])[1];
          removeUser(id);
          return result.setContent("<@" + id + "> を削除しました");
        case "list":
          var users = getUsers();
          var content = "*ユーザー一覧*\n";
          Object.keys(users).forEach(id => { content += "<@" + id + "> : " + users[id] + "\n" });
          return result.setContent(content);
        default:
          return result.setContent(
            "*/nagao user add [@User] [Name]*: ユーザーを追加します\n" +
            "*/nagao user remove [@User]*: ユーザーを削除します\n" +
            "*/nagao user list*: ユーザーの一覧を表示します\n"
          );
      }
    case "time":
      switch ((arg[1])? arg[1].toLowerCase() : "") {
        case "date":
          if (arg.length != 3) return result.setContent("*/nagao time date [Hour]*: 時間も入力してください")
          var hour = Number(arg[2]);
          if (hour == NaN || hour < 0 || 24 < hour) return result.setContent("*/nagao time date [Hour]*: 時間が不正です")
          ScriptApp.getProjectTriggers().forEach((trigger) => { if(trigger.getHandlerFunction() == "postDate") ScriptApp.deleteTrigger(trigger); });
          ScriptApp.newTrigger("postDate").timeBased().everyHours(hour).create();
          return result.setContent("日付送信の時間を " + hour + "時に設定しました");
        case "destory":
          if (arg.length != 3) return result.setContent("*/nagao time date [Hour]*: 時間も入力してください")
          var hour = Number(arg[2]);
          if (hour == NaN || hour < 0 || 24 < hour) return result.setContent("*/nagao time destory [Hour]*: 時間が不正です")
          ScriptApp.getProjectTriggers().forEach((trigger) => { if(trigger.getHandlerFunction() == "postDestory") ScriptApp.deleteTrigger(trigger); });
          ScriptApp.newTrigger("postDestory").timeBased().everyHours(hour).create();
          return result.setContent("進捗破壊の時間を " + hour + "時に設定しました");
        default:
          return result.setContent(
            "*/nagao time date [Hour]*: 日付を送信する時間を設定します\n" +
            "*/nagao time destory [Hour]*: 進捗破壊する時間を設定します\n"
          );
      }
    default:
      return result.setContent(JSON.stringify(e));
  }
}

function doPostEvent(e) {
  const postData = JSON.parse(e.postData.getDataAsString());
  if(postData.type == "url_verification") {
    return ContentService.createTextOutput(postData.challenge);
  } else if(postData.event.bot_profile == null){
    const channel = postData.event.channel;
    if(postData.event.channel_type == "channel" && channel == progressReportChannel){
      const subtype = postData.event.subtype;
      if(subtype == null || subtype == "file_share"){ // 追加
        const ts = postData.event.thread_ts;
        if(ts != null){
          editProgress(channel, postData.event.user, ts, postData.event.ts, postData.event.text, true);
        }
      } else if(subtype == "message_changed"){ // 変更
        const ts = postData.event.message.thread_ts;
        if(ts != null){
          editProgress(channel, postData.event.message.user, ts, postData.event.message.ts, postData.event.message.text, false);
        }
      } else if(subtype == "message_deleted"){
        const ts = postData.event.previous_message.thread_ts;
        if(ts != null){
          editProgress(channel, postData.event.previous_message.user, ts, postData.event.previous_message.ts, "", false);
        }
      }
    }
  } 
}

/*** Date ***/
const today = new Date();
const todayDisplay = Utilities.formatDate(today, "Asia/Tokyo", "MM/dd");
const todayIsDestoryDate = isDestoryDate(todayDisplay);

function isDestoryDate(targetDate) {
  return true;
}
/*** Date ***/

function postDate(){
  if(!todayIsDestoryDate) return;
  slackChatPostMessage(ProgressReportChannel, today);
  deleteDestoryHistory();
}

function postDestroy(){
  if(!todayIsDestoryDate) return;
  const users = getUsers();
  Object.keys(users).forEach((id) => {
    slackChatPostMessage(id, "お前、破壊されたいのか？？？");
  });
}

function editProgress(channel, user, ts, messageTs, content, editIfEmpty){
  const sheetName = getSheetName(user);
  if(sheetName == null){
    //slackPostMessage(channel, "シートが登録されてないです。開発者のお兄ちゃんに言ってね");
    return;
  }
  const targetDate = Moment.moment(ts * 1000).subtract(9, 'h').format("MM/DD");
  const isSuccess = setProgress(sheetName, targetDate, content, editIfEmpty);
  if(isSuccess == null){
    //slackPostMessage(channel, "なんかバグりました。開発者のお兄ちゃんに言ってね");
    return;
  }
  if(!isSuccess){
    slackChatDelete(channel, messageTs);
  }
}

function getSheetName(user){
  const sheet = spreadSheet.getSheetByName(UserIdTableSheet);
  const allLine = sheet.getRange("A2:B").getValues();
  for(const i = 0; i < allLine.length; i++){
    if(user == allLine[i][0]){
      return allLine[i][1];
    }
  }
  return null;
}

function setProgress(sheetName, targetDate, content, editIfEmpty){
  const line = getSheetLineOfDate(targetDate);
  if(line == null) return null;
  const sheet = spreadSheet.getSheetByName(sheetName);
  const range = sheet.getRange("B" + parseInt(line, "10"));
  const value = range.getValue();
  if(editIfEmpty && value != null && value != "") return false;
  range.setValue(content);
  return true;
}

const sheetLineCacheDate = null;
const sheetLineOfDate = null;

function getSheetLineOfDate(targetDate){
  if(sheetLineCacheDate == targetDate && sheetLineOfDate != null) return sheetLineOfDate;
  const sheet = spreadSheet.getSheetByName(TargetDateTableSheet);
  const allLine = sheet.getRange("A2:A").getValues();
  for(const i = 0; i < allLine.length - 1; i++){
    const date = Moment.moment(allLine[i][0]).format("MM/DD");
    if(targetDate == date){
      sheetLineCacheDate = targetDate;
      sheetLineOfDate = i + 2;
      return sheetLineOfDate;
    }
  }
  return null;
}

function deleteDestoryHistory() {
  const channels = slackChannelsList(1000).channels;
  Object.keys(channels).forEach(channel => {
    if(!channel.is_im) return;
    const imHistory = slackChannelsHistory(channel.id, 1000);
    const deleteSuccessCount = 0;
    const deleteFailureCount = 0;
    imHistory.messages.forEach(message => {
      if(!message.hidden){
        if(slackChatDelete(message.channel, message.ts).ok){
          deleteSuccessCount ++;
        } else {
          deleteFailureCount ++;
        }
      }
    });
    if(deleteSuccessCount != 0 || deleteFailureCount != 0){
      Logger.log(im.user + " 削除: " + deleteSuccessCount + " | " + deleteFailureCount);
    }
  });
}
