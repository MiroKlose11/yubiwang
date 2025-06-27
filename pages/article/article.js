// 文章详情页
const { getArticleDetail } = require('../../utils/api');
const { formatTime } = require('../../utils/util');

// 获取应用实例
const app = getApp();

// 服务器域名
const HOST = 'https://www.yubi.wang';

// 默认图片 - 用于分享
const DEFAULT_IMAGE = 'https://www.yubi.wang/uploads/20250317/d909d692a5accd879333044a0a85c089.jpg';

Page({
  data: {
    articleId: null,
    article: null,
    loading: true,
    content: '',
    error: false,
    specialImage: '', // 单独的特殊图片(二维码等)
    hasSpecialImage: false, // 是否有特殊图片
    imageList: [], // 存储文章中的所有图片URL
    onlyVideo: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({
        articleId: options.id
      });
      this.loadArticleDetail(options.id);
    } else {
      this.setData({
        loading: false,
        error: true
      });
      wx.showToast({
        title: '文章ID无效',
        icon: 'none'
      });
    }
  },

  /**
   * 加载文章详情
   */
  async loadArticleDetail(articleId) {
    try {
      const res = await getArticleDetail(articleId);
      if (res.code === 1 && res.data) {
        let articleData = res.data;
        
        // 处理时间
        if (articleData.publishtime) {
          articleData.createTime = formatTime(new Date(parseInt(articleData.publishtime) * 1000));
        }
        
        // 处理图片路径
        if (articleData.image && articleData.image.startsWith('/uploads/')) {
          articleData.image = `${HOST}${articleData.image}`;
        } 
        
        // 处理分享图片
        if (articleData.share_image && articleData.share_image.startsWith('/uploads/')) {
          articleData.share_image = `${HOST}${articleData.share_image}`;
        }
        
        // 处理特殊图片(二维码等)
        let specialImage = '';
        let hasSpecialImage = false;
        
        if (articleData.images) {
          // 处理images字段，这是后端返回的特殊图片
          specialImage = articleData.images;
          
          // 确保图片路径完整
          if (specialImage.startsWith('/uploads/')) {
            specialImage = `${HOST}${specialImage}`;
          }
          
          hasSpecialImage = !!specialImage;
        }
        
        // 提取文章中的第一张图片用于分享
        let firstImage = '';
        if (articleData.content) {
          // 替换图片路径
          let content = articleData.content.replace(/src="\/uploads\//g, `src="${HOST}/uploads/`);
          
          // 提取文章中的第一张图片URL用于分享
          const imgRegex = /<img[^>]*src=["']([^"']*)["'][^>]*>/i;
          const match = imgRegex.exec(content);
          if (match && match[1]) {
            firstImage = match[1];
          }
          
          // 提取文章中的所有图片URL
          let imageList = [];
          const imgRegexAll = /<img[^>]*src=["']([^"']*)["'][^>]*>/gi;
          let matchAll;
          
          while ((matchAll = imgRegexAll.exec(content)) !== null) {
            if (matchAll[1]) {
              imageList.push(matchAll[1]);
            }
          }
          
          // 添加样式
          content = content.replace(/<img([^>]*)>/gi, (match, attrs) => {
            return `<img ${attrs} style="max-width:100%;height:auto;display:block;margin:10rpx auto;">`;
          });
          
          articleData.content = content;
          
          // 更新图片列表
          this.setData({
            imageList: imageList
          });
        }
        
        // 处理富文本内容和视频
        if (articleData.content) {
          const { contentBlocks, imageList } = this.processContentWithVideo(articleData.content);
          this.setData({ imageList });
          await this.setVideoAspectRatios(contentBlocks);
          // 判断是否只有一个竖版视频且其它内容全为空
          const videoBlocks = contentBlocks.filter(block => block.type === 'video');
          const htmlBlocksEmpty = contentBlocks
            .filter(block => block.type === 'html')
            .every(block => (block.html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, '') === '');
          if (
            videoBlocks.length === 1 &&
            htmlBlocksEmpty &&
            videoBlocks[0].aspectClass === 'aspect-9-16'
          ) {
            // 跳转前打印参数日志
            console.log('跳转全屏参数', videoBlocks[0].src, articleData.title, articleData.description);
            wx.navigateTo({
              url: `/pages/article/videofullscreen?src=${encodeURIComponent(videoBlocks[0].src)}&title=${encodeURIComponent(articleData.title || '')}&desc=${encodeURIComponent(articleData.description || '')}&image=${encodeURIComponent(articleData.image || '')}`
            });
            return;
          }
          this.setData({ onlyVideo: false });
        } else {
          this.setData({ contentBlocks: [], onlyVideo: false });
        }
        
        this.setData({
          article: articleData,
          loading: false,
          specialImage: specialImage,
          hasSpecialImage: hasSpecialImage,
          firstImage: firstImage
        });
        
        // 设置导航标题
        if (articleData.title) {
          wx.setNavigationBarTitle({
            title: articleData.title
          });
        }
        
      } else {
        this.setData({
          loading: false,
          error: true
        });
        wx.showToast({
          title: '文章不存在',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取文章详情失败', error);
      this.setData({
        loading: false,
        error: true
      });
      wx.showToast({
        title: '加载文章失败',
        icon: 'none'
      });
    }
  },
  
  /**
   * 预览特殊图片(二维码等)
   */
  previewSpecialImage() {
    const { specialImage } = this.data;
    
    if (!specialImage) {
      wx.showToast({
        title: '无法预览图片',
        icon: 'none'
      });
      return;
    }
    
    // 使用微信预览API
    wx.previewImage({
      current: specialImage,
      urls: [specialImage],
      showmenu: true // 显示长按菜单
    });
  },

  /**
   * 图片预览功能
   */
  previewImage(e) {
    const { currentTarget } = e;
    const { src, index } = currentTarget.dataset;
    const { imageList } = this.data;
    
    if (!imageList || imageList.length === 0) {
      wx.showToast({
        title: '没有可预览的图片',
        icon: 'none'
      });
      return;
    }
    
    // 使用微信预览API
    wx.previewImage({
      current: src || imageList[index] || imageList[0], // 当前显示图片的链接
      urls: imageList,
      showmenu: true // 显示长按菜单
    });
  },

  /**
   * 用户点击右上角分享 - 转发给朋友
   */
  onShareAppMessage() {
    const { article, firstImage } = this.data;
    if (!article) {
      return {
        title: '元生玉鼻',
        path: '/pages/index/index',
        imageUrl: DEFAULT_IMAGE
      };
    }
    
    // 使用seotitle作为分享标题，如果没有则使用普通标题
    const title = article.seotitle || article.title || '元生玉鼻';
    
    // 构建分享路径
    const path = `/pages/article/article?id=${article.id}`;
    
    // 分享图片优先级：
    // 1. 文章中的第一张图片
    // 2. 文章的专用分享图片
    // 3. 默认图片
    let imageUrl = DEFAULT_IMAGE;
    if (firstImage) {
      imageUrl = firstImage; // 使用文章中的第一张图片
    } else if (article.share_image) {
      imageUrl = article.share_image;
    }
    
    return {
      title,
      path,
      imageUrl
    };
  },
  
  /**
   * 用户点击右上角分享到朋友圈
   */
  onShareTimeline() {
    const { article } = this.data;
    if (!article) {
      return {
        title: '元生玉鼻',
        query: '',
        imageUrl: DEFAULT_IMAGE
      };
    }
    
    // 使用seotitle作为分享标题，如果没有则使用普通标题
    const title = article.seotitle || article.title || '玉鼻网';
    
    // 构建查询参数
    const query = `id=${article.id}`;
    
    // 朋友圈分享保持原有逻辑，使用文章的专用分享图片
    const imageUrl = article.share_image || DEFAULT_IMAGE;
    
    return {
      title,
      query,
      imageUrl
    };
  },

  // 封面图片加载失败
  onImageError(e) {
    // 图片加载失败时使用默认图片替代
    if (this.data.article) {
      this.setData({
        'article.image': 'https://www.yubi.wang/uploads/20250317/d909d692a5accd879333044a0a85c089.jpg'
      });
    }
  },

  // 返回列表页
  goBack() {
    wx.navigateBack();
  },

  /**
   * 处理富文本内容，提取视频并分段
   */
  processContentWithVideo(content) {
    const videoList = [];
    let idx = 0;
    // 支持自闭合和成对video标签，提取width/height属性
    content = content.replace(/<video([^>]*)src=['"]?([^'"> ]+)['"]?([^>]*)\/?>(?:.*?<\/video>)?/gi, (match, attrs1, src, attrs2) => {
      // 合并所有属性
      const attrs = (attrs1 + ' ' + attrs2);
      let width = 0, height = 0;
      const widthMatch = attrs.match(/width=['"]?(\d+)/i);
      const heightMatch = attrs.match(/height=['"]?(\d+)/i);
      if (widthMatch) width = parseInt(widthMatch[1]);
      if (heightMatch) height = parseInt(heightMatch[1]);
      videoList.push({ src, width, height });
      return `<!--VIDEO_PLACEHOLDER_${idx++}-->`;
    });
    // 提取所有图片URL
    let imageList = [];
    const imgRegexAll = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let matchAll;
    while ((matchAll = imgRegexAll.exec(content)) !== null) {
      if (matchAll[1]) {
        imageList.push(matchAll[1]);
      }
    }
    // 分段处理
    const blocks = [];
    let lastIdx = 0;
    const regex = /<!--VIDEO_PLACEHOLDER_(\d+)-->/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
      if (m.index > lastIdx) {
        blocks.push({ type: 'html', html: content.slice(lastIdx, m.index) });
      }
      // 传递width/height
      blocks.push({ type: 'video', src: videoList[Number(m[1])].src, width: videoList[Number(m[1])].width, height: videoList[Number(m[1])].height });
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < content.length) {
      blocks.push({ type: 'html', html: content.slice(lastIdx) });
    }
    return { contentBlocks: blocks, imageList };
  },

  /**
   * 为每个视频分配横竖屏比例class
   */
  async setVideoAspectRatios(contentBlocks) {
    const promises = contentBlocks.map(async (block) => {
      if (block.type === 'video' && block.src) {
        // 优先用标签上的width/height
        if (block.width && block.height) {
          const ratio = block.width / block.height;
          block.aspectClass = ratio < 0.9 ? 'aspect-9-16' : 'aspect-16-9';
        } else {
          // 没有就用getVideoInfo
          try {
            const res = await wx.getVideoInfo({ src: block.src });
            const ratio = res.width / res.height;
            block.aspectClass = ratio < 0.9 ? 'aspect-9-16' : 'aspect-16-9';
          } catch (e) {
            block.aspectClass = 'aspect-16-9';
          }
        }
      }
      return block;
    });
    const newBlocks = await Promise.all(promises);
    this.setData({ contentBlocks: newBlocks });
  }
}); 