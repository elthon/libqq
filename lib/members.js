//提供用户相关的接口

var util = require("util");
var then = require("thenjs");
var _ = require("underscore");
var fs = require("fs");

function Members(account, httpclient) {
	this.account = account;
	this.httpclient = httpclient;
}

//获取用户的签名信息
Members.prototype.getBuddySign = function(uin, defer) {
	var self = this;
	var account = self.account;
	var httpclient = self.httpclient;

	var u = uin || account.uin;

	var url = util.format("http://s.web2.qq.com/api/get_single_long_nick2?tuin=%s&vfwebqq=%s&t=%s",
		u,
		account.session.vfwebqq,
		new Date().getTime());

	then(function(d) {
		httpclient.get(url, d);
	}).then(function(d, body) {

		if (body && body.retcode == 0) {
			var sign = body.result.lnick;

			var buddy = account.searchByUin(uin);
			if (buddy) {
				buddy.sign = sign;	//设定用户的签名信息
			}

			defer(null, {
				"uin": body.result.uin,
				"sign": body.result.lnick
			});

		} else {
			defer(body);
		}
	})
}

//获取我自己的详细信息
Members.prototype.fetchMyInfo = function(defer) {

	var self = this;
	var account = self.account;
	var httpclient = self.httpclient;

	var url = util.format("http://s.web2.qq.com/api/get_friend_info2?tuin=%s&verifysession=&code=&vfwebqq=%s&t=" + new Date().getTime(),
		account.uin,
		account.session.ptwebqq);

	then(function(d) {
		httpclient.get(url, d);
	}).then(function(d, body) {

		if (body && body.retcode == 0) {

			//将result数据复制到account对象的detail中
			account.detail = body.result;

			defer(null, body.result); //通知外部，可以直接用这个数据，也可能从account里面获取信息了。

		} else {
			defer(body);
		}
	})

}

/*
 * 获取指定用户的QQ号码
 * 从uin --> qq 的映射
 **/
Members.prototype.fetchBuddyQQAccount = function(uin, defer) {

	var url = util.format("http://s.web2.qq.com/api/get_friend_uin2?tuin=<%=uin%>&verifysession=&code=&vfwebqq=<%=vfwebqq%>&t=" + new Date().getTime(),
		uin,
		this.account.session.vfwebqq
	);

	then(function(d) {
		this.httpclient.get(url, d);
	}, this).then(function(d, body) {
		if (body && body.retcode == 0) {
			defer(null, body.result);
		} else {
			defer(body);
		}
	})
}

function assembleBuddiesInfo(result) {
	var buddies = {}; //初始化好友列表

	_.each(result.info, function(info) {
		var buddy = buddies[info.uin] = {}; //首先把基本信息复制到用户对象上

		_.extend(buddy, info);


		//找到用户的vip信息
		var vipinfo = _.find(result.vipinfo, function(vipinfo) {
			return vipinfo.u === info.uin;
		})
		if (vipinfo && vipinfo.u) {
			buddy.is_vip = vipinfo.is_vip;
			buddy.vip_level = vipinfo.vip_level;
		} else {
			//应该不会出现：设置默认值
			buddy.is_vip = 0;
			buddy.vip_level = 0;
		}

		//找到用户的分组信息
		var friend = _.find(result.friends, function(friend) {
			return friend.uin === info.uin;
		});
		if (friend && friend.uin) {
			buddy.categories = {
				"id": friend.categories,
				"name": "我的好友"
			};
			if (friend.categories != 0) {
				//更新分组名称
				var cat = _.find(result.categories, function(category) {
					return category.index === friend.categories;
				});
				buddy.categories.name = cat.name;
			}
		} else {
			//设置默认值
			buddy.categories = {
				"id": 0,
				"name": "我的好友"
			}
		}

		//找到用户的备注信息
		var markname = _.find(result.marknames, function(markname) {
			return markname.uin === info.uin;
		});
		if (markname && markname.uin) {
			buddy.markname = markname.markname;
		}

	});

	return buddies;
}

//获取我的用户列表信息
Members.prototype.fetchMyBuddiesInfo = function(defer) {

	var self = this;
	var account = self.account;
	var session = account.session;
	var httpclient = self.httpclient;

	var url = "http://s.web2.qq.com/api/get_user_friends2";

	var r = {};
	r.h = "hello";
	r.hash = P(account.uin, session.ptwebqq);
	r.vfwebqq = session.vfwebqq;

	then(function(d) {
		httpclient.postForm(url, {
			r: JSON.stringify(r)
		}, d);
	}).then(function(d, body) {
		//拿到原始的数据，转换为内部数据进行存储
		if (body && body.retcode == 0) {


			var buddies = assembleBuddiesInfo(body.result);
			account.buddies = buddies; //获取用户的好友列表信息


			defer(null, body.result);
		} else {
			defer(body);
		}
	})

}


var P = function(i, a) {
	var r = [];
	r[0] = i >> 24 & 255;
	r[1] = i >> 16 & 255;
	r[2] = i >> 8 & 255;
	r[3] = i & 255;
	for (var j = [], e = 0; e < a.length; ++e)
		j.push(a.charCodeAt(e));
	e = [];
	for (e.push(new b(0, j.length - 1)); e.length > 0;) {
		var c = e.pop();
		if (!(c.s >= c.e || c.s < 0 || c.e >= j.length))
			if (c.s + 1 == c.e) {
				if (j[c.s] > j[c.e]) {
					var l = j[c.s];
					j[c.s] = j[c.e];
					j[c.e] = l
				}
			} else {
				for (var l = c.s, J = c.e, f = j[c.s]; c.s < c.e;) {
					for (; c.s < c.e && j[c.e] >= f;)
						c.e--, r[0] = r[0] + 3 & 255;
					c.s < c.e && (j[c.s] = j[c.e], c.s++, r[1] = r[1] * 13 + 43 & 255);
					for (; c.s < c.e && j[c.s] <= f;)
						c.s++, r[2] = r[2] - 3 & 255;
					c.s < c.e && (j[c.e] = j[c.s], c.e--, r[3] = (r[0] ^ r[1] ^ r[2] ^ r[3] + 1) & 255)
				}
				j[c.s] = f;
				e.push(new b(l, c.s - 1));
				e.push(new b(c.s + 1, J))
			}
	}
	j = ["0", "1", "2", "3", "4",
		"5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"
	];
	e = "";
	for (c = 0; c < r.length; c++)
		e += j[r[c] >> 4 & 15], e += j[r[c] & 15];
	return e
};

var b = function(b, i) {
	this.s = b || 0;
	this.e = i || 0
}


exports.init = function(account, httpclient) {
	return new Members(account, httpclient);
}