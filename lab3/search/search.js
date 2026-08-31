var common = require('../utils/common.js')

Page({
  data: {
    keyword: '',
    results: [],
    searched: false,
    isLoggedIn: false,
    history: []
  },

  onShow: function () {
    const isLoggedIn = !!wx.getStorageSync('userInfo')
    this.setData({
      isLoggedIn: isLoggedIn,
      history: isLoggedIn ? common.getSearchHistory() : []
    })
  },

  onInput: function (e) {
    const keyword = e.detail.value
    const hasKeyword = keyword.trim().length > 0
    this.setData({
      keyword: keyword,
      searched: hasKeyword,
      results: hasKeyword ? common.searchNews(keyword) : []
    })
  },

  onConfirm: function () {
    this.saveKeyword()
  },

  saveKeyword: function () {
    if (!this.data.isLoggedIn) return
    const history = common.addSearchHistory(this.data.keyword)
    this.setData({ history: history })
  },

  onClear: function () {
    this.setData({ keyword: '', results: [], searched: false })
  },

  tapHistory: function (e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({
      keyword: keyword,
      searched: true,
      results: common.searchNews(keyword)
    })
  },

  clearHistory: function () {
    common.clearSearchHistory()
    this.setData({ history: [] })
  },

  goBack: function () {
    wx.navigateBack()
  },

  goToDetail: function (e) {
    this.saveKeyword()
    wx.navigateTo({ url: '../detail/detail?id=' + e.currentTarget.dataset.id })
  }
})
