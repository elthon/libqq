
//modify detail
//r:{"nick":"星沙妈妈网","gender":"female","shengxiao":"9","constel":"1","blood":"3","birthyear":"1981","birthmonth":"2","birthday":"2","phone":"","mobile":"","email":"andijo@qq.com","occupation":"","college":"","homepage":"","personal":"","vfwebqq":"799b0758f34a057d7886fbadff728cf7f360b79e348c27e9b0035e45e51acedae5cf93f10ba6c319"}

//modify user markname
//tuin=4012078777&markname=ywz&vfwebqq=799b0758f34a057d7886fbadff728cf7f360b79e348c27e9b0035e45e51acedae5cf93f10ba6c319

//GET_RECENT_LIST:POST
//r:{"vfwebqq":"7604e1d5493a836b4bdf77f1797ce739875f3809dac332183d3bd174baede27135e5568b1625f221","clientid":"90319944","psessionid":"8368046764001e636f6e6e7365727665725f77656271714031302e3133332e34312e323032000035e600000ec7036e04009ea633966d0000000a40676738784e416648486d000000287604e1d5493a836b4bdf77f1797ce739875f3809dac332183d3bd174baede27135e5568b1625f221"}
//clientid:90319944
//psessionid:8368046764001e636f6e6e7365727665725f77656271714031302e3133332e34312e323032000035e600000ec7036e04009ea633966d0000000a40676738784e416648486d000000287604e1d5493a836b4bdf77f1797ce739875f3809dac332183d3bd174baede27135e5568b1625f221

//Send Qun Msg
//r:{"group_uin":147213953,"content":"[\"dddd\",\"\",[\"font\",{\"name\":\"宋体\",\"size\":\"10\",\"style\":[0,0,0],\"color\":\"000000\"}]]","msg_id":83190001,"clientid":"90319944","psessionid":"8368046764001e636f6e6e7365727665725f77656271714031302e3133332e34312e323032000035e600000ec7036e04009ea633966d0000000a40676738784e416648486d000000287604e1d5493a836b4bdf77f1797ce739875f3809dac332183d3bd174baede27135e5568b1625f221"}
//clientid:90319944
//psessionid:8368046764001e636f6e6e7365727665725f77656271714031302e3133332e34312e323032000035e600000ec7036e04009ea633966d0000000a40676738784e416648486d000000287604e1d5493a836b4bdf77f1797ce739875f3809dac332183d3bd174baede27135e5568b1625f221

//r:{"group_uin":147213953,"content":"[[\"face\",111],\"ddddaaaa\",[\"face\",121],[\"face\",14],\"\\n\",[\"font\",{\"name\":\"宋体\",\"size\":\"10\",\"style\":[0,0,0],\"color\":\"000000\"}]]","msg_id":83190002,"clientid":"90319944","psessionid":"8368046764001e636f6e6e7365727665725f77656271714031302e3133332e34312e323032000035e600000ec7036e04009ea633966d0000000a40676738784e416648486d000000287604e1d5493a836b4bdf77f1797ce739875f3809dac332183d3bd174baede27135e5568b1625f221"}


//get_qq_level
//{"retcode":0,"result":{"level":2,"days":16,"hours":67,"remainDays":5,"tuin":2519967390}}


//delete friend
//tuin:3728352518
//delType:2
//vfwebqq:e2ff91801d6556cf9c8a0d13c7f128d142a8d1ac69cf311ce86b158736a72dbb4ff05e302b8536cb
module.exports  = {

	//讨论组
	"CREATE_DISCU":"http://d.web2.qq.com/channel/create_discu",
	"GET_DISCU_INFO":"http://d.web2.qq.com/channel/get_discu_info?did=%s&clientid=%s&psessionid=%s&vfwebqq=%s&t=%s",	//did:讨论组id

	//用户相关接口
	"GET_QQ_LEVEL":"http://s.web2.qq.com/api/get_qq_level2?tuin=%s&vfwebqq=%s&t=%s",
	"GET_FRIEND_INFO": "http://s.web2.qq.com/api/get_friend_info2?tuin=%s&verifysession=&code=&vfwebqq=%s&t=%s",
	"GET_SINGLE_LONG_NICK":"http://s.web2.qq.com/api/get_single_long_nick2?tuin=%s&vfwebqq=%s&t=%s",
	"MODIFY_MY_DETAILS": "http://s.web2.qq.com/api/modify_my_details2",
	"CHANGE_MARK_NAME":"http://s.web2.qq.com/api/change_mark_name2",
	"GET_RECENT_LIST":"http://d.web2.qq.com/channel/get_recent_list2",
	"DELETE_FRIEND":"http://s.web2.qq.com/api/delete_friend",

	//消息接口
	//临时消息
	"SEND_SESS_MSG":"http://d.web2.qq.com/channel/send_sess_msg2",
	"SEND_BUDDY_MSG":"http://d.web2.qq.com/channel/send_buddy_msg2",
	"SEND_QUN_MSG":"http://d.web2.qq.com/channel/send_qun_msg2",
	"MESSAGE_POLL":"http://d.web2.qq.com/channel/poll2",

	//群相关接口
	//获取我的群列表信息
	"GET_GROUP_NAME_LIST_MASK":"http://s.web2.qq.com/api/get_group_name_list_mask2",
	"SEARCH_GROUP":"http://cgi.web2.qq.com/keycgi/qqweb/group/search.do?pg=%s&perpage=%s&all=%s&c1=0&c2=0&c3=0&st=0&vfcode=%s&type=1&vfwebqq=%s&t=%s"

	//获取某个群的详细信息（成员列表）
	"GET_GROUP_INFO_EXT":"http://s.web2.qq.com/api/get_group_info_ext2?gcode=%s&vfwebqq=%s&t=%s",
	
	//获取群内公告
	"GET_SELF_BUSINESS_CARD":"http://s.web2.qq.com/api/get_self_business_card2?gcode=%s&vfwebqq=%s&t=%s",
	"UPDATE_GROUP_BUSINESS_CARD":"http://s.web2.qq.com/api/update_group_business_card2",
	"GET_GROUP_INFO":"http://s.web2.qq.com/api/get_group_info?gcode=%s&retainKey=memo&vfwebqq=%s&t=%s"
	
	
}