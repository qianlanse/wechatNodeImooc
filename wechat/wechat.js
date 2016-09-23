'use strict'

var Promise = require('bluebird');
var _ = require('lodash');
var request = Promise.promisify(require('request'));
var util = require('./util')
var fs = require('fs');
var prefix = 'https://api.weixin.qq.com/cgi-bin/';
var api = {
	accessToken:prefix + 'token?grant_type=client_credential',
	temporary:{	// 临时素材
		upload:prefix + 'media/upload?',
		fetch:prefix + 'media/get?',
	},
	permanent:{	// 永久素材
		upload:prefix + 'material/add_material?',
		fetch:prefix + 'material/get_material?',
		uploadNews:prefix + 'material/add_news?',
		uploadNewsPic:prefix + 'media/uploading?',
		del:prefix + 'material/del_material?',
		update:prefix + 'material/update_news?',
		count:prefix + 'material/get_materialcount?',
		batch:prefix + 'material/batchget_material?'
	},
	group:{
		create:prefix + 'groups/create?',
		fetch:prefix + 'groups/get?',
		check:prefix + 'groups/getid?',
		update:prefix + 'groups/update?',
		move:prefix + 'groups/members/update?',
		batchupdate:prefix + 'groups/members/batchupdate?',
		del:prefix + 'groups/delete?'
	},
	user:{
		remark:prefix + 'user/info/updateremark?',
		fetch:prefix + 'user/info?',
		batchFetch:prefix + 'user/info/batchget?',
		list:prefix + 'user/get?'
	},
	mass:{
		group:prefix + 'message/mass/sendall?',
		openId:prefix + 'message/mass/send?',
		del:prefix + 'message/mass/delete?',
		preview:prefix + 'message/mass/preview?',
		check:prefix + 'message/mass/get?'
	}
}

function Wechat(opts){
	var that = this;
	this.appID = opts.appID;
	this.appSecret = opts.appSecret;
	this.getAccessToken = opts.getAccessToken;
	this.saveAccessToken = opts.saveAccessToken;

	this.fetchAccessToken()
}

Wechat.prototype.fetchAccessToken = function(){
	var that = this

	if(this.access_token && this.expires_in){
		if(this.isVilidAccessToken(this)){
			return Promise.resolve(this)
		}
	}

	this.getAccessToken()
		.then(function(data){
			try{
				data = JSON.parse(data);
			}catch(e){
				return that.updateAccessToken();
			}
			if(that.isVilidAccessToken(data)){
				return Promise.resolve(data);
			}else{
				return that.updateAccessToken();
			}
		})
		.then(function(data){
			that.access_token = data.access_token;
			that.expires_in = data.expires_in;
			that.saveAccessToken(data);

			return Promise.resolve(data)
		})
}

Wechat.prototype.isVilidAccessToken = function(data){
	if(!data || !data.access_token || !data.expires_in){
		return false;
	}

	var access_token = data.access_token;
	var expires_in = data.expires_in;
	var now = (new Date().getTime());

	if(now < expires_in){
		return true;
	}else{
		return false;
	}
}

Wechat.prototype.updateAccessToken = function(){
	var appID = this.appID;
	var appSecret = this.appSecret;
	var url = api.accessToken + '&appid=' + appID + '&secret=' + appSecret;

	return new Promise(function(resolve,reject){
		request({url:url,json:true}).then(function(response){
			var data = response.body;

			var now = (new Date().getTime());
			var expires_in = now + (data.expires_in - 20) * 1000;

			data.expires_in = expires_in;
			resolve(data);
		})
	})
}

// 上传素材
Wechat.prototype.uploadMaterial = function(type,material,permanent){
	var that = this
	var form = {}
	var fetchUrl = api.temporary.upload

	if(permanent){
		fetchUrl = api.permanent.upload
		_.extend(form,permanent)
	}
	if(type === 'pic'){
		fetchUrl = api.permanent.uploadNewsPic
	}
	if(type === 'news'){
		fetchUrl = api.permanent.uploadNews
		form = material
	}else{
		form.media = fs.createReadStream(material)
	}

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = fetchUrl + '&access_token=' + data.access_token
				if(!permanent){
					url += '&type=' + type
				}else{
					form.access_token = data.access_token
				}
				var options = {
					method:'POST',
					url:url,
					json:true
				}
				if(type === 'news'){
					options.body = form
				}else{
					options.formData = form
				}

				request(options).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Upload material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 获取素材
Wechat.prototype.fetchMaterial = function(mediaId,type,permanent){
	var that = this
	var fetchUrl = api.temporary.fetch

	if(permanent){
		fetchUrl = api.permanent.fetch
	}

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = fetchUrl + '&access_token=' + data.access_token

				var form = {}

				var options = {
					method:'POST',url:url,json:true
				}
				if(permanent){
					form.media_id = mediaId
					form.access_token = data.access_token
					options.body = form
				}else{
					if(type === 'video'){
						url = url.replace('https://','http://')
					}
					url += '&media_id=' + mediaId
				}
				if(type === 'news' || type === 'video'){
					request(options).then(function(response){
						var _data = response.body;
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Delete material fails')
						}
					})
					.catch(function(err){
						reject(err)
					})
				}else{
					resolve(url)
				}
			})
	})
}

