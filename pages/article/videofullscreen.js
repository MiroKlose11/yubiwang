const { getVideoDetail } = require('../../utils/api');

Page({
  data: {
    src: '',
    title: '',
    desc: '',
    image: '',
    lastUpdate: ''
  },
  async onLoad(options) {
    console.log('videofullscreen onLoad', options);
    if (options.src) {
      const src = decodeURIComponent(options.src);
      this.setData({ src });
      console.log('准备请求接口', src);
      // 1. 先查本地缓存
      const cacheKey = 'video_cache_' + src;
      const cache = wx.getStorageSync(cacheKey) || null;
      // 2. 如果有缓存，先显示缓存内容
      if (cache) {
        this.setData({
          title: cache.title,
          desc: cache.desc,
          image: cache.image,
          src: cache.src
        });
      }
      // 3. 请求后端接口
      try {
        const res = await getVideoDetail(src); // 假设接口返回{code:1, data:{title,desc,image,src}}
        console.log('接口返回', res.data);
        console.log('本地缓存', cache);
        if (res.code === 1 && res.data) {
          const newData = {
            title: res.data.title,
            desc: res.data.desc,
            image: res.data.image,
            src: res.data.src || src
          };
          // 4. 与缓存内容对比，有变化才刷新
          if (!cache || cache.title !== newData.title || cache.desc !== newData.desc || cache.image !== newData.image || cache.src !== newData.src) {
            this.setData(newData);
            wx.setStorageSync(cacheKey, newData);
          }
        }
      } catch (e) {
        // 网络异常时用缓存
      }
    } else {
      console.log('缺少src参数', options);
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