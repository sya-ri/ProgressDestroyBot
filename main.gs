/* プロジェクトプロパティ */
const properties = PropertiesService.getScriptProperties().getProperties();
const SlackApiToken = properties.SlackApiToken;
const ProgressReportSheet = properties.ProgressReportSheet;
const UserIdTableSheet = properties.UserIdTableSheet;
const TargetDateTableSheet = properties.TargetDateTableSheet;
const ProgressReportChannel = properties.ProgressReportChannel;
/* プロジェクトプロパティ */

var spreadSheet = SpreadsheetApp.openById(ProgressReportSheet);

function test(){
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
var _uox = function(f, retry) {
  if (retry == null) retry = 3;
  var count = 0;
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
  var opt = {
    method: "POST",
    payload: param
  };
  var res = _uox(function() {
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

function doPost(e) {
  var postData = JSON.parse(e.postData.getDataAsString());
  if(postData.type == "url_verification") {
    return ContentService.createTextOutput(postData.challenge);
  } else if(postData.event.bot_profile == null){
    var channel = postData.event.channel;
    if(postData.event.channel_type == "channel" && channel == progressReportChannel){
      var subtype = postData.event.subtype;
      if(subtype == null || subtype == "file_share"){ // 追加
        var ts = postData.event.thread_ts;
        if(ts != null){
          editProgress(channel, postData.event.user, ts, postData.event.ts, postData.event.text, true);
        }
      } else if(subtype == "message_changed"){ // 変更
        var ts = postData.event.message.thread_ts;
        if(ts != null){
          editProgress(channel, postData.event.message.user, ts, postData.event.message.ts, postData.event.message.text, false);
        }
      } else if(subtype == "message_deleted"){
        var ts = postData.event.previous_message.thread_ts;
        if(ts != null){
          editProgress(channel, postData.event.previous_message.user, ts, postData.event.previous_message.ts, "", false);
        }
      }
    }
  }
}

function postDay(){
  var today = Moment.moment().format("MM/DD");
  if(!isTargetDate(today)) return;
  slackPostMessage(progressReportChannel, today);
  deleteDestoryHistory();
}

function postDestroy(){
  var today = Moment.moment().format("MM/DD");
  if(!isTargetDate(today)) return;
  var sheet = spreadSheet.getSheetByName(UserIdTableSheet);
  var allLine = sheet.getRange("A2:B").getValues();
  var line = getSheetLineOfDate(today);
  for(var i = 0; i < allLine.length; i++){
    var userSheet = spreadSheet.getSheetByName(allLine[i][1]);
    var value = userSheet.getRange("B" + line).getValue();
    if(value != null && value != "") continue;
    slackChatPostMessage(allLine[i][0], "お前、破壊されたいのか？？？");
  }
}

function editProgress(channel, user, ts, messageTs, content, editIfEmpty){
  var sheetName = getSheetName(user);
  if(sheetName == null){
    //slackPostMessage(channel, "シートが登録されてないです。開発者のお兄ちゃんに言ってね");
    return;
  }
  var targetDate = Moment.moment(ts * 1000).subtract(9, 'h').format("MM/DD");
  var isSuccess = setProgress(sheetName, targetDate, content, editIfEmpty);
  if(isSuccess == null){
    //slackPostMessage(channel, "なんかバグりました。開発者のお兄ちゃんに言ってね");
    return;
  }
  if(!isSuccess){
    slackChatDelete(channel, messageTs);
  }
}

function getSheetName(user){
  var sheet = spreadSheet.getSheetByName(UserIdTableSheet);
  var allLine = sheet.getRange("A2:B").getValues();
  for(var i = 0; i < allLine.length; i++){
    if(user == allLine[i][0]){
      return allLine[i][1];
    }
  }
  return null;
}

function setProgress(sheetName, targetDate, content, editIfEmpty){
  var line = getSheetLineOfDate(targetDate);
  if(line == null) return null;
  var sheet = spreadSheet.getSheetByName(sheetName);
  var range = sheet.getRange("B" + parseInt(line, "10"));
  var value = range.getValue();
  if(editIfEmpty && value != null && value != "") return false;
  range.setValue(content);
  return true;
}

var sheetLineCacheDate = null;
var sheetLineOfDate = null;

function getSheetLineOfDate(targetDate){
  if(sheetLineCacheDate == targetDate && sheetLineOfDate != null) return sheetLineOfDate;
  var sheet = spreadSheet.getSheetByName(TargetDateTableSheet);
  var allLine = sheet.getRange("A2:A").getValues();
  for(var i = 0; i < allLine.length - 1; i++){
    var date = Moment.moment(allLine[i][0]).format("MM/DD");
    if(targetDate == date){
      sheetLineCacheDate = targetDate;
      sheetLineOfDate = i + 2;
      return sheetLineOfDate;
    }
  }
  return null;
}

function isTargetDate(targetDate) {
  var sheet = spreadSheet.getSheetByName(TargetDateTableSheet);
  var allLine = sheet.getRange("A2:A").getValues();
  for(var i = 0; i < allLine.length - 1; i++){
    var date = Moment.moment(allLine[i][0]).format("MM/DD");
    if(targetDate == date){
      return true;
    }
  }
  return false;
}

function deleteDestoryHistory() {
  for(var i = 0; i < allLine.length; i++){
    var userSheet = spreadSheet.getSheetByName(allLine[i][1]);
    var value = userSheet.getRange("B" + line).getValue();
    if(value != null && value != "") continue;
    var im = allLine[i][0];
    var imHistory = slackChannelsHistory(im.id, {count: 1000});
    var deleteSuccessCount = 0;
    var deleteFailureCount = 0;
    imHistory.messages.forEach(function(message){
      if(message.user != im.user && !message.hidden){
        if(slackChatDelete(im.id, message.ts).ok){
          deleteSuccessCount ++;
        } else {
          deleteFailureCount ++;
        }
      }
    });
    if(deleteSuccessCount != 0 || deleteFailureCount != 0){
      Logger.log(im.user + " 削除: " + deleteSuccessCount + " | " + deleteFailureCount);
    }
  }
}
