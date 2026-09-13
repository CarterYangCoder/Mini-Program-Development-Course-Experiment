const db = wx.cloud.database();
const photos = db.collection("photos");

Page({
  data: {
    photoList: [],
    favoritePhotos: [],
    favoriteCount: 0,
    loading: true,
    profile: null,
    isMine: false,
    loggedIn: false,
    loggingIn: false,
    followed: false,
    activeSection: "works",
  },
  onLoad({ id, mine }) {
    const app = getApp();
    this.openid = id;
    this.isMine = mine === "1" || Boolean(id && app.globalData.openid === id);
    const loggedIn = Boolean(app.globalData.userInfo);
    this.setData({
      isMine: this.isMine,
      loggedIn,
      followed: (wx.getStorageSync("followedAuthorIds") || []).includes(id),
      favoriteCount: (wx.getStorageSync("favoritePhotoIds") || []).length,
    });
    if (this.isMine && !loggedIn) {
      this.setData({ loading: false });
      return;
    }
    this.loadPhotos();
  },
  onShow() {
    if (!this.openid) return;
    const app = getApp();
    const loggedIn = Boolean(app.globalData.userInfo);
    const isMine = this.isMine || Boolean(app.globalData.openid && app.globalData.openid === this.openid);
    this.isMine = isMine;
    this.setData({
      loggedIn,
      isMine,
      followed: (wx.getStorageSync("followedAuthorIds") || []).includes(this.openid),
      favoriteCount: (wx.getStorageSync("favoritePhotoIds") || []).length,
    });
    if (!loggedIn) return;
    if (this.data.activeSection === "favorites") {
      this.loadFavorites();
    } else if (isMine) {
      this.loadPhotos();
    }
  },
  onPullDownRefresh() {
    if (this.data.isMine && !this.data.loggedIn) {
      wx.stopPullDownRefresh();
      return;
    }
    const task = this.data.activeSection === "favorites" ? this.loadFavorites() : this.loadPhotos();
    task.finally(() => wx.stopPullDownRefresh());
  },
  loadPhotos() {
    if (!this.openid) {
      this.setData({ loading: false });
      return Promise.resolve();
    }
    this.setData({ loading: true });
    return photos.where({ _openid: this.openid }).orderBy("createdAt", "desc").limit(100).get()
      .then(({ data }) => this.setData({
        photoList: data,
        profile: data[0] || (this.isMine ? getApp().globalData.userInfo : null),
      }))
      .catch((error) => {
        console.error(error);
        wx.showToast({ title: "个人主页加载失败", icon: "none" });
      })
      .finally(() => this.setData({ loading: false }));
  },
  loadFavorites() {
    if (!this.data.isMine || !this.data.loggedIn) return Promise.resolve();
    const favoriteIds = wx.getStorageSync("favoritePhotoIds") || [];
    this.setData({ favoriteCount: favoriteIds.length });
    if (!favoriteIds.length) {
      this.setData({ favoritePhotos: [], loading: false });
      return Promise.resolve();
    }
    this.setData({ loading: true });
    return Promise.all(favoriteIds.slice(0, 30).map((id) => photos.doc(id).get()
      .then(({ data }) => data)
      .catch(() => null)))
      .then((items) => this.setData({ favoritePhotos: items.filter(Boolean) }))
      .catch((error) => {
        console.error("加载收藏失败", error);
        wx.showToast({ title: "收藏加载失败", icon: "none" });
      })
      .finally(() => this.setData({ loading: false }));
  },
  selectSection(event) {
    const activeSection = event.currentTarget.dataset.section;
    if (activeSection === this.data.activeSection) return;
    this.setData({ activeSection });
    if (activeSection === "favorites") this.loadFavorites();
  },
  goToAdd() {
    wx.navigateTo({ url: "/pages/add/add" });
  },
  toggleFollow() {
    if (this.data.isMine) return;
    if (!getApp().globalData.userInfo) {
      wx.showToast({ title: "登录后可关注创作者", icon: "none" });
      return;
    }
    const ids = wx.getStorageSync("followedAuthorIds") || [];
    const nextIds = this.data.followed
      ? ids.filter((id) => id !== this.openid)
      : [this.openid, ...ids.filter((id) => id !== this.openid)];
    wx.setStorageSync("followedAuthorIds", nextIds);
    this.setData({ followed: !this.data.followed });
    wx.showToast({ title: this.data.followed ? "已关注" : "已取消关注" });
  },
  login() {
    const app = getApp();
    if (this.data.loggingIn) return;

    this.setData({ loggingIn: true });
    wx.showLoading({ title: "登录中" });
    const openidPromise = app.globalData.openid
      ? Promise.resolve(app.globalData.openid)
      : wx.cloud.callFunction({ name: "getOpenId" }).then(({ result }) => {
        app.globalData.openid = result.openid;
        return result.openid;
      });

    openidPromise
      .then((openid) => {
        this.openid = openid;
        this.isMine = true;
        return photos.where({ _openid: openid }).limit(1).get()
          .catch((error) => {
            console.warn("读取已有用户资料失败，将使用默认资料", error);
            return { data: [] };
          });
      })
      .then(({ data }) => {
        const profile = data[0] || {};
        const userInfo = {
          avatarUrl: profile.avatarUrl || "/images/icons/avatar.png",
          nickName: profile.nickName || "微信用户",
        };
        app.globalData.userInfo = userInfo;
        wx.setStorageSync("photoCommunityUserInfo", userInfo);
        this.setData({ loggedIn: true, isMine: true, profile: profile._id ? profile : userInfo });
        return this.loadPhotos();
      })
      .then(() => wx.showToast({ title: "登录成功" }))
      .catch((error) => {
        console.error("登录失败", error);
        wx.showToast({ title: "登录失败，请检查云函数", icon: "none" });
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({ loggingIn: false });
      });
  },
  logout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后，本机的收藏和关注记录仍会保留。",
      confirmText: "退出",
      confirmColor: "#CF4A3C",
      success: ({ confirm }) => {
        if (!confirm) return;
        getApp().globalData.userInfo = null;
        wx.removeStorageSync("photoCommunityUserInfo");
        wx.reLaunch({ url: "/pages/index/index" });
      },
    });
  },
});
