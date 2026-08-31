App({
  globalData: { userInfo: null, splashVisible: true },
  onLaunch: function () {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) this.globalData.userInfo = userInfo
  }
})
