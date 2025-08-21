// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null,
    bgm: null, // 全局音频实例
    // 域名配置
    host: 'https://img.yubi.wang',
    // 全局图片处理方法
    processImageUrl(url) {
      if (!url) return '';
      
      // 如果是相对路径，添加域名前缀
      if (url.startsWith('/uploads/')) {
        return `${this.host}${url}`;
      }
      
      // 如果是完整URL，直接返回
      return url;
    },
    // 替换富文本中的图片路径
    processRichTextImages(content) {
      if (!content) return '';
      
      // 替换相对路径图片
      return content.replace(/(src=["'])\/uploads\//g, `$1${this.host}/uploads/`);
    },
    forceCategory: null
  }
})
