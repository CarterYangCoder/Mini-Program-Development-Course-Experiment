var common = require('../utils/common.js')

Page({
  data: {
    article: null,
    paragraphs: [],
    fontSize: 'medium',
    isFavorite: false,
    notFound: false,
    isLoggedIn: false,
    liked: false,
    likeCount: 0,
    favoriteCount: 0,
    comments: [],
    commentText: '',
    replyTo: null,
    replyToName: '',
    likeBurst: false,
    favBurst: false
  },

  onLoad: function (options) {
    const id = options.id || ''
    const result = common.getNewsDetail(id)
    if (result.code !== '200') {
      this.setData({ notFound: true })
      return
    }
    const paragraphs = result.news.content.split(/\n\s*\n/).filter(function (text) {
      return text.trim().length > 0
    }).map(function (text, index) {
      const cleanText = text.trim()
      const hasLead = index === 0 && /^本站讯\s*/.test(cleanText)
      return {
        id: index,
        hasLead: hasLead,
        text: hasLead ? cleanText.replace(/^本站讯\s*/, '') : cleanText
      }
    })
    this.setData({
      article: result.news,
      paragraphs: paragraphs
    })
    this.refreshInteractions()
  },

  onShow: function () {
    if (this.data.article) this.refreshInteractions()
  },

  refreshInteractions: function () {
    const id = this.data.article.id
    const record = common.getInteraction(id)
    this.setData({
      isLoggedIn: !!wx.getStorageSync('userInfo'),
      isFavorite: common.isFavorite(id),
      liked: record.liked,
      likeCount: record.likes,
      favoriteCount: record.favorites,
      comments: record.comments
    })
  },

  login: function () {
    const page = this
    const done = function (userInfo) {
      wx.setStorageSync('userInfo', userInfo)
      getApp().globalData.userInfo = userInfo
      page.refreshInteractions()
      wx.showToast({ title: '登录成功', icon: 'success' })
    }
    if (!wx.getUserProfile) {
      done({ nickName: '校园访客', avatarUrl: '/images/my_blue.png' })
      return
    }
    wx.getUserProfile({
      desc: '用于展示头像昵称及互动记录',
      success: function (res) { done(res.userInfo) },
      fail: function () {
        wx.showModal({
          title: '未获得微信资料',
          content: '可使用体验身份登录，点赞、评论、收藏功能不受影响。',
          confirmText: '体验登录',
          success: function (res) {
            if (res.confirm) done({ nickName: '校园访客', avatarUrl: '/images/my_blue.png' })
          }
        })
      }
    })
  },

  requireLogin: function () {
    if (this.data.isLoggedIn) return true
    wx.showToast({ title: '请先登录', icon: 'none' })
    return false
  },

  toggleLike: function () {
    if (!this.requireLogin()) return
    const record = common.setLiked(this.data.article.id, !this.data.liked)
    this.setData({ liked: record.liked, likeCount: record.likes })
    if (record.liked) this.playBurst('likeBurst')
  },

  addFavorite: function () {
    if (!this.requireLogin()) return
    common.addFavorite(this.data.article)
    const record = common.getInteraction(this.data.article.id)
    this.setData({ isFavorite: true, favoriteCount: record.favorites })
    this.playBurst('favBurst')
    wx.showToast({ title: '已加入收藏', icon: 'success' })
  },

  removeFavorite: function () {
    if (!this.requireLogin()) return
    common.removeFavorite(this.data.article.id)
    const record = common.getInteraction(this.data.article.id)
    this.setData({ isFavorite: false, favoriteCount: record.favorites })
    wx.showToast({ title: '已取消收藏', icon: 'none' })
  },

  playBurst: function (field) {
    const page = this
    const patch = {}
    patch[field] = true
    this.setData(patch)
    setTimeout(function () {
      const reset = {}
      reset[field] = false
      page.setData(reset)
    }, 500)
  },

  onCommentInput: function (e) {
    this.setData({ commentText: e.detail.value })
  },

  buildEntry: function (text) {
    const userInfo = wx.getStorageSync('userInfo') || {}
    const now = new Date()
    const pad = function (n) { return n < 10 ? '0' + n : '' + n }
    return {
      id: 'c' + now.getTime() + Math.floor(Math.random() * 1000),
      name: userInfo.nickName || '海大网友',
      avatar: userInfo.avatarUrl || '/images/my_blue.png',
      text: text,
      time: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()),
      likes: 0,
      likedByMe: false,
      replies: []
    }
  },

  submitComment: function () {
    if (!this.requireLogin()) return
    const text = this.data.commentText.trim()
    if (!text) {
      wx.showToast({ title: '先写点内容吧', icon: 'none' })
      return
    }
    const entry = this.buildEntry(text)
    let comments
    if (this.data.replyTo) {
      comments = common.addReplyRecord(this.data.article.id, this.data.replyTo, entry)
    } else {
      comments = common.addCommentRecord(this.data.article.id, entry)
    }
    const wasReply = !!this.data.replyTo
    this.setData({ comments: comments, commentText: '', replyTo: null, replyToName: '' })
    wx.showToast({ title: wasReply ? '回复成功' : '评论成功', icon: 'success' })
  },

  tapReply: function (e) {
    if (!this.requireLogin()) return
    this.setData({
      replyTo: e.currentTarget.dataset.id,
      replyToName: e.currentTarget.dataset.name
    })
  },

  cancelReply: function () {
    this.setData({ replyTo: null, replyToName: '' })
  },

  toggleCommentLike: function (e) {
    if (!this.requireLogin()) return
    const comments = common.toggleCommentLike(this.data.article.id, e.currentTarget.dataset.id)
    this.setData({ comments: comments })
  },

  deleteComment: function (e) {
    if (!this.requireLogin()) return
    const page = this
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除评论',
      content: '确定删除这条评论吗？其下的回复也会一并删除。',
      confirmText: '删除',
      confirmColor: '#e64340',
      success: function (res) {
        if (!res.confirm) return
        page.setData({ comments: common.deleteCommentRecord(page.data.article.id, id) })
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  setFontSize: function (e) {
    this.setData({ fontSize: e.currentTarget.dataset.size })
  },

  copySourceLink: function () {
    wx.setClipboardData({
      data: this.data.article.source_url,
      success: function () {
        wx.showToast({ title: '原文链接已复制', icon: 'none' })
      }
    })
  },

  onShareAppMessage: function () {
    const article = this.data.article
    return {
      title: article ? article.title : '高校新闻网',
      path: article ? '/detail/detail?id=' + article.id : '/index/index'
    }
  }
})
