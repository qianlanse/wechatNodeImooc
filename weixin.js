'use strict'

var config = require('./config')
var Wechat = require('./wechat/wechat')
var wechatApi = new Wechat(config.wechat)

exports.reply = function*(next){
	var message = this.weixin

	if(message.MsgType == 'event'){				//事件推送
		if(message.Event == 'subscribe'){
			if(message.EventKey){
				console.log('扫描二维码进来：' + message.EventKey + ' ' + message.ticket)
			}
			this.body = '哈哈，你订阅了这个号'
		}else if(message.Event == 'unsubscribe'){
			console.log('取消订阅')
			this.body = ''
		}else if(message.Event == 'LOCATION'){
			this.body = '您上报的位置是：' + message.Latitude + '/' +
				message.Longitude + '-' + message.Precision
		}else if(message.Event == 'CLICK'){
			this.body = '您点击了菜单：' + message.EventKey
		}else if(message.Event == 'SCAN'){
			console.log('关注后扫二维码' + message.EventKey + ' ' + message.Ticket)
			this.body = '看到你扫了一下哦'
		}else if(message.Event == 'VIEW'){
			this.body = '您点击了菜单中的链接：' + message.EventKey
		}
	}else if(message.MsgType === 'text'){
		var content = message.Content
		var reply = '额，你说的 ' + message.Content + ' 太复杂了'

		if(content === '1'){
			reply = '天下第一吃大米'
		}else if(content === '2'){
			reply = '天下第二吃豆腐'
		}else if(content === '3'){
			reply = '天下第三吃仙丹'
		}else if(content === '4'){
			reply = [
				{
					title:'科技改变世界',
					description:'只是个描述而已',
					picUrl:'https://nodejs.org/static/images/interactive/nodejs-interactive-logo-center.png',
					url:'https://github.com'
				}
			]
		}else if(content === '5'){
			var data = yield wechatApi.uploadMaterial('image',__dirname + '/2.jpg')

			reply = {
				type:'image',
				mediaId:data.media_id
			}
		}else if(content === '6'){
			var data = yield wechatApi.uploadMaterial('video',__dirname + '/3.mp4')

			reply = {
				type:'video',
				title:'我的视频',
				description:'打个篮球玩玩',
				mediaId:data.media_id
			}
		}else if(content === '7'){
			var data = yield wechatApi.uploadMaterial('image',__dirname + '/2.jpg')

			reply = {
				type:'music',
				title:'我的音乐',
				description:'放松一下',
				musicUrl:'http://www.shallowblue.cn/Fade.mp3',
				thumbMediaId:data.media_id
			}
		}else if(content === '8'){
			var data = yield wechatApi.uploadMaterial('image',__dirname + '/4.jpg',{
				type:'image'
			})

			reply = {
				type:'image',
				mediaId:data.media_id
			}
		}else if(content === '9'){
			var data = yield wechatApi.uploadMaterial('video',__dirname + '/3.mp4',{
				type:'video',
				description:'{"title":"Really a nice place","introduction":"Never"}'
			})

			reply = {
				type:'video',
				title:'我的视频',
				description:'打个篮球玩玩',
				mediaId:data.media_id
			}
		}else if(content === '10'){
			var picData = yield wechatApi.uploadMaterial('image',__dirname + '/2.jpg',{})

			var media = {
				articles:[{
					title:'TuPian1',
					thumb_media_id:picData.media_id,
					author:'MatterJun',
					digest:'没有摘要',
					show_cover_pic:1,
					content:'没有内容',
					content_source_url:'https://github.com'
				},{
					title:'TuPian2',
					thumb_media_id:picData.media_id,
					author:'MatterJun',
					digest:'没有摘要',
					show_cover_pic:1,
					content:'没有内容',
					content_source_url:'https://github.com'
				},{
					title:'TuPian3',
					thumb_media_id:picData.media_id,
					author:'MatterJun',
					digest:'没有摘要',
					show_cover_pic:1,
					content:'没有内容',
					content_source_url:'https://github.com'
				}]
			}

			data = yield wechatApi.uploadMaterial('news',media,{})
			data = yield wechatApi.fetchMaterial(data.media_id,'news',{})
			console.log(data)
			var items = data.news_item
			var news = []
			items.forEach(function(item){
				news.push({
					title:item.title,
					decription:item.digest,
					picUrl:picData.url,
					url:item.url
				})
			})

			reply = news
		}else if(content === '11'){
			var counts = yield wechatApi.countMaterial()

			console.log(JSON.stringify(counts))

			var results = yield [
				wechatApi.batchMaterial({
					type:'image',
					offset:0,
					count:10
				}),
				wechatApi.batchMaterial({
					type:'video',
					offset:0,
					count:10
				}),
				wechatApi.batchMaterial({
					type:'voice',
					offset:0,
					count:10
				}),
				wechatApi.batchMaterial({
					type:'news',
					offset:0,
					count:10
				})
			]

			console.log(JSON.stringify(results))

			reply = '1'
		}else if(content === '12'){
			var group = yield wechatApi.createGroup('wechat2')
			console.log('新增分组 wechat2')
			console.log(group)

			var groups = yield wechatApi.fetchGroups()
			console.log('加了 wechat 后的分组列表')
			console.log(groups)

			var group2 = yield wechatApi.checkGroup(message.FromUserName)
			console.log('查看自己的分组')
			console.log(group2)

			var result = yield wechatApi.moveGroup(message.FromUserName,100)
			console.log('移动到 100')
			console.log(result)

			var groups2 = yield wechatApi.fetchGroups()
			console.log('移动后的分组列表')
			console.log(groups2)

			var result2 = yield wechatApi.moveGroup([message.FromUserName],2)
			console.log('批量移动到 100')
			console.log(result2)

			var groups3 = yield wechatApi.fetchGroups()
			console.log('批量移动后的分组列表')
			console.log(groups3)

			var result3 = yield wechatApi.updateGroup(100,'wechat110')
			console.log('100 wechat2 改名 wechat100')
			console.log(result3)

			var groups4 = yield wechatApi.fetchGroups()
			console.log('改名后的分组列表')
			console.log(groups4)

			var result4 = yield wechatApi.deleteGroup(100)
			console.log('删除100')
			console.log(result4)

			var groups5 = yield wechatApi.fetchGroups()
			console.log('删除100后的分组列表')
			console.log(groups5)

			reply = 'Group done!'
		}
		
		this.body = reply
	}
	yield next
}