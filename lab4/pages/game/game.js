// pages/game/game.js
var data = require('../../utils/data.js')
var auth = require('../../utils/auth.js')

var MAP_SIZE = 8
var ANIM_DUR = 130

Page({
  /**
   * 页面的初始数据
   */
  data: {
    level: 1,
    steps: 0,
    best: 0,
    canvasSize: 320,
    canUndo: false,
    user: null,
    goalsDone: 0,
    goalsTotal: 0
  },

  /**
   * 生命周期函数 -- 监听页面加载
   */
  onLoad: function (options) {
    this.user = auth.getUser()
    if (!this.user) {
      wx.reLaunch({ url: '/pages/start/start' })
      return
    }
    // 获取关卡（0 ~ 3），非法参数回退到第 1 关
    var level = parseInt(options.level)
    if (isNaN(level) || level < 0) level = 0
    this.levelIndex = level

    // 根据屏幕宽度计算画布尺寸
    var info
    try {
      info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    } catch (e) {
      info = wx.getSystemInfoSync()
    }
    var size = Math.min(info.windowWidth - 56, 340)
    if (size < 240) size = 240

    this.setData({
      level: level + 1,
      best: auth.getBest(level, this.user),
      user: this.user,
      canvasSize: size
    })
    wx.setNavigationBarTitle({ title: '推箱子 · 第 ' + (level + 1) + ' 关' })
  },

  /**
   * 生命周期函数 -- 监听页面初次渲染完成
   */
  onReady: function () {
    this.initCanvas()
  },

  /**
   * 自定义函数 -- 初始化画布（2d 接口，按设备像素比高清绘制）
   */
  initCanvas: function () {
    var that = this
    wx.createSelectorQuery()
      .select('#myCanvas')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) return
        var canvas = res[0].node
        var ctx = canvas.getContext('2d')
        var dpr = that.getDpr()
        var size = res[0].width
        canvas.width = size * dpr
        canvas.height = size * dpr
        ctx.scale(dpr, dpr)

        that.canvas = canvas
        that.ctx = ctx
        that.cell = size / MAP_SIZE

        that.loadImages(function () {
          that.initMap(that.levelIndex)
          that.drawCanvas()
        })
      })
  },

  /**
   * 自定义函数 -- 获取设备像素比
   */
  getDpr: function () {
    try {
      if (wx.getWindowInfo) return wx.getWindowInfo().pixelRatio || 2
    } catch (e) {}
    return wx.getSystemInfoSync().pixelRatio || 2
  },

  /**
   * 自定义函数 -- 预加载游戏图标
   */
  loadImages: function (cb) {
    var that = this
    var names = ['ice', 'stone', 'pig', 'box', 'bird']
    var imgs = {}
    var left = names.length
    names.forEach(function (n) {
      var img = that.canvas.createImage()
      img.onload = function () {
        imgs[n] = img
        if (--left === 0) { that.imgs = imgs; cb() }
      }
      img.onerror = function () {
        imgs[n] = null
        if (--left === 0) { that.imgs = imgs; cb() }
      }
      img.src = '/images/icons/' + n + '.png'
    })
  },

  /**
   * 自定义函数 -- 初始化地图数据
   */
  initMap: function (levelIndex) {
    var mapData = data.maps[levelIndex]
    var map = []
    var box = []
    for (var i = 0; i < MAP_SIZE; i++) {
      map[i] = []
      box[i] = []
      for (var j = 0; j < MAP_SIZE; j++) {
        box[i][j] = 0
        map[i][j] = mapData[i][j]
        if (mapData[i][j] === 4) {
          box[i][j] = 4
          map[i][j] = 2
        } else if (mapData[i][j] === 5) {
          map[i][j] = 2
          // 记录小鸟的当前行和列
          this.row = i
          this.col = j
        }
      }
    }
    this.map = map
    this.box = box
    this.steps = 0
    this.history = []
    // 渲染位置（用于移动动画）
    this.rp = { r: this.row, c: this.col }
    this.rb = null
    this.rbT = null
    this.anim = null
    this.winPending = false
    this.setData({ steps: 0, canUndo: false, goalsDone: 0, goalsTotal: this.countGoals() })
  },

  countGoals: function () {
    var total = 0
    for (var i = 0; i < MAP_SIZE; i++) {
      for (var j = 0; j < MAP_SIZE; j++) {
        if (this.map[i][j] === 3) total++
      }
    }
    return total
  },

  countGoalsDone: function () {
    var done = 0
    for (var i = 0; i < MAP_SIZE; i++) {
      for (var j = 0; j < MAP_SIZE; j++) {
        if (this.map[i][j] === 3 && this.box[i][j] === 4) done++
      }
    }
    return done
  },

  /**
   * 自定义函数 -- 绘制地图
   */
  drawCanvas: function () {
    var ctx = this.ctx
    if (!ctx || !this.imgs) return
    var cell = this.cell
    var size = cell * MAP_SIZE

    // 清空画布
    ctx.clearRect(0, 0, size, size)

    // 使用双重 for 循环绘制 8x8 的地图
    for (var i = 0; i < MAP_SIZE; i++) {
      for (var j = 0; j < MAP_SIZE; j++) {
        // 默认是道路
        var img = this.imgs.ice
        if (this.map[i][j] === 1) {
          img = this.imgs.stone
        } else if (this.map[i][j] === 3) {
          img = this.imgs.pig
        }
        if (img) ctx.drawImage(img, j * cell, i * cell, cell, cell)

        if (this.box[i][j] === 4) {
          // 叠加绘制箱子（正在动画中的箱子绘制在动画位置）
          var bx = j * cell
          var by = i * cell
          if (this.rb && this.rbT && this.rbT.r === i && this.rbT.c === j) {
            bx = this.rb.c * cell
            by = this.rb.r * cell
          }
          if (this.imgs.box) ctx.drawImage(this.imgs.box, bx, by, cell, cell)
          // 箱子已归位时叠加高亮提示
          if (this.map[i][j] === 3) {
            ctx.fillStyle = 'rgba(64, 200, 120, 0.32)'
            this.roundRect(ctx, bx + cell * 0.14, by + cell * 0.14, cell * 0.72, cell * 0.72, cell * 0.14)
            ctx.fill()
          }
        }
      }
    }

    // 叠加绘制小鸟（动画位置）
    if (this.imgs.bird) {
      ctx.drawImage(this.imgs.bird, this.rp.c * cell, this.rp.r * cell, cell, cell)
    }
  },

  /**
   * 自定义函数 -- 画圆角矩形路径
   */
  roundRect: function (ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  },

  /**
   * 自定义函数 -- 播放移动动画（时间缓动 + 逐帧重绘）
   */
  animate: function () {
    var that = this
    var a = this.anim
    if (!a) { this.drawCanvas(); return }
    this.animGen = (this.animGen || 0) + 1
    var gen = this.animGen
    var step = function () {
      // 已被更新的动画取代时终止旧循环
      if (gen !== that.animGen) return
      var t = (Date.now() - a.t0) / a.dur
      if (t >= 1) {
        that.rp = { r: a.pr, c: a.pc }
        that.rb = null
        that.anim = null
        that.drawCanvas()
        return
      }
      var e = 1 - (1 - t) * (1 - t) // easeOutQuad
      that.rp = {
        r: a.fromR + (a.pr - a.fromR) * e,
        c: a.fromC + (a.pc - a.fromC) * e
      }
      if (a.box) {
        that.rb = {
          r: a.box.fromR + (a.box.toR - a.box.fromR) * e,
          c: a.box.fromC + (a.box.toC - a.box.fromC) * e
        }
      }
      that.drawCanvas()
      that.canvas.requestAnimationFrame(step)
    }
    this.canvas.requestAnimationFrame(step)
  },

  /**
   * 自定义函数 -- 统一移动逻辑（dir: up/down/left/right）
   */
  move: function (dir) {
    var d = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[dir]
    if (!d || !this.map || this.winPending) return
    var r = this.row
    var c = this.col
    var nr = r + d[0]
    var nc = c + d[1]
    var map = this.map
    var box = this.box

    // 不在边界内不考虑移动
    if (nr < 0 || nr > MAP_SIZE - 1 || nc < 0 || nc > MAP_SIZE - 1) return

    var pushed = null
    if (box[nr][nc] === 4) {
      // 前方是箱子，箱子再前一格必须在边界内且不是墙或箱子
      var br = nr + d[0]
      var bc = nc + d[1]
      if (br < 0 || br > MAP_SIZE - 1 || bc < 0 || bc > MAP_SIZE - 1) return
      if (map[br][bc] === 1 || box[br][bc] === 4) return
      pushed = { fromR: nr, fromC: nc, toR: br, toC: bc }
    } else if (map[nr][nc] === 1) {
      // 前方是墙
      return
    }

    // 记录历史（用于撤销）
    this.history.push({
      row: r,
      col: c,
      box: box.map(function (rowArr) { return rowArr.slice() }),
      steps: this.steps
    })
    if (this.history.length > 300) this.history.shift()

    // 更新箱子与小鸟坐标
    if (pushed) {
      box[pushed.toR][pushed.toC] = 4
      box[pushed.fromR][pushed.fromC] = 0
      this.rbT = { r: pushed.toR, c: pushed.toC }
    } else {
      this.rbT = null
      this.rb = null
    }
    this.row = nr
    this.col = nc
    this.steps++

    // 启动动画
    this.anim = {
      t0: Date.now(),
      dur: ANIM_DUR,
      fromR: this.rp.r,
      fromC: this.rp.c,
      pr: nr,
      pc: nc,
      box: pushed
    }
    this.animate()

    // 震动反馈：推箱重、走路轻
    this.vibrate(pushed ? 'medium' : 'light')
    this.setData({ steps: this.steps, canUndo: this.history.length > 0, goalsDone: this.countGoalsDone() })

    // 检查游戏是否成功
    this.checkWin()
  },

  /**
   * 自定义函数 -- 方向键：上
   */
  up: function () { this.move('up') },

  /**
   * 自定义函数 -- 方向键：下
   */
  down: function () { this.move('down') },

  /**
   * 自定义函数 -- 方向键：左
   */
  left: function () { this.move('left') },

  /**
   * 自定义函数 -- 方向键：右
   */
  right: function () { this.move('right') },

  /**
   * 自定义函数 -- 棋盘滑动手势
   */
  touchStart: function (e) {
    var t = e.touches[0]
    this.touchX = t.clientX
    this.touchY = t.clientY
  },

  touchEnd: function (e) {
    if (this.touchX === undefined) return
    var t = e.changedTouches[0]
    var dx = t.clientX - this.touchX
    var dy = t.clientY - this.touchY
    this.touchX = undefined
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) {
      this.move(dx > 0 ? 'right' : 'left')
    } else {
      this.move(dy > 0 ? 'down' : 'up')
    }
  },

  /**
   * 自定义函数 -- 判断游戏是否成功
   */
  isWin: function () {
    // 使用双重 for 循环遍历整个数组
    for (var i = 0; i < MAP_SIZE; i++) {
      for (var j = 0; j < MAP_SIZE; j++) {
        // 如果有箱子没在终点，表示游戏尚未成功
        if (this.box[i][j] === 4 && this.map[i][j] !== 3) {
          return false
        }
      }
    }
    return true
  },

  /**
   * 自定义函数 -- 游戏成功处理
   */
  checkWin: function () {
    if (!this.isWin() || this.winPending) return
    this.winPending = true
    var that = this

    // 保存最佳纪录
    var isNewBest = auth.setBest(this.levelIndex, this.steps, this.user)
    auth.addHistory(this.user, {
      id: Date.now(),
      level: this.levelIndex + 1,
      steps: this.steps,
      isNewBest: isNewBest,
      time: this.formatTime(new Date())
    })

    // 等动画播完再弹出提示
    setTimeout(function () {
      that.vibrate('heavy')
      var isLast = that.levelIndex >= data.maps.length - 1
      that.setData({ best: auth.getBest(that.levelIndex, that.user) })
      wx.showModal({
        title: '恭喜',
        content: '第 ' + (that.levelIndex + 1) + ' 关完成！共用 ' + that.steps + ' 步' +
          (isLast ? '，已通关全部关卡！' : ''),
        confirmText: isLast ? '返回选关' : '下一关',
        cancelText: '再玩一次',
        success: function (res) {
          if (res.confirm) {
            if (isLast) {
              wx.navigateBack()
            } else {
              that.gotoLevel(that.levelIndex + 1)
            }
          } else {
            that.restartGame()
          }
        }
      })
    }, 380)
  },

  formatTime: function (date) {
    function pad(n) { return n < 10 ? '0' + n : '' + n }
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
  },

  /**
   * 自定义函数 -- 跳转到指定关
   */
  gotoLevel: function (levelIndex) {
    this.levelIndex = levelIndex
    wx.setNavigationBarTitle({ title: '推箱子 · 第 ' + (levelIndex + 1) + ' 关' })
    this.setData({
      level: levelIndex + 1,
      best: auth.getBest(levelIndex, this.user)
    })
    this.initMap(levelIndex)
    this.drawCanvas()
  },

  /**
   * 自定义函数 -- 重新开始游戏
   */
  restartGame: function () {
    this.vibrate('light')
    this.initMap(this.levelIndex)
    this.drawCanvas()
  },

  /**
   * 自定义函数 -- 撤销一步
   */
  undoMove: function () {
    var h = this.history && this.history.pop()
    if (!h) return
    this.row = h.row
    this.col = h.col
    this.box = h.box
    this.steps = h.steps
    this.rp = { r: this.row, c: this.col }
    this.rb = null
    this.rbT = null
    this.anim = null
    this.vibrate('light')
    this.setData({ steps: this.steps, canUndo: this.history.length > 0, goalsDone: this.countGoalsDone() })
    this.drawCanvas()
  },

  /**
   * 自定义函数 -- 返回选关
   */
  goBack: function () {
    wx.navigateBack()
  },

  /**
   * 自定义函数 -- 轻微震动反馈
   */
  vibrate: function (type) {
    try {
      wx.vibrateShort({ type: type || 'light', fail: function () {} })
    } catch (e) {}
  }
})
