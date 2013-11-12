var _ = require("underscore");

var fs = require("fs");

var qs = require("qs");

function HttpClient(config) {

	//维护每个client的全局cookie对象，只要是同一个httpclient，则该jar是唯一的。

	this.req = require("request").defaults(this.config);

	this.jar = this.req.jar();

	this.config = _.extend({}, {
		encoding: "utf-8",
		headers: {
			"Connection": "keep-alive",
			"Accept": "*/*",
			"Accept-Encoding": "gzip,deflate,sdch",
			"Accept-Language": "zh-CN,zh;q=0.8",
			"Origin": "http://s.web2.qq.com",
			"Referer": "http://s.web2.qq.com/proxy.html?v=20110412001&callback=1&id=1",
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.66 Safari/537.36"
		},
		json: true
	}, config);

	if (config && config.useCookie) {
		_.extend(this.config, {
			jar: this.jar
		});
	}

}

function saveFile(body) {
	try {
		var t = JSON.stringify(body);
		fs.appendFile('data/message.json', t + "\r\n", function(err) {
			if (err)
				console.log("保存message.json出错。", err);
		});
	} catch (e) {
		fs.appendFile('data/message.json', body + "\r\n", function(err) {
			if (err)
				console.log("保存message.json出错。", err);
		});
	}
}

HttpClient.prototype.get = function(options, defer) {
	var opts = parseOptions(options, this.config);

	this.req.get(opts, function(error, res, body) {
		if (error) {
			console.log("错误发生了。", error);
			defer("error");
		} else {
			saveFile(body);
			defer(null, body);
		}
	});
}



HttpClient.prototype.post = function(options, defer) {
	var opts = parseOptions(options, this.config);

	this.req.post(opts, function(error, res, body) {

		saveFile(body);

		if (error) {
			defer(error);
		} else {
			defer(null, body);
		}
	});
}

HttpClient.prototype.postForm = function(options, form, defer) {

	var length = qs.stringify(form).toString('utf8').length;

	var opts = parseOptions(options, this.config, length);

	try {
		this.req.post(opts, function(error, res, body) {

			saveFile(body);

			if (error) {
				defer(error);
			} else {
				defer(null, body);
			}
		}).form(form);
	} catch (e) {
		defer("请求失败。");
	}
}

HttpClient.prototype.getCookieValue = function(url, key) {

	var cookie = {};
	this.jar.getCookies(url, function(error, cookies) {
		cookie = _.find(cookies, function(cookie) {
			return cookie.key === 'ptwebqq';
		});
	})
	return cookie.value;
}

HttpClient.prototype.download = function(options, defer) {
	var opts = parseOptions(options, this.config);

	var uuid = require('node-uuid');
	var fs = require("fs");

	//没有传入保存文件路径，那么需要给他默认生成一个文件名，保存在当前目录下。
	opts.filePath = opts.filePath || "";
	opts.fileName = opts.fileName || uuid.v1();
	opts.encoding = null;

	var file = opts.filePath.length > 0 ? (opts.filePath + "/" + opts.fileName) :
		opts.fileName;

	var fwriteStream = fs.createWriteStream(file);
	fwriteStream.on('close', function() {
		defer(null, {
			file: file,
			fileName: opts.fileName,
			filePath: opts.filePath
		});
	});

	this.req(opts).pipe(fwriteStream);
}


function parseOptions(options, config, length) {
	var opts = {};

	if (_.isObject(options)) { //传入的是一个对象
		opts = _.defaults(opts, config, options);
	} else {
		opts = _.defaults(opts, config, {
			url: options
		});
	}

	try {
		var hostname = require("url").parse(opts.url).hostname;

		opts.headers = {};

		_.defaults(opts.headers, config.headers, options.headers, {
			"Host": hostname
		});

		if (length && length > 0) {
			_.defaults(opts.headers, config.headers, options.headers, {
				"Content-Length": length
			});
		}
	} catch (e) {

	}

	return opts;
}

module.exports = new HttpClient({
	useCookie: true
});