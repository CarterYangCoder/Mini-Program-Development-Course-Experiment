# 实验3：高校新闻网微信小程序

<center>姓名：杨思睿</center>　<center>学号：24020007146</center>

| 项目 | 内容 |
| :-: | :-: |
| 姓名和学号 | 杨思睿 24020007146 |
| 本实验属于哪门课程 | 中国海洋大学26夏《移动软件开发》 |
| 实验名称 | 实验3：高校新闻网微信小程序 |
| 博客地址 | [CSDN 博客](https://blog.csdn.net/2401_87694000/article/details/164055472) |
| 代码仓库地址 | https://github.com/CarterYangCoder/Mini-Program-Development-Course-Experiment.git |

---

## 一、项目简介

使用原生微信小程序框架实现「海大新闻」校园资讯小程序。以中国海洋大学新闻网的新闻素材为基础，使用本地数据和本地图片资源完成新闻展示，包含首页、新闻详情、搜索和个人中心四个页面，并通过自定义 tabBar 组织主要入口。

**功能特性：**

- 首页启动页、新闻频道、焦点轮播、资讯快讯和新闻列表；
- 新闻支持「推荐、要闻、科研、校园、专题」五类筛选，支持左滑收藏；
- 新闻详情页展示标题、作者、来源、封面和正文，支持三档字号切换；
- 点赞、收藏、评论、回复、评论点赞和删除评论等互动功能；
- 关键词搜索（标题/正文/作者/来源/分类），登录后保存最近搜索历史；
- 个人中心支持设置头像昵称、查看互动统计和收藏列表；
- 收藏、点赞、评论和搜索历史均使用本地缓存持久化，重启后保留。

## 二、实验环境

- 操作系统：Windows 11
- 开发工具：微信开发者工具（Skyline 渲染引擎）

## 三、项目结构

```
lab3/
├── app.js                     # 小程序入口逻辑
├── app.json                   # 全局配置：注册页面、自定义 tabBar、导航栏样式
├── app.wxss                   # 全局样式
├── custom-tab-bar/            # 自定义底部导航组件（首页 / 我的）
├── index/                     # 首页：轮播、频道筛选、新闻列表、左滑收藏
│   ├── index.wxml
│   ├── index.wxss
│   ├── index.js
│   └── index.json
├── detail/                    # 新闻详情：正文阅读、字号切换、点赞收藏评论
│   ├── detail.wxml
│   ├── detail.wxss
│   ├── detail.js
│   └── detail.json
├── search/                    # 搜索页：关键词检索、搜索历史
│   ├── search.wxml
│   ├── search.wxss
│   ├── search.js
│   └── search.json
├── my/                        # 个人中心：登录、资料编辑、收藏列表、互动统计
│   ├── my.wxml
│   ├── my.wxss
│   ├── my.js
│   └── my.json
├── images/                    # 本地新闻图片与 tabBar 图标
├── utils/
│   └── common.js              # 新闻数据与本地缓存工具（收藏/点赞/评论/搜索历史）
├── sitemap.json               # 索引配置
└── project.config.json        # 微信开发者工具配置
```

## 四、关键实现

### 1. 自定义 tabBar

在 `app.json` 中启用自定义 tabBar，只保留「首页」和「我的」两个高频入口；搜索和详情通过页面跳转打开：

```json
"tabBar": {
  "custom": true,
  "list": [
    {"pagePath": "index/index", "text": "首页"},
    {"pagePath": "my/my", "text": "我的"}
  ]
}
```

### 2. 本地新闻数据模块

在 `utils/common.js` 中集中保存新闻数据（编号、标题、分类、封面、作者、来源、正文、发布日期），首页、搜索页、详情页复用同一份数据：

```javascript
function getNewsDetail(newsID) {
  for (var i = 0; i < news.length; i++) {
    if (newsID === news[i].id) return { code: '200', news: news[i] }
  }
  return { code: '404', news: {} }
}
```

新闻图片统一放在 `images` 目录，使用绝对路径引用，避免网络加载失败，便于离线演示。

### 3. 首页分类筛选与左滑收藏

频道点击后根据分类和关键词统一筛选；新闻卡片记录触摸起点和位移判断左右滑动，达到阈值后露出收藏按钮，避免与点击进详情冲突：

```javascript
applyFilters: function (category, keyword) {
  const base = (keyword || '').trim() ? common.searchNews(keyword) : this.data.allNews
  const list = base.filter(function (item) {
    return category === '推荐' || item.category === category
  })
  this.setData({ activeCategory: category, keyword: keyword, newsList: this.decorate(list) })
}
```

### 4. 搜索与多关键词匹配

多个关键词以空格分隔时，只有同时匹配全部关键词的新闻才显示：

```javascript
function searchNews(keyword) {
  const words = (keyword || '').trim().toLowerCase().split(/\s+/).filter(function (w) {
    return w.length > 0
  })
  if (words.length === 0) return getNewsList()
  return news.filter(function (item) {
    const text = (item.title + ' ' + item.content + ' ' + item.author
      + ' ' + item.source + ' ' + item.category).toLowerCase()
    return words.every(function (w) { return text.indexOf(w) >= 0 })
  })
}
```

搜索历史自动去重、最多保留十条，支持一键清空。

### 5. 详情页正文排版

正文按空行拆分段落，第一段的「本站讯」单独标红；提供小/中/大三档字号切换，配合宋体标题、阅读卡片和轻量动画营造高校融媒体专题报道的视觉效果。

### 6. 本地持久化互动

收藏保存在 `favoriteNews`，搜索历史保存在 `searchHistory`，点赞和评论保存在 `newsInteractions`，均以「新闻编号 → 互动记录」方式组织。各页面在 `onShow` 生命周期中统一从工具模块刷新状态，保证首页、详情页、个人中心数据一致。

## 五、踩坑记录

| 问题 | 原因 | 解决方法 |
| :-: | :-- | :-- |
| 收藏后各页面状态不同步 | 每个页面各自维护状态 | 互动状态集中在 `utils/common.js` 读写，`onShow` 中统一刷新 |
| 左滑收藏误触详情跳转 | 点击与滑动手势冲突 | 记录触摸起点与位移，横向超过阈值时屏蔽点击事件 |
| 互动数据重启后丢失 | 仅保存在页面 `data` 中 | 改用 `wx.getStorageSync` / `wx.setStorageSync` 持久化 |
| 长正文阅读体验差 | 文字直接堆放 | 按空行分段、首行缩进、大行高、字号切换、封面图与元信息分区 |

## 六、运行方式

使用微信开发者工具「导入项目」，选择本目录（`lab3`）即可打开编译运行。当前配置使用 `touristappid`，可直接体验；需要真机功能时，在 `project.config.json` 中换成自己的小程序 AppID。
