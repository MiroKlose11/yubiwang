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
  onShareAppMessage() {
    let imageUrl = this.data.image;
    if (!imageUrl || !/^https:\/\//.test(imageUrl)) {
      imageUrl = 'https://www.yubi.wang/uploads/20250317/d909d692a5accd879333044a0a85c089.jpg';
    }
    return {
      title: this.data.title || '元生玉鼻',
      path: `/pages/article/videofullscreen?src=${encodeURIComponent(this.data.src)}&title=${encodeURIComponent(this.data.title || '')}&desc=${encodeURIComponent(this.data.desc || '')}&image=${encodeURIComponent(imageUrl)}&category=3`,
      imageUrl
    };
  },
  onShareTimeline() {
    let imageUrl = this.data.image;
    if (!imageUrl || !/^https:\/\//.test(imageUrl)) {
      imageUrl = 'https://www.yubi.wang/uploads/20250317/d909d692a5accd879333044a0a85c089.jpg';
    }
    return {
      title: this.data.title || '元生玉鼻',
      query: `src=${encodeURIComponent(this.data.src)}&title=${encodeURIComponent(this.data.title || '')}&desc=${encodeURIComponent(this.data.desc || '')}&image=${encodeURIComponent(imageUrl)}&category=3`,
      imageUrl
    };
  },
  onShow() {
    // 如果通过分享卡片带category参数进入，返回首页时带上category=3
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    if (current.options && current.options.category == 3) {
      this._returnToCategory3 = true;
    }
  }
}); 