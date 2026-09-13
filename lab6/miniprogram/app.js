App({
  globalData: {
    env: "cloudbase-d4go8irco7551d927",
    openid: "",
    userInfo: wx.getStorageSync("photoCommunityUserInfo") || null,
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
      return;
    }

    wx.cloud.init({
      env: this.globalData.env,
      traceUser: true,
    });
    wx.cloud.callFunction({ name: "getOpenId" }).then(({ result }) => {
      this.globalData.openid = result.openid;
    }).catch((error) => {
      console.warn("获取 openid 失败，请部署 getOpenId 云函数", error);
    });
  },
});
