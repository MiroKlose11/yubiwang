// pages/invitation/invitation.js
const { getArticleDetail } = require('../../utils/api');

Page({
  data: {
    images: [], // 图片列表，从文章详情中获取
    current: 0,
    imageLoaded: [], // 图片加载状态
    showScrollTip: true, // 是否显示滑动提示
    musicPlaying: false, // 音乐播放状态
    bgm: null, // 背景音乐实例
    articleId: null, // 文章ID
    title: '', // 文章标题
    description: '', // 文章描述
    showInfo: false, // 是否显示信息
  },

  onLoad: function (options) {
    // 隐藏导航栏返回按钮
    wx.hideHomeButton();
    
    // 获取文章ID
    if (options.id) {
      this.setData({ articleId: options.id });
      this.loadArticleDetail(options.id);
    }

    // 支持通过URL参数动态传入图片列表（备用方案）
    if (options.images) {
      try {
        const newImages = JSON.parse(decodeURIComponent(options.images));
        this.setData({
          images: newImages,
          imageLoaded: new Array(newImages.length).fill(false)
        });
        this.initPage();
      } catch (e) {
        console.error("解析图片列表失败", e);
      }
    }

    // 初始化背景音乐
    this.initBackgroundMusic();
  },

  // 加载文章详情
  async loadArticleDetail(articleId) {
    try {
      wx.showLoading({ title: '加载中...' });
      const res = await getArticleDetail(articleId);
      
      if (res && res.data) {
        const article = res.data;
        
        // 只从文章content字段中提取图片
        let images = [];
        
        if (article.content) {
          const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
          let match;
          while ((match = imgRegex.exec(article.content)) !== null) {
            if (match[1]) {
              let imageUrl = match[1];
              if (imageUrl.startsWith('/uploads/')) {
                imageUrl = `https://www.yubi.wang${imageUrl}`;
              }
              images.push(imageUrl);
            }
          }
        }

        console.log('从content中提取到的图片列表:', images);

        // 处理分享图片路径
        let shareImage = article.image || '';
        if (shareImage && shareImage.startsWith('/uploads/')) {
          shareImage = `https://www.yubi.wang${shareImage}`;
        }

        this.setData({
          images: images,
          imageLoaded: new Array(images.length).fill(false),
          title: article.title || '',
          description: article.description || '',
          showInfo: !!(article.title || article.description),
          shareImage: shareImage // 用于分享的图片，只使用image字段
        });

        // 设置导航栏标题为文章标题
        if (article.title) {
          wx.setNavigationBarTitle({
            title: article.title
          });
        }

        this.initPage();
      }
    } catch (error) {
      console.error('加载文章详情失败', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 初始化页面
  initPage() {
    // 移除预加载，云存储图片加载速度快，不需要预加载

    // 3秒后隐藏滑动提示
    setTimeout(() => {
      this.setData({
        showScrollTip: false
      });
    }, 3000);
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





  // 滑动切换
  bindchange: function(e) {
    const current = e.detail.current;
    this.setData({ current });
  },

  /**
   * 用户点击右上角分享 - 转发给朋友
   */
  onShareAppMessage() {
    const { description, shareImage, articleId } = this.data;
    
    return {
      title: description || '邀请函',
      path: `/pages/invitation/invitation?id=${articleId}`,
      imageUrl: shareImage,
      success: (res) => {
        wx.showToast({
          title: '分享成功',
          icon: 'success'
        });
      },
      fail: (res) => {
        console.log('分享失败', res);
      }
    };
  },

  /**
   * 用户点击右上角分享到朋友圈
   */
  onShareTimeline() {
    const { description, shareImage, articleId } = this.data;
    
    return {
      title: description || '邀请函',
      query: `id=${articleId}`,
      imageUrl: shareImage
    };
  }
}); 