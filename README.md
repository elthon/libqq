libqq v0.1.0
====
**LibQQ是基于WebQQ 3.0协议的Nodejs版操作库，你可以基于LibQQ开发自己的QQ客户端。**

## 特征

1. 依赖于[thenjs](https://github.com/teambition/then.js)框架
2. 提供基本的操作接口：登录、验证码、接收消息、发送消息、获取好友、获取头像

## 安装

````bash
npm install libqq
````

## 使用

**默认维护一个libqq** 

````javascript
var libqq = reqiure("libqq");		//系统默认初始化了一个libqq
libqq.setUin(123456);
libqq.setPassword("123456");
then(function(defer){
	libqq.login(defer);
}).then(function(defer, value){
	console.log("已经登录");
}.function(defer, error){
	console.log("登录失败");
});
````

**维护多个libqq**

````javascript
var QQClient = reqiure("libqq").QQClient;
var libqq = new QQClient({
	uin : 123456,
	password: "123456"
});
then(function(defer){
	libqq.login(defer);
}).then(function(defer, value){
	console.log("已经登录");
}.function(defer, error){
	console.log("登录失败");
});
````


## API
参考[libqq API](https://github.com/elthon/libqq/wiki/libqq-API)