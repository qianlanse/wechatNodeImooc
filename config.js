'use strict'

var path = require('path');
var util = require('./libs/util');
var wechat_file = path.join(__dirname,'./config/wechat.txt');

var config = {
	wechat:{
		appID:'wxc66530a015247644',
		appSecret:'9eab966581bcfaa19e2ff1d033e13fdb',
		token:'imlearninglessonfornetworkofnodejs',
		getAccessToken:function(){
			return util.readFileAsync(wechat_file);
		},
		saveAccessToken:function(data){
			data = JSON.stringify(data);
			return util.writeFileAsync(wechat_file,data);
		}
	}
}

module.exports = config