var common = require('../utils/common.js')

Page({
  data: {
    categoryTabs: ['推荐', '要闻', '科研', '校园', '专题'],
    activeCategory: '推荐',
    keyword: '',
    allNews: [],
    featuredNews: [],
    newsList: [],
    showSplash: true,
    splashLeaving: false,
    statusBarHeight: 20
  },

  onLoad: function () {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const list = common.getNewsList()
    const page = this
    this.setData({
      statusBarHeight: info.statusBarHeight || 20,
      allNews: list,
      featuredNews: list.slice(0, 4),
      newsList: this.decorate(list)
    }, function () {
      page.consumePendingCategory()
    })
    this.splashTimer = setTimeout(function () {
      page.hideSplash()
    }, 3000)
  },

  hideSplash: function () {
    if (!this.data.showSplash || this.data.splashLeaving) return
    if (this.splashTimer) clearTimeout(this.splashTimer)
    const page = this
    this.setData({ splashLeaving: true })
    setTimeout(function () {
      page.setData({ showSplash: false })
      getApp().globalData.splashVisible = false
      if (typeof page.getTabBar === 'function' && page.getTabBar()) {
        page.getTabBar().setData({ visible: true })
      }
    }, 450)
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    if (this.data.allNews.length) this.consumePendingCategory()
    this.refreshFavFlags()
  },

  decorate: function (list) {
    return list.map(function (item) {
      const copy = Object.assign({}, item)
      copy.swipeX = 0
      copy.faved = common.isFavorite(item.id)
      return copy
    })
  },

  refreshFavFlags: function () {
    if (!this.data.newsList.length) return
    const list = this.data.newsList.map(function (item) {
      const copy = Object.assign({}, item)
      copy.faved = common.isFavorite(item.id)
      copy.swipeX = 0
      return copy
    })
    this.setData({ newsList: list })
  },

  onTouchStart: function (e) {
    const t = e.touches[0]
    const index = e.currentTarget.dataset.index
    this.touchInfo = { x: t.clientX, y: t.clientY, index: index, startX: this.data.newsList[index].swipeX }
    this.moved = false
  },

  onTouchMove: function (e) {
    if (!this.touchInfo) return
    const t = e.touches[0]
    const dx = t.clientX - this.touchInfo.x
    const dy = t.clientY - this.touchInfo.y
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
    if (Math.abs(dy) > Math.abs(dx)) return
    this.moved = true
    let x = this.touchInfo.startX + dx
    if (x > 0) x = 0
    if (x < -150) x = -150
    const patch = {}
    patch['newsList[' + this.touchInfo.index + '].swipeX'] = x
    this.setData(patch)
  },

  onTouchEnd: function () {
    if (!this.touchInfo) return
    const index = this.touchInfo.index
    const target = this.data.newsList[index].swipeX < -75 ? -150 : 0
    const patch = {}
    this.data.newsList.forEach(function (unused, i) {
      patch['newsList[' + i + '].swipeX'] = i === index ? target : 0
    })
    this.setData(patch)
    this.touchInfo = null
    if (this.moved) {
      const page = this
      this.suppressTap = true
      setTimeout(function () { page.suppressTap = false }, 260)
    }
  },

  toggleSwipeFav: function (e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.newsList[index]
    if (!wx.getStorageSync('userInfo')) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (item.faved) {
      common.removeFavorite(item.id)
      wx.showToast({ title: '已取消收藏', icon: 'none' })
    } else {
      common.addFavorite(common.getNewsDetail(item.id).news)
      wx.showToast({ title: '已收藏', icon: 'success' })
    }
    const patch = {}
    patch['newsList[' + index + '].faved'] = !item.faved
    patch['newsList[' + index + '].swipeX'] = 0
    this.setData(patch)
  },

  consumePendingCategory: function () {
    const category = wx.getStorageSync('homeCategory')
    if (!category) return
    wx.removeStorageSync('homeCategory')
    this.applyFilters(category, '')
  },

  applyFilters: function (category, keyword) {
    const base = (keyword || '').trim() ? common.searchNews(keyword) : this.data.allNews
    const list = base.filter(function (item) {
      return category === '推荐' || item.category === category
    })
    this.setData({
      activeCategory: category,
      keyword: keyword,
      newsList: this.decorate(list)
    })
  },

  switchCategory: function (e) {
    this.applyFilters(e.currentTarget.dataset.category, this.data.keyword)
  },

  goSearch: function () {
    wx.navigateTo({ url: '../search/search' })
  },

  goToDetail: function (e) {
    if (this.suppressTap) return
    wx.navigateTo({ url: '../detail/detail?id=' + e.currentTarget.dataset.id })
  },

  onShareAppMessage: function () {
    return { title: '海大新闻 · 观海听涛', path: '/index/index' }
  }
})
