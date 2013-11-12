var util = require("util");
var then = require("thenjs");
var _ = require("underscore");
var fs = require("fs");

var Constants = require("./constants");

var Qun = require("./qun");
var Members = require("./members");


var headers = {
	"Origin": "http://d.web2.qq.com",
	"Referer": "http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=3"
};

function Session(account, httpclient) {
	this.account = account;
	this.httpclient = httpclient;

	this.qunService = Qun.init(this.account, this.httpclient); //群服务
	this.membersService = Members.init(this.account, this.httpclient);
}

Session.prototype.send = function(msg, defer) {
	var httpclient = this.httpclient;
	var account = this.account;

	//处理msg.text输入
	var text = msg.text.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");

	var url = Constants.SEND_BUDDY_MSG;

	var type = msg.type || "message"; //普通消息

	if (type === 'groupmessage') {
		url = Constants.SEND_QUN_MSG;
	} else if (type === 'sessmessage') {
		url = Constants.SEND_SESS_MSG;
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
	}, this, true).then(function(d, body) {
		if (body && body.retcode === 0) {
			defer(null, body);
		} else {
			defer(body);
		}
	});

}


Session.prototype.poll = function(defer) {

	var httpclient = this.httpclient;
	var account = this.account;
	var qunService = this.qunService;
	var membersService = this.membersService;
	var self = this;


	var r = {};

	r.clientid = account.clientid;
	r.psessionid = account.session.psessionid;
	r.key = 0;
	r.ids = [];

	var options = {
		url: Constants.MESSAGE_POLL,
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
						processBuddyMsg(pollData, account, membersService, defer);
					} else if (pollType === "group_message") {
						// 群消息
						processGroupMsg(pollData, account, qunService, membersService, defer);
					} else if (pollType === "group_web_message") {
						//群公告信息（比如共享了某个文件等）
						processGroupWebMsg(pollData, account, qunService, defer);
					} else if (pollType === "discu_message") {
						// 讨论组消息
						//notifyEvents.add(processDiscuzMsg(pollData));
					} else if (pollType === "sess_message") {
						// 临时会话消息
						//notifyEvents.add(processSessionMsg(pollData));
						processSessMsg(pollData, account, membersService, defer);
					} else if (pollType === "shake_message") {
						// 窗口震动
						var fromUin = pollData["from_uin"];
					} else if (pollType === "kick_message") {


						// 被踢下线

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
			account.session.ptwebqq = body.p;
			defer(null, defaultMsg);
		} else if (retcode == 121 || retcode == 120 || retcode == 100) { // 121,120 : ReLinkFailure              100 : NotReLogin
			// 服务器需求重新认证
			// {"retcode":121,"t":"0"}

		} else {

		}
		defer(null, defaultMsg);
	}).fail(function(d, error) {

		//网络异常
		defer(error); //触发错误信息
	});
}

