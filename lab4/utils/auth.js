var USER_KEY = 'boxgame_current_user'

function getUser() {
  return wx.getStorageSync(USER_KEY) || null
}

function saveUser(user) {
  wx.setStorageSync(USER_KEY, user)
  return user
}

function logout() {
  wx.removeStorageSync(USER_KEY)
}

function createUserId(nickname) {
  var text = (nickname || '').trim().toLowerCase()
  var hash = 0
  for (var i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  }
  return 'player_' + Math.abs(hash)
}

function userKey(prefix, user) {
  return prefix + '_' + (user && user.id ? user.id : 'guest')
}

function getBest(level, user) {
  if (!user) return 0
  return wx.getStorageSync(userKey('boxgame_best_' + level, user)) || 0
}

function setBest(level, steps, user) {
  if (!user) return false
  var key = userKey('boxgame_best_' + level, user)
  var oldBest = wx.getStorageSync(key) || 0
  if (!oldBest || steps < oldBest) {
    wx.setStorageSync(key, steps)
    return true
  }
  return false
}

function getHistory(user) {
  if (!user) return []
  return wx.getStorageSync(userKey('boxgame_history', user)) || []
}

function addHistory(user, record) {
  if (!user) return
  var key = userKey('boxgame_history', user)
  var list = wx.getStorageSync(key) || []
  list.unshift(record)
  if (list.length > 100) list = list.slice(0, 100)
  wx.setStorageSync(key, list)
}

module.exports = {
  getUser: getUser,
  saveUser: saveUser,
  logout: logout,
  createUserId: createUserId,
  getBest: getBest,
  setBest: setBest,
  getHistory: getHistory,
  addHistory: addHistory
}
