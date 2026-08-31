# 实验三：高校新闻网微信小程序

<center>姓名：杨思睿</center><center>学号：24020007146</center>

| 项目 | 内容 |
| :-: | :- |
| 姓名和学号 | 杨思睿 24020007146 |
| 本实验属于哪门课程 | 中国海洋大学26夏《移动软件开发》 |
| 实验名称 | 实验三：高校新闻网微信小程序 |
| 博客地址 | https://blog.csdn.net/2401_87694000/article/details/164055472?fromshare=blogdetail&sharetype=blogdetail&sharerId=164055472&sharerefer=PC&sharesource=2401_87694000&sharefrom=from_link |
| 代码仓库地址 | https://github.com/CarterYangCoder/Mini-Program-Development-Course-Experiment.git |

---

## 一、实验内容

本实验使用原生微信小程序框架实现“海大新闻”校园资讯小程序。项目以中国海洋大学新闻网的新闻素材为基础，使用本地数据和本地图片资源完成新闻展示，包含首页、新闻详情、搜索和个人中心四个页面，并通过自定义 tabBar 组织主要入口。

实现的主要功能如下：

1. 首页展示启动页、新闻频道、焦点轮播、资讯快讯和新闻列表；
2. 新闻支持“推荐、要闻、科研、校园、专题”五类筛选；
3. 支持从首页或搜索结果进入新闻详情，查看标题、作者、来源、发布日期、封面和正文；
4. 详情页支持字号切换、分享、复制原文链接、点赞、收藏、评论、回复、评论点赞和删除评论；
5. 支持标题、正文、作者、来源和分类等关键词检索，并在登录后保存最近搜索历史；
6. “我的”页面支持设置头像昵称、退出登录、查看个人互动统计、访问新闻频道和查看收藏列表；
7. 收藏、点赞、评论和搜索历史均使用本地缓存保存，重启小程序后仍可保留。

---

## 二、实验步骤与关键实现

### 1. 项目初始化与页面配置

使用微信开发者工具创建原生小程序工程，按功能划分出 `index`、`detail`、`search`、`my` 和 `custom-tab-bar` 目录。全局配置中注册四个页面，并启用自定义 tabBar：

```json
{
  "pages": ["index/index", "detail/detail", "my/my", "search/search"],
  "window": {
    "navigationBarBackgroundColor": "#d71920",
    "navigationBarTextStyle": "white",
    "navigationBarTitleText": "海大新闻"
  },
  "tabBar": {
    "custom": true,
    "list": [
      {"pagePath": "index/index", "text": "首页"},
      {"pagePath": "my/my", "text": "我的"}
    ]
  }
}
```

自定义 tabBar 只保留“首页”和“我的”两个高频入口；搜索和详情使用页面跳转打开，避免底部导航承担过多功能。

### 2. 构建本地新闻数据模块

在 `utils/common.js` 中集中保存新闻数据，每条新闻包含编号、标题、分类、封面、作者、来源、原文链接、正文和发布日期。页面不直接维护新闻内容，而是通过工具模块读取数据，这样首页、搜索页、详情页可以复用同一份数据。

```js
function getNewsDetail(newsID) {
  for (var i = 0; i < news.length; i++) {
    if (newsID === news[i].id) return { code: '200', news: news[i] }
  }
  return { code: '404', news: {} }
}
```

新闻图片统一存放在 `images` 目录中，使用 `/images/文件名` 的绝对小程序路径引用。这样可避免网络图片加载失败，也便于离线演示。

### 3. 首页新闻展示与分类筛选

首页加载时先获得完整新闻列表，再生成焦点轮播列表和普通新闻列表。频道点击后调用统一筛选方法，根据当前分类和输入关键词生成页面所需列表：

```js
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
}
```

页面使用 `swiper` 呈现焦点新闻，使用 `wx:for` 渲染新闻列表。普通新闻卡片还加入了左滑收藏操作：通过记录触摸起点和位移判断左右滑动，达到阈值后露出收藏按钮，避免与正常点击进入详情的操作冲突。

