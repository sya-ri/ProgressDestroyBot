/* プロジェクトプロパティ */
const properties = PropertiesService.getScriptProperties().getProperties();
const SlackApiToken = properties.SlackApiToken;
const ProgressReportSheet = properties.ProgressReportSheet;
/* プロジェクトプロパティ */

function runTest(){
    const channel = getChannel();
    let response;
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
    let count = 0;
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

function slackFetch(path, param) {
    if (param == null) param = {};
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
function saveOption(name, json) {
    PropertiesService.getScriptProperties().setProperty(name, JSON.stringify(json));
}

function getOption(name) {
    const rawJson = PropertiesService.getScriptProperties().getProperty(name);
    return (rawJson == null) ? {} : JSON.parse(rawJson);
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
    if (arg[0] === e.parameter["command"]) arg.shift();
    switch (arg[0].toLowerCase()) {
        case "channel":
            switch ((arg[1])? arg[1].toLowerCase() : "") {
                case "set":
                    var channel = e.parameter.channel_id;
                    setChannel(channel);
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
                    if (arg.length !== 4) return result.setContent("*/nagao user add [@User] [Name]*: ユーザーを追加します");
                    if (!(/<@.+|.+>/.test(arg[2]))) return result.setContent("ユーザーを指定してください");
                    var id = /<@([^|]+)|[^>]+>/.exec(arg[2])[1];
                    var name = arg[3];
                    addUser(id, name);
                    return result.setContent("<@" + id + "> を " + name + " として登録しました");
                case "remove":
                    if (arg.length !== 3) return result.setContent("*/nagao user remove [@User]*: ユーザーを削除します");
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
                    if (arg.length !== 3) return result.setContent("*/nagao time date [Hour]*: 時刻も入力してください")
                    var hour = Number(arg[2]);
                    if (isNaN(hour) || hour < 0 || 24 < hour) return result.setContent("*/nagao time date [Hour]*: 時刻が不正です")
                    ScriptApp.getProjectTriggers().forEach((trigger) => { if(trigger.getHandlerFunction() == "postDate") ScriptApp.deleteTrigger(trigger); });
                    ScriptApp.newTrigger("postDate").timeBased().atHour(hour).everyDays(1).create();
                    return result.setContent("日付送信の時刻を " + hour + "時に設定しました");
                case "destroy":
                    if (arg.length !== 3) return result.setContent("*/nagao time date [Hour]*: 時刻も入力してください")
                    var hour = Number(arg[2]);
                    if (isNaN(hour) || hour < 0 || 24 < hour) return result.setContent("*/nagao time destroy [Hour]*: 時刻が不正です")
                    ScriptApp.getProjectTriggers().forEach((trigger) => { if(trigger.getHandlerFunction() == "postDestroy") ScriptApp.deleteTrigger(trigger); });
                    ScriptApp.newTrigger("postDestroy").timeBased().atHour(hour).everyDays(1).create();
                    return result.setContent("進捗破壊の時刻を " + hour + "時に設定しました");
                default:
                    return result.setContent(
                        "*/nagao time date [Hour]*: 日付を送信する時刻を設定します\n" +
                        "*/nagao time destroy [Hour]*: 進捗破壊する時刻を設定します\n"
                    );
            }
        case "date":
            switch ((arg[1])? arg[1].toLowerCase() : "") {
                case "every":
                    const days = getDays();
                    switch ((arg[2])? arg[2].toLowerCase() : "") {
                        case "add":
                            if (arg.length !== 4) return result.setContent("*/nagao date every add [0~6]*: 曜日を入力してください")
                            var dayNumber = Number(arg[3]);
                            if (isNaN(dayNumber) || dayNumber < 0 || 6 < dayNumber) return result.setContent("*/nagao date every add [0~6]*: 曜日が不正です");
                            if (days.includes(dayNumber)) return result.setContent("*/nagao date every add [0~6]*: 既に存在する曜日です");
                            days.push(dayNumber);
                            days.sort();
                            setDays(days);
                            return result.setContent("毎週報告する曜日に" + dayList[dayNumber] + "曜日を追加しました");
                        case "remove":
                            if (arg.length !== 4) return result.setContent("*/nagao date every remove [0~6]*: 曜日を入力してください")
                            var dayNumber = Number(arg[3]);
                            if (isNaN(dayNumber) || dayNumber < 0 || 6 < dayNumber) return result.setContent("*/nagao date every remove [0~6]*: 曜日が不正です");
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
                            if (arg.length !== 4) return result.setContent("*/nagao date inverse add [MM/dd]*: 日付を入力してください")
                            if (dates.includes(arg[3])) return result.setContent("*/nagao date inverse add [MM/dd]*: 既に存在する日付です");
                            dates.push(arg[3]);
                            dates.sort();
                            setDates(dates);
                            return result.setContent("報告の有無を反転する日付に" + arg[3] + "を追加しました");
                        case "remove":
                            if (arg.length !== 4) return result.setContent("*/nagao date inverse remove [MM/dd]*: 日付を入力してください")
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
            return result.setContent(
                "*/nagao channel*: 進捗報告のチャンネルの設定をします\n" +
                "*/nagao user*: 進捗報告する人の設定をします\n" +
                "*/nagao time*: 定期メッセージに関する設定をします\n" +
                "*/nagao date*: 進捗報告日の設定をします\n"
            );
    }
}

function doPostEvent(e) {
    const postData = JSON.parse(e.postData.getDataAsString());
    if(postData.type === "url_verification") {
        return ContentService.createTextOutput(postData.challenge);
    } else if(postData.event.bot_profile == null){
        const channel = postData.event.channel;
        if(postData.event.channel_type === "channel" && channel === getChannel()){
            const subtype = postData.event.subtype;
            let user_id;
            let thread_ts;
            let content;
            if(subtype == null || subtype === "file_share"){ // 追加
                user_id = postData.event.user;
                thread_ts = postData.event.thread_ts;
                content = postData.event.text;
            } else if(subtype === "message_changed"){ // 変更
                user_id = postData.event.message.user;
                thread_ts = postData.event.message.thread_ts;
                if(thread_ts === postData.event.message.ts) return;
                content = postData.event.message.text;
            } else if(subtype === "message_deleted"){ // 削除
                user_id = postData.event.previous_message.user;
                thread_ts = postData.event.previous_message.thread_ts;
                content = "";
            } else {
                return;
            }
            editProgress(user_id, thread_ts, content);
        }
    } 
}
/*** doPost ***/

/*** Date ***/
const today = new Date();
const todayDisplay = Utilities.formatDate(today, "Asia/Tokyo", "MM/dd");
const todayIsDestroyDate = function(){
    const isTargetDay = today.getDay() in getDays();
    if(todayDisplay in getDates()) return !isTargetDay;
    return isTargetDay;
}();
/*** Date ***/

/*** Post ***/
function postDate(){
    if(!todayIsDestroyDate) return;
    slackChatPostMessage(getChannel(), todayDisplay);
    deleteDestroyHistory();
}

function postDestroy(){
    if(!todayIsDestroyDate) return;
    const users = getUsers();
    const row = getSheetRowOfDate(date);
    Object.keys(users).forEach((id) => {
        const column = getSheetColumnOfName(users[id]);
        const range = sheet.getRange(row, column);
        const value = range.getValue();
        if(value == null || value == "") slackChatPostMessage(id, "お前、破壊されたいのか？？？");
    });
}
/*** Post ***/

/*** Progress ***/
function editProgress(user_id, ts, content){
    const date = Utilities.formatDate(new Date(ts * 1000), "Asia/Tokyo", "MM/dd");
    const name = getUser(user_id);
    setProgress(name, date, content);
}

function setProgress(name, date, content){
    const row = getSheetRowOfDate(date);
    const column = getSheetColumnOfName(name);
    const range = sheet.getRange(row, column);
    range.setValue(content);
}
/*** Progress ***/

/*** SpreadSheet ***/
const sheet = SpreadsheetApp.openById(ProgressReportSheet).getSheets()[0];

function getSheetColumnOfName(name) {
    const columns = sheet.getRange("1:1").getValues();
    const columnsLength = columns[0].length;
    for(let i = 1; i < columnsLength; i++){
        if(columns[0][i] == null || columns[0][i] === "") {
            sheet.getRange(1, i + 2).setValue(name);
            return i + 2;
        }
        if(columns[0][i] === name){
            return i + 1;
        }
    }
    sheet.insertColumnAfter(columnsLength);
    sheet.getRange(1, columnsLength + 1).setValue(name);
    return columnsLength + 1;
}

function getSheetRowOfDate(date){
    const rows = sheet.getRange("A2:A").getValues();
    const rowsLength = rows.length;
    for(var i = 0; i < rowsLength; i++){
        if(rows[i][0] == null || rows[i][0] === "") {
            sheet.getRange(i + 2, 1).setValue(date);
            return i + 2;
        }
        if(date === Utilities.formatDate(rows[i][0], "Asia/Tokyo", "MM/dd")){
            return i + 2;
        }
    }
    sheet.insertRowAfter(rowsLength + 1);
    sheet.getRange(rowsLength + 2, 1).setValue(date);
    return rowsLength + 2;
}
/*** SpreadSheet ***/

function deleteDestroyHistory() {
    const channels = slackChannelsList(1000).channels;
    Object.keys(channels).forEach(channel => {
        if(!channel.is_im) return;
        const imHistory = slackChannelsHistory(channel.id, 1000);
        imHistory.messages.forEach(message => { if(!message.hidden) slackChatDelete(message.channel, message.ts) });
    });
}
