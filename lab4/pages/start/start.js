// pages/start/start.js
var auth = require('../../utils/auth.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    progress: 0,
    ready: false,
    entering: false,
    user: null,
    nickname: '',
    avatarUrl: '/images/icons/bird.png',
    loginError: ''
  },

  /**
   * 生命周期函数 -- 监听页面加载
   */
  onLoad: function () {
    this.setData({ user: auth.getUser() })
    this.startLoading()
  },

  onShow: function () {
    this.setData({ user: auth.getUser(), entering: false })
  },

  onNicknameInput: function (e) {
    this.setData({ nickname: (e.detail.value || '').trim(), loginError: '' })
  },

  onChooseAvatar: function (e) {
    var path = e.detail.avatarUrl
    if (path) this.setData({ avatarUrl: path, loginError: '' })
  },

  login: function () {
    var nickname = (this.data.nickname || '').trim()
    if (!nickname) {
      this.setData({ loginError: '请先填写你的游戏昵称' })
      return
    }
    var user = {
      id: auth.createUserId(nickname),
      nickname: nickname.slice(0, 12),
      avatarUrl: this.data.avatarUrl || '/images/icons/bird.png'
    }
    auth.saveUser(user)
    this.vibrate('medium')
    this.setData({ user: user, loginError: '' })
  },

  /**
   * 生命周期函数 -- 监听页面卸载
   */
  onUnload: function () {
    this.stopLoading()
  },

  /**
   * 自定义函数 -- 模拟游戏资源加载进度
   */
  startLoading: function () {
    var that = this
    this.timer = setInterval(function () {
      var p = that.data.progress + Math.floor(Math.random() * 11) + 6
      if (p >= 100) {
        p = 100
        that.stopLoading()
        setTimeout(function () {
          that.setData({ ready: true })
        }, 250)
      }
      that.setData({ progress: p })
    }, 130)
  },

  /**
   * 自定义函数 -- 停止加载计时器
   */
  stopLoading: function () {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  /**
   * 自定义函数 -- 进入游戏（未加载完则快进，已就绪则跳转选关页）
   */
  enterGame: function () {
    var that = this
    if (!this.data.ready) {
      // 加载未完成时点击 = 快进加载
      this.stopLoading()
      this.setData({ progress: 100 })
      setTimeout(function () {
        that.setData({ ready: true })
      }, 200)
      return
    }
    if (!this.data.user) {
      this.setData({ loginError: '登录后才能进入游戏' })
      return
    }
    if (this.data.entering) return
    this.setData({ entering: true })
    this.vibrate('medium')
    setTimeout(function () {
      wx.redirectTo({ url: '/pages/index/index' })
    }, 280)
  },

  vibrate: function (type) {
    try { wx.vibrateShort({ type: type || 'light', fail: function () {} }) } catch (e) {}
  }
})
