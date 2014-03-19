var _ = require("underscore");

var fs = require("fs");

var qs = require("qs");

var zlib = require("zlib");

var util = require('util');

function HttpClient(config) {

	//维护每个client的全局cookie对象，只要是同一个httpclient，则该jar是唯一的。

	this.req = require("request").defaults(this.config);

	this.jar = this.req.jar();

	this.config = _.extend({}, {
		encoding: "utf-8",
		headers: {
			"Connection": "keep-alive",
			"Accept": "*/*",
			"Accept-Encoding": "identity",
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

HttpClient.prototype.get = function(options, defer) {
	var opts = parseOptions(options, this.config);
	var self = this;

	self.req.get(opts, function(err, res, body) {
		if (err) {
			defer(err);
		} else {
			console.log(opts.url, " ===> " , util.inspect(body, false, 10));
			defer(null, body);
		}
	});
}


HttpClient.prototype.pipe = function(options, stream) {
	var opts = parseOptions(options, this.config);
	this.req.get(opts).pipe(stream);
}

HttpClient.prototype.post = function(options, defer) {
	var opts = parseOptions(options, this.config);
	var self = this;

	self.req.post(opts, function(err, res, body) {
		if (err) {
			defer(err);
		} else {
			console.log(opts.url, " ===> " , util.inspect(body, false, 10));
			defer(null, body);
		}
	});
}

HttpClient.prototype.postForm = function(options, form, defer) {
	var length = qs.stringify(form).toString('utf8').length;
	var opts = parseOptions(options, this.config, length);

	var self = this;

	self.req.post(opts, function(err, res, body) {
		if (err) {
			defer(err);
		} else {
			console.log(opts.url, " ===> " , util.inspect(body, false, 10));
			defer(null, body);
		}
	}).form(form);
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