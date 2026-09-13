const db = wx.cloud.database();
const photos = db.collection("photos");
Page({
  data: { photo: null, loading: true, favorited: false, followed: false, isMine: false, deleting: false },
  onLoad({ id }) {
    if (!id) return;
    const app = getApp();
    const openidReady = app.globalData.openid
      ? Promise.resolve(app.globalData.openid)
      : wx.cloud.callFunction({ name: "getOpenId" })
        .then(({ result }) => {
          app.globalData.openid = result.openid;
          return result.openid;
        })
        .catch(() => "");
    openidReady.then(() => photos.doc(id).get())
      .then(({ data }) => this.setData({
        photo: data,
        favorited: (wx.getStorageSync("favoritePhotoIds") || []).includes(data._id),
        followed: (wx.getStorageSync("followedAuthorIds") || []).includes(data._openid),
        isMine: Boolean(getApp().globalData.openid && getApp().globalData.openid === data._openid),
      }))
      .catch(() => wx.showToast({ title: "图片不存在或无权查看", icon: "none" }))
      .finally(() => this.setData({ loading: false }));
  },
  downloadPhoto() { const { photo } = this.data; if (!photo) return; wx.showLoading({ title: "正在保存" }); wx.cloud.downloadFile({ fileID: photo.photoUrl }).then(({ tempFilePath }) => wx.saveImageToPhotosAlbum({ filePath: tempFilePath })).then(() => wx.showToast({ title: "已保存到相册" })).catch((error) => { console.error(error); wx.showToast({ title: "保存失败，请授权相册权限后重试", icon: "none" }); }).finally(() => wx.hideLoading()); },
  previewPhoto() { const { photo } = this.data; if (photo) wx.previewImage({ current: photo.photoUrl, urls: [photo.photoUrl] }); },
  toggleFavorite() {
    const { photo, favorited } = this.data;
    if (!photo) return;
    const ids = wx.getStorageSync("favoritePhotoIds") || [];
    const nextIds = favorited ? ids.filter((id) => id !== photo._id) : [photo._id, ...ids.filter((id) => id !== photo._id)];
    wx.setStorageSync("favoritePhotoIds", nextIds);
    this.setData({ favorited: !favorited });
    wx.showToast({ title: favorited ? "已取消收藏" : "已收藏" });
  },
  deletePhoto() {
    const { photo, isMine, deleting } = this.data;
    if (!photo || !isMine || deleting) return;
    wx.showModal({
      title: "删除作品",
      content: "删除后无法恢复，确定删除这幅作品吗？",
      confirmText: "删除",
      confirmColor: "#CF4A3C",
      success: ({ confirm }) => {
        if (!confirm) return;
        this.setData({ deleting: true });
        wx.showLoading({ title: "删除中" });
        wx.cloud.callFunction({
          name: "quickstartFunctions",
          data: { type: "deletePhoto", data: { _id: photo._id } },
        })
          .then(({ result }) => {
            if (!result || !result.success) throw new Error((result && result.errMsg) || "删除失败");
            const ids = wx.getStorageSync("favoritePhotoIds") || [];
            wx.setStorageSync("favoritePhotoIds", ids.filter((fid) => fid !== photo._id));
            wx.showToast({ title: "已删除" });
            setTimeout(() => wx.navigateBack({ fail: () => wx.reLaunch({ url: "/pages/index/index" }) }), 600);
          })
          .catch((error) => {
            console.error(error);
            wx.showToast({ title: "删除失败，请重试", icon: "none" });
          })
          .finally(() => {
            wx.hideLoading();
            this.setData({ deleting: false });
          });
      },
    });
  },
  toggleFollow() {
    const { photo, followed } = this.data;
    if (!photo || this.data.isMine) return;
    if (!getApp().globalData.userInfo) {
      wx.showToast({ title: "登录后可关注创作者", icon: "none" });
      return;
    }
    const ids = wx.getStorageSync("followedAuthorIds") || [];
    const nextIds = followed
      ? ids.filter((id) => id !== photo._openid)
      : [photo._openid, ...ids.filter((id) => id !== photo._openid)];
    wx.setStorageSync("followedAuthorIds", nextIds);
    this.setData({ followed: !followed });
    wx.showToast({ title: followed ? "已取消关注" : "已关注" });
  },
  onShareAppMessage() {
    const { photo } = this.data;
    return {
      title: photo ? photo.title || "分享一幅光影作品" : "光影拾集",
      path: photo ? `/pages/detail/detail?id=${photo._id}` : "/pages/index/index",
      imageUrl: photo && photo.photoUrl,
    };
  },
});
