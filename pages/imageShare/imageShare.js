// pages/imageShare/imageShare.js
Page({
  data: {
    images: [
      "https://img.yubi.wang/uploads/20250725/b2b1cad035fca75805b61b12c5099a1f.jpg",
      "https://img.yubi.wang/uploads/20250725/46ad368915faee9bb9457fd56a85adc2.jpg",
      "https://img.yubi.wang/uploads/20250725/c69b82f916e595059103e9d70bc9c07b.jpg",
      "https://img.yubi.wang/uploads/20250725/f74acce5fead0c02f1376ce0f34e8099.jpg",
      "https://img.yubi.wang/uploads/20250725/22fce2d643e0b656e2b854d010b5e271.jpg",
      "https://img.yubi.wang/uploads/20250725/1949d36b84b95dd0f08bdd2e15ea2ec2.jpg",
      "https://img.yubi.wang/uploads/20250725/c3fc0b82da3a914947243b2c41c127bf.jpg",
      "https://img.yubi.wang/uploads/20250725/e3280f0b35de18dca70f5a09e79378dd.jpg"
    ],
    current: 0,

    showScrollTip: true, // 是否显示滑动提示
    musicPlaying: false, // 音乐播放状态
    bgm: null, // 背景音乐实例
  },

  onLoad: function (options) {
    // 隐藏导航栏返回按钮
    wx.hideHomeButton();
    
    // 支持通过URL参数动态传入图片列表
    if (options.images) {
      try {
        const newImages = JSON.parse(decodeURIComponent(options.images));
        this.setData({
          images: newImages
        });
      } catch (e) {
        console.error("解析图片列表失败", e);
      }
    }

    // 3秒后隐藏滑动提示
    setTimeout(() => {
      this.setData({
        showScrollTip: false
      });
    }, 3000);

    // 初始化背景音乐
    this.initBackgroundMusic();
  },

  onShow: function() {
    // 页面显示时重新显示滑动提示（如果是第一张图片）
    if (this.data.current === 0) {
      this.setData({
        showScrollTip: true
      });
      setTimeout(() => {
        this.setData({
          showScrollTip: false
        });
      }, 3000);
    }

    // 恢复音乐播放
    if (this.data.musicPlaying && this.data.bgm) {
      this.data.bgm.play();
    }
  },

  onHide: function() {
    // 页面隐藏时暂停音乐
    if (this.data.bgm) {
      this.data.bgm.pause();
    }
  },

  onUnload: function() {
    // 页面卸载时销毁音乐
    if (this.data.bgm) {
      this.data.bgm.destroy();
    }
  },

  // 初始化背景音乐
  initBackgroundMusic: function() {
    const bgm = wx.createInnerAudioContext();
    bgm.src = 'https://yubiwang-1360563549.cos.ap-chengdu.myqcloud.com/uploads/20250725/660f4f69d301b.mp3';
    bgm.loop = true;
    bgm.volume = 0.6;
    
    this.setData({ bgm });

    // 监听音乐播放事件
    bgm.onPlay(() => {
      console.log('音乐开始播放');
      this.setData({ musicPlaying: true });
    });

    bgm.onPause(() => {
      console.log('音乐暂停');
      this.setData({ musicPlaying: false });
    });

    bgm.onError((err) => {
      console.error('音乐播放错误:', err);
    });

    bgm.onCanplay(() => {
      console.log('音乐可以播放了');
      // 自动开始播放
      setTimeout(() => {
        bgm.play();
      }, 500);
    });
  },

  // 切换音乐播放状态
  toggleMusic: function() {
    const { bgm, musicPlaying } = this.data;
    if (!bgm) return;

    if (musicPlaying) {
      bgm.pause();
      wx.showToast({
        title: '音乐已暂停',
        icon: 'none',
        duration: 1000
      });
    } else {
      bgm.play();
      wx.showToast({
        title: '音乐已开启',
        icon: 'none',
        duration: 1000
      });
    }
  },

  // 切换图片时更新当前索引
  bindchange: function (e) {
    const current = e.detail.current;
    this.setData({
      current: current,
      showScrollTip: false // 用户滑动后隐藏提示
    });
  },



  // 微信分享配置
  onShareAppMessage: function () {
    const isLastImage = this.data.current === this.data.images.length - 1;
    
    // 如果是最后一张图片（二维码），使用特殊的分享文案
    const shareTitle = isLastImage 
      ? "2025第三届鲁脂道学术年会 - 长按识别二维码" 
      : "2025第三届鲁脂道学术年会";
    
    return {
      title: shareTitle,
      path: `/pages/imageShare/imageShare?images=${encodeURIComponent(JSON.stringify(this.data.images))}`,
      imageUrl: 'https://img.yubi.wang/uploads/20250725/98e94837af3779fdf703f7895e4acee5.jpg',
      success: function () {
        wx.showToast({
          title: '分享成功',
          icon: 'success'
        });
      },
      fail: function() {
        wx.showToast({
          title: '分享取消',
          icon: 'none'
        });
      }
    };
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    const isLastImage = this.data.current === this.data.images.length - 1;
    
    // 如果是最后一张图片（二维码），使用特殊的分享文案
    const shareTitle = isLastImage 
      ? "2025第三届鲁脂道学术年会 - 长按识别二维码" 
      : "2025第三届鲁脂道学术年会";
    
    return {
      title: shareTitle,
      query: `images=${encodeURIComponent(JSON.stringify(this.data.images))}`,
      imageUrl: 'https://img.yubi.wang/uploads/20250725/98e94837af3779fdf703f7895e4acee5.jpg'
    };
  }
});