var auth = require('../../utils/auth.js')

Page({
  data: {
    user: null,
    records: [],
    totalGames: 0,
    bestCount: 0,
    totalSteps: 0
  },

  onShow: function () {
    var user = auth.getUser()
    if (!user) {
      wx.reLaunch({ url: '/pages/start/start' })
      return
    }
    var records = auth.getHistory(user)
    var bestCount = 0
    var totalSteps = 0
    records.forEach(function (item) {
      if (item.isNewBest) bestCount++
      totalSteps += item.steps || 0
    })
    this.setData({
      user: user,
      records: records,
      totalGames: records.length,
      bestCount: bestCount,
      totalSteps: totalSteps
    })
  },

  playAgain: function (e) {
    var level = parseInt(e.currentTarget.dataset.level) - 1
    wx.navigateTo({ url: '/pages/game/game?level=' + level })
  }
})
