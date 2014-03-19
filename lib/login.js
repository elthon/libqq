//login.js 负责qq登陆、注销相关的方法

var then = require("thenjs");
var util = require("util");

var _ = require("underscore");

var x = require("./comm");

function Login(account, httpclient) {
	this.account = account;
	this.httpclient = httpclient;
}

function ptui_checkVC(shouldVC, salt, time) {
	Login.needVerifyCode = +shouldVC ? true : false;
	Login.salt = salt;
}

//检验是否需要验证码登录
Login.prototype.checkVC = function(defer) {

	var checkCodeUrl = util.format("https://ssl.ptlogin2.qq.com/check?uin=%s&appid=1003903&js_ver=10048&js_type=0&r=%s", this.account.uin, Math.random());

	var options = {
		url: checkCodeUrl,
		headers: {
			"Referer": "https://ui.ptlogin2.qq.com/cgi-bin/login?daid=164&target=self&style=5&mibao_css=m_webqq&appid=1003903&enable_qlogin=0&no_verifyimg=1&s_url=http%3A%2F%2Fweb2.qq.com%2Floginproxy.html&f_url=loginerroralert&strong_login=1&login_state=10&t=20130903001"
		}
	}
	var httpclient = this.httpclient;

	then(function(d) {
		httpclient.get(options, d);
	}).then(function(d, value) {
		eval(value);

		defer(null, {
			"needVerify": Login.needVerifyCode,
			"salt": Login.salt
		})
	})
}

Login.prototype.fetchCaptcha = function(defer) {
	var imageUrl = "https://ssl.captcha.qq.com/getimage?aid=1003903&r=" + Math.random() + "&uin=" + this.account.uin;

	var options = {
		url: imageUrl,
		filePath: this.account.dataDir,
		fileName: "verifycode.jpeg"
	}

	this.httpclient.download(options, defer);
}

Login.prototype.logout = function() {
	var account = this.account;
	var httpclient = this.httpclient;
	
	then(function(defer) {
		var imageUrl = util.format("http://d.web2.qq.com/channel/logout2?ids=&clientid=%s&psessionid=%s&t=" + new Date().getTime(),
			account.clientid, account.session.psessionid);
		httpclient.get(imageUrl, defer);
	}).all(function(defer, error, value) {
		console.log("成功退出QQ");
	});
}

function encodePassword(account) {
	var M = account.password;
	var I = x.hexchar2bin(x.md5(M));
	var H = x.md5(I + x.uin2hex(account.uin));
	var G = x.md5(H + account.salt.toUpperCase());

	return G;
}

var config = {
	"appid": 1003903,
	"js_ver": 10048,
	"random": Math.random()
};

function ptuiCB(status, _unUse, checkSig, _unUse2, msg, nickName) {
	Login.status = +status;
	Login.checkSig = checkSig;
	Login.nickName = nickName;
}

//jump : 是否跳过验证码处理阶段
Login.prototype.login = function(defer2, jump) {
	var self = this;

	var account = self.account;
	var httpclient = self.httpclient;

	then(function(defer) {

		if (jump) {
			console.log("跳过");
			defer(null, "next");
		}

		var p = encodePassword(account)

		var loginUrl = "https://ssl.ptlogin2.qq.com/login?u=%s&p=%s&verifycode=%s&webqq_type=10&remember_uin=1&login2qq=1&aid=1003903&u1=http%3A%2F%2Fweb2.qq.com%2Floginproxy.html%3Flogin2qq%3D1%26webqq_type%3D10&h=1&ptredirect=0&ptlang=2052&daid=164&from_ui=1&pttype=1&dumy=&fp=loginerroralert&action=13-150-2576515&mibao_css=m_webqq&t=5&g=1&js_type=0&js_ver=%s";

		loginUrl = util.format(loginUrl, account.uin, p, account.salt, config.js_ver);

		var options = {
			url: loginUrl,
			headers: {
				"Referer": "https://ui.ptlogin2.qq.com/cgi-bin/login?daid=164&target=self&style=5&mibao_css=m_webqq&appid=1003903&enable_qlogin=0&no_verifyimg=1&s_url=http%3A%2F%2Fweb2.qq.com%2Floginproxy.html&f_url=loginerroralert&strong_login=1&login_state=10&t=20130903001"
			}
		}

		httpclient.get(options, defer);

	}).then(function(defer, body) {

		if (jump) {
			console.log("跳过");
			defer(null, "next");
		}

		eval(body);

		if (Login.status != 0) {
			defer(body);
		}

		var checkSig = Login.checkSig;

		var options = {
			url: checkSig
		}

		httpclient.get(options, defer);

	}).then(function(defer, body) {

		//第二次登录

		var loginUrl = "http://d.web2.qq.com/channel/login2";

		var r = {};
		r.status = "online";

		//断线处理
		if (account.session.ptwebqq) { //用户之前登录过了
			r.ptwebqq = account.session.ptwebqq || "";
		} else {
			r.ptwebqq = httpclient.getCookieValue(loginUrl, 'ptwebqq');
			account.session.ptwebqq = r.ptwebqq;
		}

		r.passwd_sig = "";
		r.clientid = account.clientid;
		r.psessionid = null;

		var options = {
			url: loginUrl,
			headers: {
				"Referer": "http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=3",
				"Origin": "http://d.web2.qq.com",
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36",
				"Accept-Language": "zh-CN,zh;q=0.8"
			},
			json: true
		};

		httpclient.postForm(options, {
			r: JSON.stringify(r),
			clientid: account.clientid,
			psessionid: "null"
		}, defer);

	}).then(function(defer, body) {

		if (body.retcode === 0) {

			//成功登录了系统

			_.extend(account.session, body.result); //将sessio等参数赋值

			//修改用户的状态值
			account.status = 1; //在线

			defer2(null, {
				response: body.result
			});

		} else {
			defer2(body);
		}
	}).fail(function(defer, error){
		console.log("发生错误信息....");
		defer2(error);	//收集错误
	}).all(function(defer, error){
		console.log("hahhah");
		defer2(error);
	});
}

exports.init = function(account, httpclient) {
	return new Login(account, httpclient);
}