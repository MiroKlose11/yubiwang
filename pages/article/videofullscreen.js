Page({
  data: {
    src: '',
    title: '',
    desc: '',
    image: ''
  },
  onLoad(options) {
    if (options.src) {
      this.setData({ src: decodeURIComponent(options.src) });
    }
    if (options.title) {
      this.setData({ title: decodeURIComponent(options.title) });
    }
    if (options.desc) {
      this.setData({ desc: decodeURIComponent(options.desc) });
    }
    if (options.image) {
      this.setData({ image: decodeURIComponent(options.image) });
    }
    // 参数兜底校验
    if (!options.src) {
      wx.showToast({
        title: '视频参数缺失，请重试',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  onUnload() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },
  onShareAppMessage() {
    return {
      title: this.data.title || '元生玉鼻',
      path: `/pages/article/videofullscreen?src=${encodeURIComponent(this.data.src)}&title=${encodeURIComponent(this.data.title || '')}&desc=${encodeURIComponent(this.data.desc || '')}`,
      imageUrl: this.data.image || ''
    };
  },
  onShareTimeline() {
    return {
      title: this.data.title || '元生玉鼻',
      query: `src=${encodeURIComponent(this.data.src)}&title=${encodeURIComponent(this.data.title || '')}&desc=${encodeURIComponent(this.data.desc || '')}`,
      imageUrl: this.data.image || ''
    };
  }
}); 