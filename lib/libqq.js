//QQClient： LibQQ的核心接口，所有的和QQ交互都通过QQClient进行。

var util = require("util");
var then = require("thenjs");
var _ = require("underscore");

var events = require("events"); //负责系统内部的事件，用户可以通过.on来监听系统内部消息

var Login = require("./login"); //登陆模块：负责用户的登陆、注销接口
var Session = require("./session"); //回话模块：负责消息的接受、发送接口
var Buddies = require("./members"); //用户模块：负责用户信息的读取
var Qun = require("./qun");


function QQClient(config) {

	events.EventEmitter.call(this);

	console.log("初始化QQClient");
	this.account = {
		"status": 1, //1:正常在线 , -1:未登录, -2:踢下线, -3:重试登录
		"uin": 1462731540,
		"password": "",
		"salt": "", //验证码
		"detail": { //通过fetchMyInfo得到的数据结构
			"face": 600,
			"birthday": {
				"month": 3,
				"year": 1979,
				"day": 7
			},
			"occupation": "",
			"phone": "",
			"allow": 1,
			"college": "",
			"uin": 1462731540,
			"constel": 2,
			"blood": 0,
			"homepage": "",
			"stat": 10,
			"vip_info": 0,
			"country": "中国",
			"city": "广州",
			"personal": "ok？",
			"nick": "mamd好的",
			"shengxiao": 8,
			"email": "",
			"client_type": 41,
			"province": "广东",
			"gender": "male",
			"mobile": ""
		},
		"idmap": {},
		"session": {}, //用户登录后获得的session
		"buddies": {
			12345678: {
				"nick": "andijo", //昵称
				"account": 31580436, //真实QQ
				"uin": 12345678, //临时QQ id
				"face": 12345 //未知？
			}
		}, //好友列表
		"strangers": {}, //陌生人列表
		"qun": {
			"gid": {
				"name": "",
				"members": {
					"123": {
						"name": "",
						"nick": ""
					}
				}
			}
		} //群列表



	}; //该QQClient维护的账号信息

	//读取外部的config信息，可能是外部持久化好的数据
	if (config && _.isObject(config)) {
		_.extend(this.account, config);
	}

	this.httpclient = require("./urllib"); //每个QQClient绑定同一个httpclient，这样能维护同一个cookie


	//内部功能模块列表，每个模块负责处理一类数据或提供一类功能
	this.sessionModule = Session.init(this.account, this.httpclient);
	this.loginModule = Login.init(this.account, this.httpclient);
	this.buddiesModule = Buddies.init(this.account, this.httpclient);
	this.qunModule = Qun.init(this.account, this.httpclient);
}

QQClient.super_ = events.EventEmitter;
QQClient.prototype = Object.create(events.EventEmitter.prototype, {
	constructor: {
		value: QQClient,
		enumerable: false
	}
});

QQClient.prototype.setUin = function(uin) {
	if (!_.isNumber(uin)) {
		throw new Error("请输入正确的QQ号码！");
	}
	this.account.uin = +uin;
}

QQClient.prototype.setPassword = function(password) {
	if (!password || password.length === 0) {
		throw new Error("请输入正确的用户密码！");
	}
	this.account.password = password;
}


QQClient.prototype.setVerifyCode = function(vc) {
	if (!vc || vc.length != 4) {
		throw new Error("请输入正确的验证码！");
	}
	this.account.salt = vc;
}

// 这里需要返回包装后的account，避免外部修改内部数据
QQClient.prototype.getAccount = function() {
	var account = {};
	return this.account;
}

QQClient.prototype.loginCheck = function(defer) {
	this.loginModule.checkVC(defer);
}

QQClient.prototype.fetchCaptchaImage = function(defer) {
	this.loginModule.fetchCaptcha(defer);
}

QQClient.prototype.login = function(defer) {
	this.loginModule.login(defer, false);
}

QQClient.prototype.logout = function() {
	//if (this.account.status === 1) {
	this.loginModule.logout();
	//}
}

