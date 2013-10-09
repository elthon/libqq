var util = require("util");
var then = require("thenjs");
var _ = require("underscore");
var fs = require("fs");


var headers = {
	"Origin": "http://d.web2.qq.com",
	"Referer": "http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=3"
};

function Session(account, httpclient) {
	this.account = account;
	this.httpclient = httpclient;
}

Session.prototype.send = function(msg, defer) {
	var httpclient = this.httpclient;
	var account = this.account;

	//处理msg.text输入
	var text = msg.text.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");

	var url = 'http://d.web2.qq.com/channel/send_buddy_msg2';

	var type = msg.type || "message"; //普通消息

	if (type === 'groupmessage') {
		url = 'http://d.web2.qq.com/channel/send_qun_msg2';
	}

	var r = {};
	if (type === 'groupmessage') {
		r.group_uin = msg.to_uin;
	} else {
		r.to = msg.to_uin;
	}
	if (type === 'message') {
		r.face = 519;
	}
	r.content = "[\"" + text + "\",[\"font\",{\"name\":\"宋体\",\"size\":\"10\",\"style\":[0,0,0],\"color\":\"000000\"}]]";
	r.msg_id = msg.id;
	r.clientid = account.clientid;
	r.psessionid = account.session.psessionid;

	var options = {
		url: url,
		headers: headers,
		json: true
	};

	then(function(d) {
		httpclient.postForm(options, {
			r: JSON.stringify(r),
			"clientid": r.clientid,
			"psessionid": r.psessionid
		}, d);
	}).then(function(d, body) {
		defer(null, body);
	});
}


Session.prototype.poll = function(defer) {

	var httpclient = this.httpclient;
	var account = this.account;


	var r = {};

	r.clientid = account.clientid;
	r.psessionid = account.session.psessionid;
	r.key = 0;
	r.ids = [];

	var options = {
		url: 'http://d.web2.qq.com/channel/poll2',
		headers: {
			"Origin": "http://d.web2.qq.com",
			"Referer": "http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=3"
		},
		json: true
	};

	then(function(d) {
		httpclient.postForm(options, {
			r: JSON.stringify(r),
			"clientid": r.clientid,
			"psessionid": r.psessionid
		}, d);
	}).then(function(d, body) {
		//解析不同的message
		var msg = {};
		var retcode = body.retcode;
		var results = body.result;

		var defaultMsg = {
			"type": "next_poll"
		};

		if (retcode == 0) {
			//有可能为  {"retcode":0,"result":"ok"}
			if (results && _.isArray(results)) {
				// 消息下载来的列表中是倒过来的，那我直接倒过来取，编位回来
				for (var i = results.length - 1; i >= 0; i--) {
					var poll = results[i];
					var pollType = poll["poll_type"];
					var pollData = poll["value"];

					if (pollType === "input_notify") {
						var fromUin = pollData["from_uin"];

						//获取用户信息
						var buddy = null;
						defer(null, {
							"type": "input_notify",
							"buddy": buddy
						})

					} else if (pollType === "message") {
						// 好友消息
						//notifyEvents.add(processBuddyMsg(pollData));
						processBuddyMsg(pollData, account, defer);
					} else if (pollType === "group_message") {
						// 群消息
						//notifyEvents.add(processGroupMsg(pollData));
						processGroupMsg(pollData, account, defer);
					} else if (pollType === "discu_message") {
						// 讨论组消息
						//notifyEvents.add(processDiscuzMsg(pollData));
					} else if (pollType === "sess_message") {
						// 临时会话消息
						//notifyEvents.add(processSessionMsg(pollData));
					} else if (pollType === "shake_message") {
						// 窗口震动
						var fromUin = pollData["from_uin"];
						// QQUser user = getContext().getStore().getBuddyByUin(
						// 	fromUin);
						// notifyEvents.add(new QQNotifyEvent(
						// 	QQNotifyEvent.Type.SHAKE_WINDOW, user));
					} else if (pollType === "kick_message") {


						// 被踢下线
						// getContext().getAccount().setStatus(QQStatus.OFFLINE);
						// getContext().getSession().setState(
						// 	QQSession.State.KICKED);
						// notifyEvents.add(new QQNotifyEvent(
						// 	QQNotifyEvent.Type.KICK_OFFLINE, pollData
						// 	.getString("reason")));

						//更新用户状态
						account.status = -2; //下线状态
						defer(null, defaultMsg);

					} else if (pollType === "buddies_status_change") {
						//notifyEvents.add(processBuddyStatusChange(pollData));
					} else {
						// TODO ...
						console.warn("unknown pollType: " + pollType);
					}
				}
			}
			// end recode == 0
		} else if (retcode == 102) {
			// 接连正常，没有消息到达 {"retcode":102,"errmsg":""}
			// 继续进行下一个消息请求
			defer(null, defaultMsg);

		} else if (retcode == 110 || retcode == 109) { // 客户端主动退出
			// getContext().getSession().setState(QQSession.State.OFFLINE);
		} else if (retcode == 116) {
			// 需要更新Ptwebqq值，暂时不知道干嘛用的
			// {"retcode":116,"p":"2c0d8375e6c09f2af3ce60c6e081bdf4db271a14d0d85060"}
			// if (a.retcode === 116) alloy.portal.setPtwebqq(a.p)
			account.session.ptwebqq = body.p;
			defer(null, defaultMsg);
		} else if (retcode == 121 || retcode == 120 || retcode == 100) { // 121,120 : ReLinkFailure              100 : NotReLogin
			// 服务器需求重新认证
			// {"retcode":121,"t":"0"}

		} else {

		}
		defer(null, defaultMsg);
	}).fail(function(d, error) {
		defer(error); //触发错误信息
	});
}