// 删除素材
Wechat.prototype.deleteMaterial = function(mediaId){
	var that = this
	var form = {
		media_id:mediaId
	}

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.del + '&access_token=' + data.access_token + '&media_id=' + mediaId
				request({method:'POST',url:url,body:form,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Delete material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 更新素材
Wechat.prototype.updateMaterial = function(mediaId,news){
	var that = this
	var form = {
		media_id:mediaId
	}

	_.extend(form,news)

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.update + '&access_token=' + data.access_token + '&media_id=' + mediaId
				request({method:'POST',url:url,body:form,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Update material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 获取素材总数
Wechat.prototype.countMaterial = function(){
	var that = this

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.count + '&access_token=' + data.access_token
				request({method:'GET',url:url,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Count material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 获取素材列表
Wechat.prototype.batchMaterial = function(options){
	var that = this

	options.type = options.type || 'image'
	options.offset = options.offset || 0
	options.count = options.count || 1

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.batch + '&access_token=' + data.access_token
				request({method:'POST',url:url,body:options,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Batch material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 创建用户分组
Wechat.prototype.createGroup = function(name){
	var that = this

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.create + '&access_token=' + data.access_token

				var form = {
					group:{
						name:name
					}
				}

				request({method:'POST',url:url,body:form,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Create group material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 获取用户分组
Wechat.prototype.fetchGroups = function(name){
	var that = this

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.fetch + '&access_token=' + data.access_token

				request({url:url,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Fetch group material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 验证用户分组
Wechat.prototype.checkGroup = function(openId){
	var that = this

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.check + '&access_token=' + data.access_token
				var form = {
					openid:openId
				}

				request({method:'POST',url:url,body:form,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Check group material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 更新用户分组
Wechat.prototype.updateGroup = function(id,name){
	var that = this

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.update + '&access_token=' + data.access_token
				var form = {
					group:{
						id:id,
						name:name
					}
				}

				request({method:'POST',url:url,body:form,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Update group material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 单个与批量移动用户分组
Wechat.prototype.moveGroup = function(openIds,to){
	var that = this

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url,form = {
					to_groupid:to
				};
				if(_.isArray(openIds)){
					url = api.group.batchupdate + '&access_token=' + data.access_token
					form.openid_list = openIds
				}else{
					url = api.group.move + '&access_token=' + data.access_token
					form.openid = openIds
				}

				request({method:'POST',url:url,body:form,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Move group material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 删除用户分组
Wechat.prototype.deleteGroup = function(id){
	var that = this

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.del + '&access_token=' + data.access_token
				var form = {
					group:{
						id:id
					}
				}
				request({method:'POST',url:url,body:form,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Delete group material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 设置用户备注名
Wechat.prototype.remarkUser = function(openId,remark){
	var that = this

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.user.remark + '&access_token=' + data.access_token
				var form = {
					openid:openId,
					remark:remark
				}
				request({method:'POST',url:url,body:form,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Remark user material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 获取用户基本信息(单个或批量)
Wechat.prototype.fetchUsers = function(openIds,lang){
	var that = this
	var lang = lang || 'zh_CN'

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){

				var options = {
					json:true
				};
				if(_.isArray(openIds)){
					options.url = api.user.batchFetch + '&access_token=' + data.access_token
					options.body = {
						user_list:openIds
					}
					options.method = 'POST'
				}else{
					options.url = api.user.fetch + '&access_token=' + data.access_token + '&openid=' + openIds + '&lang=' + lang
				}
				request(options).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Remark user material fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 获取用户列表
Wechat.prototype.listUsers = function(openId){
	var that = this

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){

				var url = api.user.list + '&access_token=' + data.access_token;
				if(openId){
					url += '&next_openid=' + openId
				}
				request({url:url,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('User list fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 根据标签进行群发
Wechat.prototype.sendByGroup = function(type,message,groupId){
	var that = this

	var msg = {
		filter:{},
		msgtype:type
	}

	msg[type] = message

	if(!groupId){
		msg.filter.is_to_all = true
	}else{
		msg.filter = {
			is_to_all:false,
			group_id:groupId
		}
	}

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){

				var url = api.mass.group + '&access_token=' + data.access_token;

				request({method:'POST',url:url,body:msg,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('sendByGroup fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 删除群发【订阅号与服务号认证后均可用】
Wechat.prototype.deleteMass = function(msgId){
	var that = this


	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.mass.del + '&access_token=' + data.access_token;
				var form = {
					msg_id:msgId
				}
				request({method:'POST',url:url,body:form,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('deleteMass fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 根据OpenID列表群发【订阅号不可用，服务号认证后可用】
Wechat.prototype.sendByOpenId = function(type,message,openIds){
	var that = this

	var msg = {
		msgtype:type,
		touser:openIds
	}

	msg[type] = message


	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){

				var url = api.mass.openId + '&access_token=' + data.access_token;

				request({method:'POST',url:url,body:msg,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Send by openIds fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 预览接口【订阅号与服务号认证后均可用】
Wechat.prototype.previewMass = function(type,message,openId){
	var that = this

	var msg = {
		msgtype:type,
		touser:openId
	}

	msg[type] = message


	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){

				var url = api.mass.preview + '&access_token=' + data.access_token;

				request({method:'POST',url:url,body:msg,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Preview pass fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}

// 查询群发消息发送状态【订阅号与服务号认证后均可用】
Wechat.prototype.checkMass = function(msgId){
	var that = this

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){

				var url = api.mass.check + '&access_token=' + data.access_token;
				var form = {
					msg_id:msgId
				}
				request({method:'POST',url:url,body:form,json:true}).then(function(response){
					var _data = response.body;
					if(_data){
						resolve(_data)
					}else{
						throw new Error('Check pass fails')
					}
				})
				.catch(function(err){
					reject(err)
				})
			})
	})
}


Wechat.prototype.reply = function(){
	var content = this.body;
	var message = this.weixin;
	var xml = util.tpl(content,message)

	this.status = 200
	this.type = 'application/xml'
	this.body = xml
}

module.exports = Wechat;