///######## 群 #######
QQClient.prototype.fetchMyGroupList = function(fetch, defer) {
	var qunModule = this.qunModule;
	var libqq = this;

	if (fetch) {
		then(function(d) {
			qunModule.fetchGroupList(d);
		}).then(function(d, groupList) {

			if (groupList && _.isArray(groupList) && groupList.length > 0) {

				//并行获取所有的群信息
				then.each(groupList, function(d2, value) {

					libqq.fetchGroupInfo(value, d2);

				}).then(function(d2, groupInfos) {
					d(null, groupInfos);
				})
			}

		}).then(function(d, groupInfos) {
			defer(null, groupInfos);
		});
	} else {
		qunModule.fetchGroupList(defer);
	}
}

QQClient.prototype.fetchGroupInfo = function(gid, defer) {
	this.qunModule.fetchGroupInfo(gid, defer);
}

///###############  回话接口 ######
QQClient.prototype.sendMsg = function(msg, defer) {
	this.sessionModule.send(msg, defer);
}

QQClient.prototype.pollMsg = function() {

	//检查状态，不正确的状态直接抛出异常
	if (!this.sessionModule) {
		throw new Error("session对象未正常初始化");
	}

	if (!this.account || this.account.status === -1) {
		throw new Error("用户还未登录，请先完成登录！");
	}

	if (this.account.status === -2) {
		this.emit("kick", "用户被踢下线了。")
		return;
	}

	var self = this;
	var loginModule = self.loginModule;
	var sessionModule = self.sessionModule;
	var account = self.account;

	then(function(defer) {
		sessionModule.poll(defer);
	}).then(_.bind(function(defer, msg) {
		if (msg.type !== "next_poll") { //这个是libqq内部的消息，外部不需要知道
			self.emit(msg.type, msg);
		}
		self.pollMsg(); //继续调用
	}, this), function(defer, error) {

		console.log(error, error.stack);
		self.pollMsg();
		//重新了网络错误？ webqq的处理是：
		//重试5次poll请求后，连续请求http://d.web2.qq.com/channel/login2，这个不需要验证码处理了
		//这里直接重试login2
		//设置用户状态为重试登录状态
		// account.status = -3;
		// console.log("Polling遇到错误了，开始重新尝试登录。");

		// var runing = function() {
		// 	then(function(d) {
		// 		loginModule.login(d, true);
		// 	}).then(function(d, body) { //成功登录了。
		// 		console.log("重试登录成功了。");
		// 		//重新开始poll
		// 		self.pollMsg();
		// 	}, function(d, error) {
		// 		console.log("重试登录还是出现错误：", error);
		// 		runing(); //失败就持续的登录
		// 	})
		// }

		// runing(); //开始不断重试。

	});
}


//##############  用户相关的接口  ####################
QQClient.prototype.fetchMyInfo = function(defer) {
	this.buddiesModule.fetchMyInfo(defer);
}

QQClient.prototype.fetchMyBuddies = function(defer) {
	this.buddiesModule.fetchMyBuddiesInfo(defer);
}

function checkStatus(account) {
	if (account && account.status === 1) {
		return;
	}
	throw new Error("你还不能调用该接口，请先登录系统！");
}

//############### 工具类接口 ########################

//有些情况下，可能用户不需要下载图片
QQClient.prototype.getFaceUrl = function(uin) {

	var account = this.account;

	checkStatus(account);

	var faceUrl = util.format("http://face7.web.qq.com/cgi/svr/face/getface?cache=1&type=11&fid=0&uin=%s&vfwebqq=%s&t=%s", uin, account.session.vfwebqq, new Date().getTime());
	return faceUrl;
}

QQClient.prototype.downloadImage = function(msg) {
	_.each(msg.pics, function(pic) {
		this.sessionModule.downloadImage(pic);
	})
}

QQClient.prototype.downloadGroupImage = function(msg) {
	_.each(msg.pics, function(pic) {
		this.sessionModule.downloadGroupImage(pic, msg.from.uin,  msg.group_code);	//发送者的临时id， 群临时id
	})
}

QQClient.prototype.saveCookies = function(callback) {
	this.httpclient.jar.getCookies("http://qq.com", callback);
}

//下载用户头像
QQClient.prototype.downloadFace = function(uin, defer) {
	var account = this.account;

	checkStatus(account);

	//设置用户头像地址
	var faceUrl = this.getFaceUrl(uin);
	//下载用户头像
	var options = {
		url: faceUrl,
		filePath: 'data/face',
		fileName: uin + '.jpeg'
	}
	console.log("下载头像：", options);
	this.httpclient.download(options, defer);
}


//module.exports = new QQClient();
module.exports.QQClient = QQClient;