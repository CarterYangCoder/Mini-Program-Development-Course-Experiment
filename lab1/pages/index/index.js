// index.js
const app = getApp()

const THEMES = {
  girl: {
    wording: 'girl',
    emoji: '🌸',
    phrases: [
      '今天也要元气满满哦！',
      '你笑起来真好看！',
      'Keep shining, girl!',
      'You are the best!',
      '好运正在赶来的路上！'
    ]
  },
  boy: {
    wording: 'boy',
    emoji: '🐺',
    phrases: [
      '冲就完事了！',
      '保持冷静，继续战斗！',
      'Stay hungry, stay foolish!',
      'Never give up!',
      '今天的你比昨天更强！'
    ]
  }
}

Page({
  data: {
    isGirl: true,
    wording: 'girl',
    emoji: '🌸',
    phrase: THEMES.girl.phrases[0],
    phraseIndex: 0
  },

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
  },

  onNextPhrase: function() {
    const theme = this.data.isGirl ? THEMES.girl : THEMES.boy
    const next = (this.data.phraseIndex + 1) % theme.phrases.length
    this.setData({
      phraseIndex: next,
      phrase: theme.phrases[next]
    })
  }
})
