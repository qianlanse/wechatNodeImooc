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

Wechat.prototype.reply = function(){
	var content = this.body;
	var message = this.weixin;
	var xml = util.tpl(content,message)

	this.status = 200
	this.type = 'application/xml'
	this.body = xml
}

module.exports = Wechat;