### 4. 实现搜索与搜索历史

搜索页绑定输入框的 `bindinput` 事件，实现边输入边检索；检索结果匹配标题、正文、作者、来源和新闻分类。多个关键词以空格分隔时，只有同时匹配全部关键词的新闻才会显示。

```js
function searchNews(keyword) {
  const words = (keyword || '').trim().toLowerCase().split(/\s+/).filter(function (w) {
    return w.length > 0
  })
  if (words.length === 0) return getNewsList()
  return news.filter(function (item) {
    const text = (item.title + ' ' + item.content + ' ' + item.author + ' ' + item.source + ' ' + item.category).toLowerCase()
    return words.every(function (w) { return text.indexOf(w) >= 0 })
  })
}
```

用户登录后，确认搜索或点击搜索结果时会将关键词写入本地缓存。历史记录自动去重，最多保留十条，并提供一键清空功能。

### 5. 新闻详情与阅读体验

详情页通过 URL 参数 `id` 查询新闻数据。如果编号无效，则显示“没有找到这篇新闻”的空状态。正文按空行拆分为段落，第一段的“本站讯”会单独标红，增强阅读层次：

```js
const paragraphs = result.news.content.split(/\n\s*\n/).filter(function (text) {
  return text.trim().length > 0
}).map(function (text, index) {
  const cleanText = text.trim()
  const hasLead = index === 0 && /^本站讯\s*/.test(cleanText)
  return {
    id: index,
    hasLead: hasLead,
    text: hasLead ? cleanText.replace(/^本站讯\s*/, '') : cleanText
  }
})
```

详情页采用“标题首屏 - 新闻影像 - 阅读正文 - 互动讨论”的结构。标题区展示栏目、作者、来源和发布时间；正文提供小、中、大三档字号；封面图使用本地素材并配合说明标签。页面还使用红金色、宋体标题、阅读卡片和轻量动画营造高校融媒体专题报道的视觉效果。

### 6. 本地持久化互动功能

收藏数据保存在 `favoriteNews`，搜索历史保存在 `searchHistory`，点赞和评论数据保存在 `newsInteractions`。互动数据以“新闻编号 - 互动记录”的方式组织，便于按新闻单独读取和修改。

```js
function getInteraction(newsID) {
  const local = readInteractions()[newsID] || {}
  return {
    liked: !!local.liked,
    likes: local.liked ? 1 : 0,
    favorites: isFavorite(newsID) ? 1 : 0,
    comments: Array.isArray(local.comments) ? local.comments : []
  }
}

function addCommentRecord(newsID, comment) {
  const all = readInteractions()
  const local = all[newsID] || {}
  const comments = Array.isArray(local.comments) ? local.comments : []
  comments.unshift(comment)
  local.comments = comments
  all[newsID] = local
  writeInteractions(all)
  return comments
}
```

未登录时，收藏、点赞和评论区域显示登录引导；登录后即可设置头像昵称并完成互动。评论支持回复、点赞及删除，个人中心会汇总个人点赞数、评论数和收藏数。

### 7. 个人中心与资料编辑

“我的”页面使用条件渲染分别展示未登录状态和登录状态。用户点击头像或昵称后，可在底部弹层中通过 `chooseAvatar` 选择头像，并输入昵称；确认后使用 `wx.setStorageSync` 保存资料。

页面还包括回信专题入口、新闻分类快捷入口、学习空间模块以及“我的收藏”列表。点击收藏条目可以直接回到对应详情页，实现个人中心与新闻内容的联动。

### 8. 页面美化与适配

项目使用 `rpx` 作为主要尺寸单位，结合 flex 布局、圆角卡片、阴影、渐变和响应式媒体查询实现移动端适配。首页使用红色品牌头部和启动页；详情页突出长文阅读；个人中心采用数据概览与功能宫格布局。图片设置 `aspectFill` 或 `widthFix`，保证不同尺寸的素材能够稳定展示。

---

## 三、运行与测试结果