//好友消息

function formatStyle(content) {

	var style = _.first(content);

	var css = {};
	var base = style[0];
	var value = style[1];

	_.each(_.keys(value), function(key) {
		var kv = value[key];
		if (_.isArray(kv)) {} else {
			if (key === 'color') {
				kv = "#" + kv;
			}
			if (key === 'size') {
				kv = kv + "pt";
			}
			css[base + '-' + key] = kv;
		}
	});

	return css;
}

function formatContent(content, msg) {
	var conList = _.last(content, content.length - 1);

	var text = "";

	var imageList = [];

	if (_.isArray(conList)) {
		_.each(conList, function(c) {
			if (_.isArray(c)) { //可能是图片或者表情
				var type = c[0];
				if (type === 'face') {
					//表情
					text += "<img src='http://0.web.qstatic.com/webqqpic/style/face/" + (c[1] - 57) + ".gif'/>";
				} else {
					imageList.push(c[1]);
					text += "<img src='data/loading.gif'/>"; //统一先用loading.gif
				}
			} else {
				text += c;
			}
		});
	} else {
		text = conList;
	}

	msg.pics = imageList;

	return text;
}

function processGroupMsg(pollData, account, defer) {

	var fromUin = pollData["from_uin"]; //来自群临时号码

	var msg = {};
	msg.type = "groupmessage";
	msg.time = new Date(pollData["time"] * 1000);
	msg.msg_type = pollData.msg_type;
	msg.id = pollData.msg_id;
	msg.id2 = pollData.msg_id2;
	msg.style = formatStyle(pollData.content);
	msg.text = formatContent(pollData.content, msg);;

	//群内发送消息的人临时号码（可能不是我的好友啊）
	msg.from = account.searchByUin(pollData.send_uin, fromUin); //这里需要一次转换
	//接受者，这里就是自己的QQ号码了。
	msg.to = account.uin; //直接就是qq号码

	msg.from_uin = pollData.from_uin; //群的临时号码？
	msg.group_code = pollData.group_code; //这个请求数据时有用，展示没用。
	msg.group_id = pollData.info_seq; //真实群号

	//可能是陌生人的消息
	if (!msg.from) {
		if (!account.strangers[fromUin]) { //陌生人列表也没有，直接新建一个
			account.strangers[fromUin] = {
				"uin": fromUin
			};
		}
		msg.from = account.strangers[fromUin];
	}

	defer(null, msg);

}


function processBuddyMsg(pollData, account, defer) {

	var fromUin = pollData["from_uin"];

	var msg = {};
	msg.type = "message";
	msg.time = new Date(pollData["time"] * 1000);
	msg.id = pollData.msg_id;
	msg.id2 = pollData.msg_id2;
	msg.style = formatStyle(pollData.content);
	msg.text = formatContent(pollData.content, msg);;
	msg.from = account.searchByUin(fromUin); //这里需要一次转换
	msg.to = account.uin; //直接就是qq号码

	//可能是陌生人的消息
	if (!msg.from) {
		if (!account.strangers[fromUin]) { //陌生人列表也没有，直接新建一个
			account.strangers[fromUin] = {
				"uin": fromUin
			};
		}
		msg.from = account.strangers[fromUin];
	}

	defer(null, msg);

}

exports.init = function(account, httpclient) {
	return new Session(account, httpclient);
}