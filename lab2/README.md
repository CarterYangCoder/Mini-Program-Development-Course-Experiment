# 实验2：名片小程序

<center>姓名：杨思睿</center>　<center>学号：24020007146</center>

| 项目 | 内容 |
| :-: | :-: |
| 姓名和学号 | 杨思睿 24020007146 |
| 本实验属于哪门课程 | 中国海洋大学26夏《移动软件开发》 |
| 实验名称 | 实验2：名片小程序 |
| 博客地址 | [CSDN 博客](https://blog.csdn.net/2401_87694000/article/details/164055472) |
| 代码仓库地址 | https://github.com/CarterYangCoder/Mini-Program-Development-Course-Experiment.git |

---

## 一、项目简介

使用微信开发者工具创建一个简单的个人介绍（名片）小程序页面，熟悉微信小程序开发流程。

**功能特性：**

- 顶部自定义导航栏，显示标题；
- 一张个人介绍图片；
- 个人姓名、学校专业等文字介绍；
- 若干条个人信息卡片，座右铭卡片浅蓝底突出显示；
- 页面支持上下滑动，内容超出屏幕时可正常浏览；
- 页面整体美观、清爽。

## 二、项目结构

```
lab2/
├── app.js                            # 小程序入口逻辑
├── app.json                          # 全局配置：自定义导航栏
├── app.wxss                          # 全局样式
├── components/
│   └── navigation-bar/               # 自定义导航栏组件
├── image/
│   ├── 1.jpg                         # 效果截图
│   └── intro.png                     # 个人介绍图片
└── pages/
    └── index/
        ├── index.wxml                # 页面结构
        ├── index.wxss                # 页面样式
        ├── index.js                  # 页面逻辑
        └── index.json                # 页面配置
```

## 三、关键实现

### 1. 配置自定义导航栏

在 `app.json` 中开启自定义导航栏：

```json
"window": {
  "navigationBarTextStyle": "black",
  "navigationStyle": "custom"
}
```

在 `pages/index/index.json` 中注册组件：

```json
"usingComponents": {
  "navigation-bar": "/components/navigation-bar/navigation-bar"
}
```

页面中使用并设置标题：

```xml
<navigation-bar title="个人名片" back="{{false}}"></navigation-bar>
```

### 2. 添加个人介绍图片

```xml
<image class="intro-image" mode="widthFix" src="../../image/intro.png"></image>
```

```css
.intro-image {
  width: 100%;
  display: block;
}
```

> **注意**：图片最初为中文文件名 `我的个人介绍.png`，编译时被 URL 编码后找不到文件报错 `ENOENT`。重命名为英文 `intro.png` 并同步修改引用路径后恢复正常。小程序资源文件应使用英文命名。

### 3. 文字内容排版

用 `view` 和 `text` 将姓名、专业、个人信息组织成卡片列表：

```xml
<view class="card-list">
  <view class="card">
    <text class="card-title">日常泄密</text>
    <text class="card-text">学的是保密技术，但自己最常泄密的时刻是——"我这周一定要早睡"</text>
  </view>
  ...
</view>
```

### 4. 实现页面滚动

图片和文字内容包裹在 `<scroll-view>` 中实现上下滑动：

```css
page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.scrollarea {
  flex: 1;
  overflow-y: auto;
}
```

### 5. 页面美化

- 使用 `rpx` 作为响应式单位；
- 卡片采用白底、圆角、阴影，营造清爽层次感；
- 标题与卡片小标题加粗；
- 座右铭卡片使用浅蓝色背景突出。

## 四、踩坑记录

| 问题 | 原因 | 解决方法 |
| :-: | :-- | :-- |
| 图片加载报错 `ENOENT` | 中文文件名被 URL 编码后找不到文件 | 重命名为英文 `intro.png` 并更新引用路径 |
| 图片被拉伸变形 | `mode` 属性写成大写 `WidthFix` | 改为正确的 `widthFix`，并设 `width: 100%` 等比缩放 |
| 页面无法滑动 | 内容超出屏幕但未使用滚动容器 | 用 `<scroll-view scroll-y>` 包裹内容并占满剩余高度 |
| 加入 scroll-view 后黑屏 | `<view class="content">` 缺少闭合标签导致 WXML 解析异常 | 补全 `</view>` 标签；出现黑白屏优先检查标签闭合 |

## 五、运行效果

![小程序页面效果](./image/1.jpg)

## 六、运行方式

使用微信开发者工具「导入项目」，选择本目录（`lab2`）即可打开编译运行。