function searchByUin(account, uin, gid) {
	if (uin == account.uin) {
		return account.detail; //就是自己，返回详情信息
	}

	var buddy = account.buddies[uin];
	if (buddy) {
		return buddy;
	} else {
		if (gid && account.qun[gid]) { //指定了群号？
			return account.qun[gid].members[uin];
		} else {
			//在全部群用户中查找
			var qunList = _.keys(account.qun);
			var member = _.find(qunList, function(qid) {
				var qun = account.qun[qid];

				var qunMembers = _.keys(qun.members);
				var member = _.find(qunMembers, function(mid) {
					return mid == uin;
				});

				if (member) {
					return true;
				} else {
					return false;
				}
			})
			return member;
		}
	}
	return null;
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


// {
// 	"retcode": 0,
// 	"result": [{
// 		"poll_type": "group_message",
// 		"value": {
// 			"msg_id": 26040,
// 			"from_uin": 1761411844,
// 			"to_uin": 2518376252,
// 			"msg_id2": 282289,
// 			"msg_type": 43,
// 			"reply_ip": 176886375,
// 			"group_code": 4266080954,
// 			"send_uin": 2129743578,
// 			"seq": 658,
// 			"time": 1383282568,
// 			"info_seq": 151633435,
// 			"content": [
// 				["font", {
// 					"size": 9,
// 					"color": "000000",
// 					"style": [0, 0, 0],
// 					"name": "Helvetica"
// 				}], "insert  "
// 			]
// 		}
// 	}]
// }

/**
群聊天消息
**/
function processGroupMsg(pollData, account, qunService, membersService, defer) {

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
	msg.from = searchByUin(account, pollData.send_uin, fromUin); //这里需要一次转换
	//接受者，这里就是自己的QQ号码了。
	msg.to = account.uin; //直接就是qq号码

	msg.from_uin = pollData.from_uin; //群的临时号码？
	msg.group_code = pollData.group_code; //这个请求数据时有用，展示没用。
	msg.group_id = pollData.info_seq; //真实群号

	//uin -> qq map
	var send_uin = pollData.send_uin;
	if (!account.idmap[send_uin]) { //没有用户的QQ号码
		then(function(d) {
			membersService.fetchBuddyQQAccount(send_uin, d)
		}).then(function(d, qq) {
			//获取到了QQ号码。

		})
	}


	//来自群里面陌生人的消息
	if (!msg.from) {
		//加入到群里面去
		account.qun[fromUin].members[pollData.send_uin] = {
			uin: pollData.send_uin
		}

		//更新一次群信息
		then(function(d) {
			qunService.fetchGroupInfo(account.qun[fromUin], d);
		}).then(function(d) {
			msg.from = account.qun[fromUin].members[pollData.send_uin];
			defer(null, msg);
		})

	} else {
		defer(null, msg);
	}
}

/**
该消息不是聊天信息，是针对群的通知信息，比如共享文件等
**/
function processGroupWebMsg(pollData, account, qunService, defer) {

	var fromUin = pollData["from_uin"]; //来自群临时号码

	var sender = pollData["send_uin"]; //发送者的id

	var msg = {};
	msg.type = "groupwebmessage";
	msg.time = new Date(pollData["time"] * 1000);
	msg.msg_type = pollData.msg_type;
	msg.id = pollData.msg_id;
	msg.id2 = pollData.msg_id2;
	msg.xml = pollData["xml"];

	//群内发送消息的人临时号码（可能不是我的好友啊）
	msg.from = searchByUin(account, sender, fromUin); //这里需要一次转换
	//接受者，这里就是自己的QQ号码了。
	msg.to = account.uin; //直接就是qq号码

	msg.from_uin = pollData.from_uin; //群的临时号码？
	msg.group_code = pollData.group_code; //这个请求数据时有用，展示没用。

	//来自群里面陌生人的消息
	if (!msg.from) {
		//加入到群里面去
		account.qun[fromUin].members[sender] = {
			uin: pollData.send_uin
		}

		//更新一次群信息
		then(function(d) {
			qunService.fetchGroupInfo(account.qun[fromUin], d);
		}).then(function(d) {
			msg.from = account.qun[fromUin].members[sender];
			defer(null, msg);
		})

	} else {
		defer(null, msg);
	}
}


Session.prototype.downloadImage = function(file_path) {
	var httpclient = this.httpclient;
	var account = this.account;

	var stream = fs.createWriteStream('data' + file_path);
	stream.on('close', function() {

	});
	httpclient.get("http://d.web2.qq.com/channel/get_offpic2?file_path=" + encodeURIComponent(file_path) + "&f_uin=" + account.uin + "&clientid=" + account.clientid + "&psessionid=" + account.session.psessionid).pipe(stream);
}

Session.prototype.downloadGroupImage = function(file, uin, gid) {
	var httpclient = this.httpclient;
	var account = this.account;

	var host = file.server.split(":")[0];
	var port = file.server.split(":")[1];

	var stream = fs.createWriteStream('data/' + file.name);
	stream.on('close', function() {
		console.log("成功下载图片", file);
	});

	var image = "http://web.qq.com/cgi-bin/get_group_pic?gid=" + gid + "&uin=" + uin + "&rip=" + host + "&rport=" + port + "&fid=" + file.file_id + "&pic=" + file.name + "&vfwebqq=" + account.session.vfwebqq + "&t=" + Math.round(new Date().getTime() / 1000);
	httpclient.pipe({
		url: image
	}, stream);
}


// {
// 	"retcode": 0,
// 	"result": [{
// 		"poll_type": "sess_message",
// 		"value": {
// 			"msg_id": 32020,
// 			"from_uin": 243335395,
// 			"to_uin": 2518376252,
// 			"msg_id2": 797521,
// 			"msg_type": 140,
// 			"reply_ip": 180061923,
// 			"time": 1383282701,
// 			"id": 1761411844,
// 			"ruin": 494478704,
// 			"service_type": 0,
// 			"flags": {
// 				"text": 1,
// 				"pic": 1,
// 				"file": 1,
// 				"audio": 1,
// 				"video": 1
// 			},
// 			"content": [
// 				["font", {
// 					"size": 11,
// 					"color": "000000",
// 					"style": [0, 0, 0],
// 					"name": "微软雅黑"
// 				}], "凤飞飞撒发是 "
// 			]
// 		}
// 	}]
// }
//群友的临时消息

function processSessMsg(pollData, account, membersService, defer) {

	var fromUin = pollData["from_uin"];


	var gid = pollData["id"]; //群id号

	var msg = {};
	msg.type = "sessmessage";
	msg.time = new Date(pollData["time"] * 1000);
	msg.id = pollData.msg_id;
	msg.id2 = pollData.msg_id2;
	msg.style = formatStyle(pollData.content);
	msg.text = formatContent(pollData.content, msg);;
	msg.from = searchByUin(account, fromUin, gid); //这里需要一次转换
	msg.to = account.uin; //直接就是qq号码

	//uin -> qq map
	var send_uin = fromUin;
	if (!account.idmap[send_uin]) { //没有用户的QQ号码
		then(function(d) {
			membersService.fetchBuddyQQAccount(send_uin, d)
		}).then(function(d, qq) {
			//获取到了QQ号码。

		})
	}

	//可能是陌生人的消息
	if (!msg.from) {
		//加入到群里面去
		account.qun[gid].members[fromUin] = {
			uin: fromUin
		}

		//更新一次群信息
		then(function(d) {
			qunService.fetchGroupInfo(account.qun[gid], d);
		}).then(function(d) {
			msg.from = account.qun[gid].members[fromUin];
			defer(null, msg);
		})

	} else {
		defer(null, msg);
	}

}

function processBuddyMsg(pollData, account, membersService, defer) {

	var fromUin = pollData["from_uin"];

	var msg = {};
	msg.type = "message";
	msg.time = new Date(pollData["time"] * 1000);
	msg.id = pollData.msg_id;
	msg.id2 = pollData.msg_id2;
	msg.style = formatStyle(pollData.content);
	msg.text = formatContent(pollData.content, msg);;
	msg.from = searchByUin(account, fromUin); //这里需要一次转换
	msg.to = account.uin; //直接就是qq号码

	//uin -> qq map
	var send_uin = fromUin;
	if (!account.idmap[send_uin]) { //没有用户的QQ号码
		then(function(d) {
			membersService.fetchBuddyQQAccount(send_uin, d)
		}).then(function(d, qq) {
			//获取到了QQ号码。

		})
	}

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