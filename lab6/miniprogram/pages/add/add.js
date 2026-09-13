const db = wx.cloud.database();
const photos = db.collection("photos");
const formatDate = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
Page({
  data: {
    historyPhotos: [],
    uploading: false,
    selectedPhotoPath: "",
    publishStatus: "idle",
    uploadError: "",
    title: "",
    description: "",
    selectedCategory: "日常",
    categories: ["自然", "城市", "人物", "旅行", "日常", "其他"],
  },
  onShow() { this.loadHistory(); },
  loadHistory() {
    const openid = getApp().globalData.openid;
    if (!openid) return;
    photos.where({ _openid: openid }).orderBy("createdAt", "desc").limit(100).get()
      .then(({ data }) => this.setData({ historyPhotos: data }))
      .catch((error) => console.error("加载上传记录失败", error));
  },
  choosePhoto() {
    if (this.data.uploading) return;
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
    }).then(({ tempFilePaths }) => {
      this.setData({
        selectedPhotoPath: tempFilePaths[0],
        publishStatus: "idle",
        uploadError: "",
      });
    }).catch(() => {});
  },
  previewSelectedPhoto() {
    if (!this.data.selectedPhotoPath) return;
    wx.previewImage({
      current: this.data.selectedPhotoPath,
      urls: [this.data.selectedPhotoPath],
    });
  },
  removeSelectedPhoto() {
    if (this.data.uploading) return;
    this.setData({ selectedPhotoPath: "", publishStatus: "idle", uploadError: "" });
  },
  upload() {
    const app = getApp();
    if (this.data.uploading) return;
    if (!app.globalData.userInfo) { wx.showToast({ title: "请先在首页完成登录", icon: "none" }); return; }
    if (!app.globalData.openid) { wx.showModal({ title: "云函数未就绪", content: "请部署 getOpenId 云函数后重新进入小程序。", showCancel: false }); return; }
    if (!this.data.selectedPhotoPath) { wx.showToast({ title: "请先选择一张图片", icon: "none" }); return; }
    this.uploadFile(this.data.selectedPhotoPath);
  },
  onFieldInput(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value });
  },
  selectCategory(event) {
    this.setData({ selectedCategory: event.currentTarget.dataset.category });
  },
  uploadFile(filePath) {
    const extension = (filePath.match(/\.[^.]+$/) || [".jpg"])[0];
    const cloudPath = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
    const userInfo = getApp().globalData.userInfo;
    const { title, description, selectedCategory } = this.data;
    this.setData({ uploading: true, publishStatus: "uploading", uploadError: "" });
    wx.showLoading({ title: "正在发布" });
    wx.cloud.uploadFile({ cloudPath, filePath })
      .then(({ fileID }) => photos.add({ data: { photoUrl: fileID, avatarUrl: userInfo.avatarUrl, nickName: userInfo.nickName, title: title.trim() || "未命名作品", description: description.trim(), category: selectedCategory, addDate: formatDate(new Date()), createdAt: db.serverDate() } }))
      .then(() => {
        wx.showToast({ title: "发布成功" });
        this.setData({
          title: "",
          description: "",
          selectedPhotoPath: "",
          selectedCategory: "日常",
          publishStatus: "success",
        });
        this.loadHistory();
      })
      .catch((error) => {
        console.error(error);
        this.setData({
          publishStatus: "error",
          uploadError: "发布失败，请检查网络和 photos 集合权限后重试",
        });
        wx.showToast({ title: "发布失败，请稍后重试", icon: "none" });
      })
      .finally(() => { wx.hideLoading(); this.setData({ uploading: false }); });
  },
});
