const db = wx.cloud.database();
const photos = db.collection("photos");

Page({
  data: {
    photoList: [],
    filteredPhotos: [],
    loading: true,
    emptyText: "还没有图片，成为第一个分享的人吧",
    loggedIn: false,
    loggingIn: false,
    userInfo: null,
    showProfileSetup: false,
    setupAvatar: "",
    setupNickName: "",
    savingProfile: false,
    searchKeyword: "",
    activeFeed: "推荐",
    activeTag: "全部",
    tags: ["全部", "自然", "城市", "人物", "旅行", "日常"],
    favoriteIds: [],
    likedIds: [],
    followedAuthorIds: [],
    leftColumn: [],
    rightColumn: [],
  },
  onShow() {
    this.setData({
      loggedIn: Boolean(getApp().globalData.userInfo),
      userInfo: getApp().globalData.userInfo,
      favoriteIds: wx.getStorageSync("favoritePhotoIds") || [],
      likedIds: wx.getStorageSync("likedPhotoIds") || [],
      followedAuthorIds: wx.getStorageSync("followedAuthorIds") || [],
    });
    this.loadPhotos();
  },
  onPullDownRefresh() { this.loadPhotos().finally(() => wx.stopPullDownRefresh()); },
  loadPhotos() {
    this.setData({ loading: true });
    return photos.orderBy("createdAt", "desc").limit(100).get()
      .then(({ data }) => {
        this.setData({ photoList: data });
        this.applyFilters();
      })
      .catch((error) => { console.error(error); wx.showToast({ title: "加载图片失败", icon: "none" }); })
      .finally(() => this.setData({ loading: false }));
  },
  onSearchInput(event) {
    this.setData({ searchKeyword: event.detail.value });
    this.applyFilters();
  },
  selectTag(event) {
    this.setData({ activeTag: event.currentTarget.dataset.tag });
    this.applyFilters();
  },
  showRecommended() {
    this.setData({ activeFeed: "推荐" });
    this.applyFilters();
  },
  viewFollowing() {
    if (!this.data.loggedIn) {
      wx.showToast({ title: "登录后可查看关注作品", icon: "none" });
      return;
    }
    this.setData({ activeFeed: "关注" });
    this.applyFilters();
  },
  applyFilters() {
    const { photoList, searchKeyword, activeFeed, activeTag, favoriteIds, likedIds, followedAuthorIds } = this.data;
    const keyword = searchKeyword.trim().toLowerCase();
    const filteredPhotos = photoList.filter((photo) => {
      const matchesTag = activeTag === "全部" || (activeTag === "收藏" ? favoriteIds.includes(photo._id) : photo.category === activeTag);
      const searchable = `${photo.title || ""} ${photo.description || ""} ${photo.nickName || ""} ${photo.category || ""}`.toLowerCase();
      const matchesFeed = activeFeed === "推荐" || followedAuthorIds.includes(photo._openid);
      return matchesFeed && matchesTag && (!keyword || searchable.includes(keyword));
    }).map((photo) => {
      const isLiked = likedIds.includes(photo._id);
      return {
        ...photo,
        isFavorite: favoriteIds.includes(photo._id),
        isLiked,
        displayLikeCount: (photo.likeCount || 0) + (isLiked ? 1 : 0),
      };
    });
    this.setData({
      filteredPhotos,
      leftColumn: filteredPhotos.filter((_, index) => index % 2 === 0),
      rightColumn: filteredPhotos.filter((_, index) => index % 2 === 1),
    });
  },
  toggleFavorite(event) {
    const id = event.currentTarget.dataset.id;
    const favoriteIds = [...this.data.favoriteIds];
    const index = favoriteIds.indexOf(id);
    if (index >= 0) favoriteIds.splice(index, 1); else favoriteIds.unshift(id);
    wx.setStorageSync("favoritePhotoIds", favoriteIds);
    this.setData({ favoriteIds });
    this.applyFilters();
  },
  toggleLike(event) {
    const id = event.currentTarget.dataset.id;
    const likedIds = [...this.data.likedIds];
    const index = likedIds.indexOf(id);
    if (index >= 0) likedIds.splice(index, 1); else likedIds.unshift(id);
    wx.setStorageSync("likedPhotoIds", likedIds);
    this.setData({ likedIds });
    this.applyFilters();
  },
  goToMyProfile() {
    const app = getApp();
    const navigateToProfile = (openid) => {
      wx.navigateTo({
        url: `/pages/homepage/homepage?id=${openid}&mine=1`,
      });
    };

    if (app.globalData.openid) {
      navigateToProfile(app.globalData.openid);
      return;
    }

    wx.showLoading({ title: "正在进入" });
    wx.cloud.callFunction({ name: "getOpenId" })
      .then(({ result }) => {
        app.globalData.openid = result.openid;
        navigateToProfile(result.openid);
      })
      .catch((error) => {
        console.error("获取用户身份失败", error);
        wx.showToast({ title: "进入个人主页失败", icon: "none" });
      })
      .finally(() => wx.hideLoading());
  },
  goToAdd() {
    const app = getApp();
    if (app.globalData.userInfo) { wx.navigateTo({ url: "/pages/add/add" }); return; }
    wx.showToast({ title: "请先登录", icon: "none" });
  },
  login(openProfile = false) {
    const app = getApp();
    if (this.data.loggingIn) return;

    const shouldOpenProfile = openProfile === true;
    this.setData({ loggingIn: true });
    wx.showLoading({ title: "登录中" });

    const openidPromise = app.globalData.openid
      ? Promise.resolve(app.globalData.openid)
      : wx.cloud.callFunction({ name: "getOpenId" }).then(({ result }) => {
        app.globalData.openid = result.openid;
        return result.openid;
      });

    openidPromise
      .then((openid) => db.collection("users").where({ _openid: openid }).limit(1).get())
      .then(({ data }) => {
        wx.hideLoading();
        this.setData({ loggingIn: false });
        if (data.length) {
          this.applyUserInfo(
            { avatarUrl: data[0].avatarUrl, nickName: data[0].nickName },
            shouldOpenProfile
          );
        } else {
          this.setData({ showProfileSetup: true, setupAvatar: "", setupNickName: "" });
        }
      })
      .catch((error) => {
        console.error("登录失败", error);
        wx.hideLoading();
        this.setData({ loggingIn: false });
        wx.showToast({ title: "登录失败，请检查云函数", icon: "none" });
      });
  },
  applyUserInfo(userInfo, openProfile) {
    const app = getApp();
    app.globalData.userInfo = userInfo;
    wx.setStorageSync("photoCommunityUserInfo", userInfo);
    this.setData({ loggedIn: true, userInfo });
    wx.showToast({ title: "登录成功" });
    if (openProfile) {
      wx.navigateTo({
        url: `/pages/homepage/homepage?id=${app.globalData.openid}`,
      });
    }
  },
  onChooseAvatar(event) {
    this.setData({ setupAvatar: event.detail.avatarUrl });
  },
  onNickNameInput(event) {
    this.setData({ setupNickName: event.detail.value });
  },
  cancelProfileSetup() {
    if (this.data.savingProfile) return;
    this.setData({ showProfileSetup: false });
  },
  confirmProfileSetup() {
    const { setupAvatar, setupNickName, savingProfile } = this.data;
    if (savingProfile) return;
    if (!setupAvatar) { wx.showToast({ title: "请点击头像选择微信头像", icon: "none" }); return; }
    const nickName = setupNickName.trim();
    if (!nickName) { wx.showToast({ title: "请填写微信昵称", icon: "none" }); return; }
    this.setData({ savingProfile: true });

    const extension = (setupAvatar.match(/\.[^.]+$/) || [".png"])[0];
    const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
    let avatarFileID = "";

    wx.cloud.uploadFile({ cloudPath, filePath: setupAvatar })
      .then(({ fileID }) => {
        avatarFileID = fileID;
        return db.collection("users").add({
          data: { avatarUrl: fileID, nickName, createdAt: db.serverDate() },
        });
      })
      .then(() => {
        this.setData({ showProfileSetup: false, savingProfile: false });
        this.applyUserInfo({ avatarUrl: avatarFileID, nickName }, false);
      })
      .catch((error) => {
        console.error("保存用户资料失败", error);
        this.setData({ savingProfile: false });
        wx.showToast({ title: "保存失败，请检查 users 集合权限", icon: "none" });
      });
  },
  noop() {},
  onShareAppMessage(event) {
    const id = event && event.target && event.target.dataset.id;
    const photo = this.data.photoList.find((item) => item._id === id);
    if (!photo) {
      return {
        title: "光影拾集｜发现值得珍藏的画面",
        path: "/pages/index/index",
      };
    }
    return {
      title: photo.title || "分享一幅光影作品",
      path: `/pages/detail/detail?id=${photo._id}`,
      imageUrl: photo.photoUrl,
    };
  },
});
