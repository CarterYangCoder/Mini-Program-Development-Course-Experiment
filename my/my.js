var common = require('../utils/common.js')

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    favorites: [],
    allNewsCount: 0,
    likeTotal: 0,
    commentTotal: 0,
    showProfileSheet: false,
    tempAvatar: '',
    tempName: '',
    serviceItems: [
      { icon: '专', title: '回信专题', subtitle: '牢记嘱托', id: 'zsjhx', category: '', tone: 'red' },
      { icon: '闻', title: '海大新闻', subtitle: '全部资讯', id: '', category: '推荐', tone: 'blue' },
      { icon: '研', title: '科研前沿', subtitle: '创新动态', id: '', category: '科研', tone: 'cyan' },
      { icon: '校', title: '校园新声', subtitle: '校园生活', id: '', category: '校园', tone: 'gold' }
    ]
  },

  onLoad: function () {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({ allNewsCount: common.getNewsList().length })
    if (userInfo) {
      this.setData({ isLoggedIn: true, userInfo: userInfo })
      this.refreshFavorites()
    }
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this.refreshFavorites()
    const isLoggedIn = !!wx.getStorageSync('userInfo')
    if (isLoggedIn) {
      const totals = common.getInteractionTotals()
      this.setData({ isLoggedIn: true, likeTotal: totals.likes, commentTotal: totals.comments })
    } else {
      this.setData({ isLoggedIn: false, likeTotal: 0, commentTotal: 0 })
    }
  },

  login: function () {
    const userInfo = this.data.userInfo || {}
    this.setData({
      showProfileSheet: true,
      tempAvatar: userInfo.avatarUrl || '',
      tempName: userInfo.nickName || ''
    })
    this.toggleTabBar(false)
  },

  toggleTabBar: function (visible) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ visible: visible })
    }
  },

  editProfile: function () {
    this.login()
  },

  onChooseAvatar: function (e) {
    this.setData({ tempAvatar: e.detail.avatarUrl })
  },

  onNickInput: function (e) {
    this.setData({ tempName: e.detail.value })
  },

  cancelProfile: function () {
    this.setData({ showProfileSheet: false })
    this.toggleTabBar(true)
  },

  noop: function () {},

  confirmProfile: function () {
    const nickName = this.data.tempName.trim() || '海大网友'
    const avatarUrl = this.data.tempAvatar || '/images/my_blue.png'
    this.setData({ showProfileSheet: false })
    this.toggleTabBar(true)
    this.saveUserInfo({ nickName: nickName, avatarUrl: avatarUrl })
    wx.showToast({ title: this.data.isLoggedIn ? '资料已更新' : '登录成功', icon: 'success' })
  },

  saveUserInfo: function (userInfo) {
    wx.setStorageSync('userInfo', userInfo)
    getApp().globalData.userInfo = userInfo
    this.setData({ isLoggedIn: true, userInfo: userInfo })
    this.refreshFavorites()
  },

  logout: function () {
    const page = this
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？收藏数据会保留。',
      confirmText: '退出',
      confirmColor: '#e64340',
      success: function (res) {
        if (!res.confirm) return
        wx.removeStorageSync('userInfo')
        getApp().globalData.userInfo = null
        page.setData({ isLoggedIn: false, userInfo: null, favorites: [] })
        wx.showToast({ title: '已退出登录', icon: 'success' })
      }
    })
  },

  refreshFavorites: function () {
    this.setData({ favorites: common.getFavorites() })
  },

  openService: function (e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({ url: '../detail/detail?id=' + id })
      return
    }
    this.openHomeCategory(e.currentTarget.dataset.category)
  },

  openHomeCategory: function (category) {
    wx.setStorageSync('homeCategory', category || '推荐')
    wx.switchTab({ url: '../index/index' })
  },

  goToHome: function (e) {
    this.openHomeCategory(e.currentTarget.dataset.category)
  },

  scrollToFavorites: function () {
    wx.pageScrollTo({ selector: '#favorites', duration: 300 })
  },

  goToDetail: function (e) {
    wx.navigateTo({ url: '../detail/detail?id=' + e.currentTarget.dataset.id })
  }
})
