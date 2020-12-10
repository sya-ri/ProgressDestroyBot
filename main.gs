/* プロジェクトプロパティ */
const properties = PropertiesService.getScriptProperties().getProperties();
const SlackApiToken = properties.SlackApiToken;
const ProgressReportSheet = properties.ProgressReportSheet;
/* プロジェクトプロパティ */

const spreadSheet = SpreadsheetApp.openById(ProgressReportSheet);

function runTest(){
  const channel = getChannel();
  var response;
  // 接続テスト
  response = slackAuthTest();
  if(response.ok){
    Logger.log("SlackAPIに接続しました");
  } else {
    throw new Error("SlackAPIの接続に失敗しました " + JSON.stringify(response));
  }
  // チャンネル参加
  response = slackChannelsJoin(channel);
  if(response.ok){
    Logger.log("チャンネルに参加しました");
  } else {
    throw new Error("チャンネル参加に失敗しました " + JSON.stringify(response));
  }
  // メッセージ送信
  response = slackChatPostMessage(channel, "テストメッセージ");
  if(response.ok){
    Logger.log("メッセージ送信に成功しました");
  } else {
    throw new Error("メッセージ送信に失敗しました " + JSON.stringify(response));
  }
  // メッセージ削除
  Utilities.sleep(5000); // 送信から５秒後に削除
  response = slackChatDelete(channel, response.message.ts);
  if(response.ok){
    Logger.log("メッセージ削除に成功しました");
  } else {
    throw new Error("メッセージ削除に失敗しました " + JSON.stringify(response));
  }
  // メッセージ履歴取得
  response = slackChannelsHistory(channel, 1);
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

const dayList = ["日", "月", "火", "水", "木", "金", "土"];

function setDays(days) {
  PropertiesService.getScriptProperties().setProperty("days", days.join(","));
}

function getDays() {
  const rawArray = PropertiesService.getScriptProperties().getProperty("days");
  if(rawArray) return rawArray.split(",").map(day => parseInt(day, 10));
  return [];
}

function setDates(dates) {
  PropertiesService.getScriptProperties().setProperty("dates", dates.join(","));
}

function getDates() {
  const array = PropertiesService.getScriptProperties().getProperty("dates");
  if(array) return array.split(",");
  return [];
}

function setChannel(channel) {
  PropertiesService.getScriptProperties().setProperty("slack_channel", channel); 
}

function getChannel() {
  return PropertiesService.getScriptProperties().getProperty("slack_channel");
}
/*** User Option ***/

/*** doPost ***/
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
    case "channel":
      switch ((arg[1])? arg[1].toLowerCase() : "") {
        case "set":
          var channel = e.parameters.channel_id;
          setChannel(String(channel));
          return result.setContent("進捗報告のチャンネルを <#" + channel + "> に変更しました");
        case "check":
          var channel = getChannel();
          return result.setContent("進捗報告のチャンネルは <#" + channel + "> です");
        default:
          return result.setContent(
            "*/nagao channel set*: 進捗報告のチャンネルを設定します\n" +
            "*/nagao channel check*: 進捗報告のチャンネルを確認します\n"
          );
      }
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
    case "date":
      switch ((arg[1])? arg[1].toLowerCase() : "") {
        case "every":
          const days = getDays();
          switch ((arg[2])? arg[2].toLowerCase() : "") {
            case "add":
              if (arg.length != 4) return result.setContent("*/nagao date every add [0~6]*: 曜日を入力してください")
              var dayNumber = Number(arg[3]);
              if (dayNumber == NaN || dayNumber < 0 || 6 < dayNumber) return result.setContent("*/nagao date every add [0~6]*: 曜日が不正です");
              if (days.includes(dayNumber)) return result.setContent("*/nagao date every add [0~6]*: 既に存在する曜日です");
              days.push(dayNumber);
              days.sort();
              setDays(days);
              return result.setContent("毎週報告する曜日に" + dayList[dayNumber] + "曜日を追加しました");
            case "remove":
              if (arg.length != 4) return result.setContent("*/nagao date every remove [0~6]*: 曜日を入力してください")
              var dayNumber = Number(arg[3]);
              if (dayNumber == NaN || dayNumber < 0 || 6 < dayNumber) return result.setContent("*/nagao date every remove [0~6]*: 曜日が不正です");
              if (!days.includes(dayNumber)) return result.setContent("*/nagao date every add [0~6]*: 存在しない曜日です");
              days.splice(days.indexOf(dayNumber), 1);
              setDays(days);
              return result.setContent("毎週報告する曜日から" + dayList[dayNumber] + "曜日を削除しました");
            case "list":
              var content = "*曜日一覧*\n";
              days.forEach(day => { content += dayList[day] + ", " });
              return result.setContent(content);
            default:
              return result.setContent(
                "*/nagao date every add [0~6]*: 毎週報告する曜日を追加します。(日~土)\n" +
                "*/nagao date every remove [0~6]*: 毎週報告する曜日を削除します。(日~土)\n" +
                "*/nagao date every list*: 毎週報告する曜日の一覧を表示します\n"
              );
        }
        case "inverse":
          const dates = getDates();
          switch ((arg[2])? arg[2].toLowerCase() : "") {
            case "add":
              if (arg.length != 4) return result.setContent("*/nagao date inverse add [MM/dd]*: 日付を入力してください")
              if (dates.includes(arg[3])) return result.setContent("*/nagao date inverse add [MM/dd]*: 既に存在する日付です");
              dates.push(arg[3]);
              dates.sort();
              setDates(dates);
              return result.setContent("報告の有無を反転する日付に" + arg[3] + "を追加しました");
            case "remove":
              if (arg.length != 4) return result.setContent("*/nagao date inverse remove [MM/dd]*: 日付を入力してください")
              if (!dates.includes(arg[3])) return result.setContent("*/nagao date inverse remove [MM/dd]*: 存在しない日付です");
              dates.splice(dates.indexOf(arg[3]), 1);
              setDates(dates);
              return result.setContent("報告の有無を反転する日付から" + arg[3] + "を削除しました");
            case "list":
              var content = "*反転する日付一覧*\n";
              dates.forEach(date => { content += date + "\n" });
              return result.setContent(content);
            default:
              return result.setContent(
                "*/nagao date inverse add [MM/dd]*: 報告の有無を反転する日付を追加します\n" +
                "*/nagao date inverse remove [MM/dd]*: 報告の有無を反転する日付を削除します\n" +
                "*/nagao date inverse list*: 反転する日付の一覧を表示します\n"
              );
          }
        default:
          return result.setContent(
            "*/nagao date every*: 毎週報告する曜日を設定します\n" +
            "*/nagao date inverse*: 例外を定義します\n"
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
    if(postData.event.channel_type == "channel" && channel == getChannel()){
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
/*** doPost ***/

/*** Date ***/
const today = new Date();
const todayDisplay = Utilities.formatDate(today, "Asia/Tokyo", "MM/dd");
const todayIsDestoryDate = function(){
  return true;
}();
/*** Date ***/

/*** Post ***/
function postDate(){
  if(!todayIsDestoryDate) return;
  slackChatPostMessage(getChannel(), todayDisplay);
  deleteDestoryHistory();
}

function postDestroy(){
  if(!todayIsDestoryDate) return;
  const users = getUsers();
  Object.keys(users).forEach((id) => {
    slackChatPostMessage(id, "お前、破壊されたいのか？？？");
  });
}
/*** Post ***/

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

function setProgress(user, date, content){
  const line = getSheetLineOfDate(date);
  if(line == null) return null;
  const sheet = spreadSheet.getSheetByName(sheetName);
  const range = sheet.getRange("B" + parseInt(line, "10"));
  const value = range.getValue();
  if(editIfEmpty && value != null && value != "") return false;
  range.setValue(content);
  return true;
}

function getSheetLineOfDate(date){
  const sheet = spreadSheet.getSheets()[0];
  const allLine = sheet.getRange("A2:A").getValues();
  var i;
  for(i = 0; i < allLine.length; i++){
    if(allLine[i][0] == null || allLine[i][0] == "") {
      spreadSheet.getRange("A" + parseInt(i + 2, "10")).setValue(date);
      return i + 2;
    }
    if(date == Utilities.formatDate(allLine[i][0], "Asia/Tokyo", "MM/dd")){
      return i + 2;
    }
  }
  spreadSheet.insertRowAfter(i + 1);
  spreadSheet.getRange("A" + parseInt(i + 2, "10")).setValue(date);
  return i + 2;
}

function deleteDestoryHistory() {
  const channels = slackChannelsList(1000).channels;
  Object.keys(channels).forEach(channel => {
    if(!channel.is_im) return;
    const imHistory = slackChannelsHistory(channel.id, 1000);
    imHistory.messages.forEach(message => { if(!message.hidden) slackChatDelete(message.channel, message.ts) });
  });
}
