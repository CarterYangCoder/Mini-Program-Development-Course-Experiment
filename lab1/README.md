# 实验1：第一个微信小程序

<center>姓名：杨思睿</center>　<center>学号：24020007146</center>

| 项目 | 内容 |
| :-: | :-: |
| 姓名和学号 | 杨思睿 24020007146 |
| 本实验属于哪门课程 | 中国海洋大学26夏《移动软件开发》 |
| 实验名称 | 实验1：第一个微信小程序 |
| 博客地址 | [CSDN 博客](https://blog.csdn.net/2401_87694000/article/details/164054964) |
| 代码仓库地址 | https://github.com/CarterYangCoder/Mini-Program-Development-Course-Experiment.git |

---

## 一、项目简介

熟悉微信开发者工具的基本操作，理解微信小程序的项目结构与文件组成，掌握页面（WXML / WXSS / JS / JSON）的开发流程，并在此基础上完成一个带有交互效果的 "Hello World" 小程序。

**功能特性：**

- 🌸 / 🐺 女生、男生双主题一键切换：背景渐变、标题文案、emoji、语录整套替换；
- 点击语录卡片，按顺序循环轮换显示当前主题下的 5 条暖心语录；
- 渐变背景 + flex 弹性布局居中 + 半透明圆角卡片 + 按钮按压反馈（`:active` 缩放/变亮）。

## 二、实验环境

- 操作系统：Windows 11
- 开发工具：微信开发者工具（Skyline 渲染引擎、glass-easel 组件框架）

## 三、项目结构

```
lab1/
├── app.js                            # 小程序入口逻辑
├── app.json                          # 全局配置：注册页面、开启 Skyline 与自定义导航栏
├── app.wxss                          # 全局样式
├── components/
│   └── navigation-bar/               # 自定义导航栏组件
└── pages/
    └── index/
        ├── index.wxml                # 页面结构
        ├── index.wxss                # 页面样式
        ├── index.js                  # 页面逻辑：主题切换、语录轮换
        └── index.json                # 页面配置
```

## 四、关键实现

### 1. 页面布局与美化

- 整页使用 `linear-gradient` 渐变背景（粉紫系 `#ff9a76 → #fbc2eb → #ffd1a9`），随主题在暖色系/冷色系间切换；
- flex 弹性布局居中，内容按 emoji → 标题 → 卡片 → 按钮的顺序排列；
- 语录放入半透明白色圆角卡片，按钮为白色胶囊形状。

### 2. 数据驱动的主题切换

把女生/男生两套主题抽成配置对象（`wording`、`emoji`、5 条语录），切换时通过 `setData` 一次性更新：

```javascript
onSwitch: function() {
  const key = this.data.isGirl ? 'boy' : 'girl'
  const theme = THEMES[key]
  this.setData({
    isGirl: key === 'girl',
    wording: theme.wording,
    emoji: theme.emoji,
    phrases: theme.phrases,
    phrase: theme.phrases[0],
    phraseIndex: 0
  })
}
```

### 3. 语录循环轮换

点击语录卡片，使用取模运算按顺序循环显示下一条语录；语录统一以感叹号结尾，中文用全角"！"、英文用半角"!"。

### 4. 布局修复要点

背景只铺满上半屏的原因是嵌套在 `scroll-view` 中时高度继承失效。修复方案：

```css
page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.scrollarea { height: 100%; }
.page { height: 100%; }
```

## 五、踩坑记录

| 问题 | 原因 | 解决方法 |
| :-: | :-- | :-- |
| 背景只铺上半屏 | 容器 `min-height: 100%` 在 `scroll-view` 中高度继承失效 | `page` 设 `height: 100vh` + flex，子容器显式 `height: 100%` |
| 卡片内文字与按钮重叠 | 元素缺少明确间距 | 统一用 `margin` 明确各块外边距，文字设为块级元素 |
| 页面内容空旷 | 内容太少 | 居中布局、放大 emoji、新增语录卡片丰富内容 |
| 中英文标点混用 | 中文语录误用半角感叹号 | 中文统一全角"！"，英文统一半角"!" |

## 六、运行效果

打开即展示渐变背景下的 "Hello girl!" 标题与一条暖心语录；点击「切换到男生」后页面整体变为冷色蓝青渐变，文案切换为 "Hello boy!"，emoji 由 🌸 变为 🐺，语录整套替换；点击语录卡片可循环查看当前主题下的 5 条语录。

## 七、运行方式

使用微信开发者工具「导入项目」，选择本目录（`lab1`）即可打开编译运行。
