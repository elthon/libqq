var util = require("util");
var then = require("thenjs");
var _ = require("underscore");
var fs = require("fs");

var Constants = require("./constants");

function Qun(account, httpclient) {
	this.account = account;
	this.httpclient = httpclient;
}

var headers = {
	"Origin": "http://s.web2.qq.com",
	"Referer": "http://s.web2.qq.com/proxy.html?v=20110412001&callback=1&id=1"
};

Qun.prototype.searchQun = function(defer, gnumber, code, page, pageNumber) {
	var account = this.account;
	var httpclient = this.httpclient;

	if(!code){
		code = "";
	}
	if(!page){
		page = 1;
	}
	if(!pageNumber){
		pageNumber = 10;
	}

	var options = {
		url: util.format(Constants.SEARCH_GROUP, page, pageNumber, gnumber, code, account.session.vfwebqq, new Date().getTime()),
		headers: _.extend(headers, {
			"Referer": "http://cgi.web2.qq.com/proxy.html?v=20110412001&callback=1&id=1"
		})
	};

	then(function(d) {

		httpclient.get(options,  d);

	}).then(function(d, body) {
		if (body && body.retcode === 0) {
			defer(null, body);
		} else if (body && body.retcode === 100110) {
			defer(null, {
				shouldInputVerify: true;
				retcode: 100110,
				msg: ""
			})
		} else {
			defer({
				status:"搜索群出现错误。"
			})
		}
	});

}

//获取我的群列表
Qun.prototype.fetchGroupList = function(defer) {
	var account = this.account;
	var httpclient = this.httpclient;

	var options = {
		url: Constants.GET_GROUP_NAME_LIST_MASK,
		headers: headers
	};

	var r = {
		"vfwebqq": account.session.vfwebqq
	}

	then(function(d) {

		httpclient.postForm(options, {
			r: JSON.stringify(r)
		}, d);

	}).then(function(d, body) {
		if (body && body.retcode === 0) {
			var gnamelist = body.result.gnamelist;
			var gmasklist = body.result.gmasklist;
			var gmarklist = body.result.gmarklist;

			//群基本信息
			var qun = {};

			if (gnamelist) {
				_.each(gnamelist, function(q) {
					qun[q.gid] = q;
				});

				//群备注信息
				account.qun = qun;
			} else {
				account.qun = {};
			}

			defer(null, gnamelist); //群列表信息
		} else {
			defer(body);
		}
	})
}

Qun.prototype.fetchGroupInfo = function(group, defer) {
	var account = this.account;
	var httpclient = this.httpclient;

	var get_group_info_ext = util.format(Constants.GET_GROUP_INFO_EXT, group.code, account.session.vfwebqq, new Date().getTime());

	var options = {
		url: get_group_info_ext,
		headers: headers
	}

	then(function(d) {
		httpclient.get(options, d);
	}).then(function(d, body) {
		if (body && body.retcode === 0) {
			var cards = body.result.cards; //群名片信息
			var ginfo = body.result.ginfo;
			var minfo = body.result.minfo; //基本信息
			var vipinfo = body.result.vipinfo; //等级信息

			//根据其他信息更新minfo中的用户信息，比如等级、客户端、卡

			var members = {};

			_.each(minfo, function(m) {
				members[m.uin] = m;
			});

			if (cards && cards.length > 0) {
				_.each(cards, function(card) {
					members[card.muin].markname = card.card; //群名片名称
				});
			}

			if (cards && cards.length > 0) {
				_.each(cards, function(card) {
					members[card.muin].markname = card.card; //群名片名称
				});
			}

			if (vipinfo && vipinfo.length > 0) {
				_.each(vipinfo, function(vip) {
					members[vip.u].is_vip = vip.is_vip;
					members[vip.u].vip_level = vip.vip_level;
				});
			}

			//群基本信息
			if (minfo && minfo.length > 0) {
				account.qun[group.gid].members = members;
			}

			defer(null, members);
		} else {
			defer(body);
		}
	})
}

exports.init = function(account, httpclient) {
	return new Qun(account, httpclient);
}