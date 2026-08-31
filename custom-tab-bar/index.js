Component({
  data: {
    selected: 0,
    visible: true,
    list: [
      { path: '/index/index', icon: '⌂', text: '首页' },
      { path: '/my/my', icon: '♡', text: '我的' }
    ]
  },

  attached: function () {
    const app = getApp()
    if (app.globalData && app.globalData.splashVisible) {
      this.setData({ visible: false })
    }
  },

  methods: {
    switchTab: function (e) {
      const path = e.currentTarget.dataset.path
      const index = e.currentTarget.dataset.index
      if (index === this.data.selected) return
      wx.switchTab({ url: path })
    }
  }
})
