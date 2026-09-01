// pages/index/index.js
var auth = require('../../utils/auth.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    levels: [],
    user: null,
    completedCount: 0,
    totalGames: 0
  },

  /**
   * 生命周期函数 -- 监听页面显示（每次返回都刷新最佳纪录）
   */
  onShow: function () {
    var user = auth.getUser()
    if (!user) {
      wx.reLaunch({ url: '/pages/start/start' })
      return
    }
    var levels = []
    var completedCount = 0
    for (var i = 1; i <= 4; i++) {
      var best = auth.getBest(i - 1, user)
      if (best) completedCount++
      levels.push({
        img: '/images/level0' + i + '.png',
        name: '第 ' + i + ' 关',
        best: best || 0
      })
    }
    this.setData({
      user: user,
      levels: levels,
      completedCount: completedCount,
      totalGames: auth.getHistory(user).length
    })
  },

  /**
   * 自定义函数 -- 游戏选关
   */
  chooseLevel: function (e) {
    var level = e.currentTarget.dataset.level
    wx.navigateTo({
      url: '../game/game?level=' + level
    })
  },

  openHistory: function () {
    wx.navigateTo({ url: '/pages/history/history' })
  },

  logout: function () {
    wx.showModal({
      title: '退出登录',
      content: '退出后将隐藏当前账号的游戏历史，下次登录新身份会使用独立记录。',
      confirmText: '退出',
      confirmColor: '#F05B67',
      success: function (res) {
        if (!res.confirm) return
        auth.logout()
        wx.reLaunch({ url: '/pages/start/start' })
      }
    })
  }
})