使用微信开发者工具导入项目根目录后，点击“编译”即可运行。测试时重点验证了以下场景：

| 测试项 | 预期结果 | 测试结果 |
| :- | :- | :- |
| 首页启动页与轮播 | 启动页可关闭，焦点新闻可进入详情 | 通过 |
| 分类筛选 | 点击频道后仅显示对应分类新闻 | 通过 |
| 搜索 | 输入关键词后即时显示匹配新闻 | 通过 |
| 详情阅读 | 可显示封面、正文和三档字号 | 通过 |
| 收藏与点赞 | 登录后可切换状态，返回页面后状态仍保留 | 通过 |
| 评论与回复 | 可发布评论、回复、点赞和删除评论 | 通过 |
| 搜索历史 | 登录后自动保存、去重并可清空 | 通过 |
| 个人资料 | 可设置头像昵称，退出后恢复未登录状态 | 通过 |

项目目录结构如下：

```text
狼崽003/
├─ index/              # 首页
├─ detail/             # 新闻详情与互动
├─ search/             # 搜索与历史记录
├─ my/                 # 个人中心
├─ custom-tab-bar/     # 自定义底部导航
├─ images/             # 本地新闻图片与图标
├─ utils/common.js     # 新闻数据和本地缓存工具
├─ app.json            # 全局页面与导航配置
└─ project.config.json # 微信开发者工具配置
```

---

## 四、问题总结与体会

### 1. 页面之间的数据如何同步

**问题**：收藏新闻后，首页、新闻详情和“我的”页面都需要立即反映最新状态。

**解决**：将收藏和互动状态统一放在 `utils/common.js` 中读写，并在页面的 `onShow` 生命周期中刷新数据。例如首页刷新收藏标记，个人中心重新读取收藏列表和互动统计。

**体会**：多页面共享状态时，应集中管理数据入口，避免每个页面各自维护一份状态而产生不一致。

### 2. 点击与滑动手势冲突

**问题**：首页新闻卡片既要支持点击查看详情，又要支持左滑收藏，容易出现滑动后误触详情。

**解决**：记录触摸起点、横纵向位移和当前卡片索引；当横向位移超过阈值时标记为滑动，并在短暂时间内屏蔽点击事件。

**体会**：涉及复合手势时，必须同时判断方向、距离和事件时序，不能只依赖单个事件。

### 3. 互动数据需要在重启后保留

**问题**：仅用页面 `data` 保存点赞、收藏和评论，重新进入页面后数据会丢失。

**解决**：使用 `wx.getStorageSync` 和 `wx.setStorageSync` 存储新闻互动记录、收藏列表和搜索历史。

**体会**：对不需要服务器同步的课程项目，本地缓存可以快速实现持久化；如果后续接入真实业务，则应将该模块替换为后端接口并处理登录态和并发问题。

### 4. 长新闻正文的阅读体验

**问题**：新闻正文较长，直接堆放文字会显得单调且难以阅读。

**解决**：按空行拆分段落，使用首行缩进、较大的行高和宋体标题，并增加封面图、栏目标签、元信息、字号切换和独立互动区。

**体会**：资讯类产品的核心不是堆叠功能，而是让用户能够舒适地阅读内容；字体、留白、层次和信息密度都会影响体验。

---

## 五、收获与建议

通过本实验，我进一步熟悉了原生微信小程序中页面路由、组件事件、列表渲染、条件渲染、触摸事件、生命周期和本地缓存的使用方法，并能将多个页面组织成一个完整的资讯阅读流程。

在界面实现方面，我掌握了基于 `rpx`、flex 布局、卡片、渐变和动画进行移动端视觉设计的方法；在功能实现方面，我理解了将新闻数据、收藏、评论、搜索历史等可复用逻辑抽离到工具模块的重要性。

后续可以继续接入新闻接口和后端数据库，实现真实账号体系、跨设备同步、服务端评论审核、新闻分页加载和消息通知等功能，使该项目从本地演示型小程序逐步演进为可投入使用的校园资讯平台。
