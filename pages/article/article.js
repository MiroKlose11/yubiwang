// 文章详情页
const { getArticleDetail } = require('../../utils/api');
const { formatTime } = require('../../utils/util');

// 获取应用实例
const app = getApp();

// 服务器域名
const HOST = 'https://www.yubi.wang';

Page({
  data: {
    articleId: null,
    article: null,
    loading: true,
    content: '',
    error: false,
    imageList: [] // 存储文章中的所有图片URL
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
        
        // 处理文章内容和提取图片
        if (articleData.content) {
          // 替换图片路径
          let content = articleData.content.replace(/src="\/uploads\//g, `src="${HOST}/uploads/`);
          
          // 提取文章中的所有图片URL
          let imageList = [];
          const imgRegex = /<img[^>]*src=["']([^"']*)["'][^>]*>/gi;
          let match;
          
          while ((match = imgRegex.exec(content)) !== null) {
            if (match[1]) {
              imageList.push(match[1]);
            }
          }
          
          // 添加样式并绑定点击事件
          content = content.replace(/<img([^>]*)>/gi, (match, attrs) => {
            // 构建带有样式和点击事件的图片
            const newAttrs = attrs.replace(/style=["'][^"']*["']/gi, '');
            return `<img ${newAttrs} style="max-width:100%;height:auto;display:block;margin:10rpx auto;" data-custom="tap-image" bindtap="handleImageClick">`;
          });
          
          articleData.content = content;
          
          // 更新图片列表
          this.setData({
            imageList: imageList
          });
          
          // 后续处理：等待DOM渲染完成后添加点击事件
          setTimeout(() => {
            this.bindImageClickEvents();
          }, 1000);
        }
        
        this.setData({
          article: articleData,
          loading: false
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
   * 为富文本内的图片绑定点击事件
   */
  bindImageClickEvents() {
    // 这是一个hack方法：在rich-text中绑定事件
    const that = this;
    const query = wx.createSelectorQuery();
    
    // 监听整个文章区域的点击
    query.select('.article-content').boundingClientRect().exec(res => {
      if (res && res[0]) {
        const articleContent = res[0];
        
        // 手动监听文章内容区域的点击事件
        articleContent.tap = function(e) {
          that.onArticleContentTap(e);
        };
      }
    });
  },
  
  /**
   * 文章内容区域点击处理
   */
  onArticleContentTap(e) {
    // 尝试识别点击的是否为图片
    const { x, y } = e.detail;
    
    // 查询所有图片元素
    wx.createSelectorQuery()
      .selectAll('.rich-content image')
      .boundingClientRect(rects => {
        if (rects && rects.length) {
          // 检查点击是否在图片区域
          for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            if (x >= rect.left && x <= rect.right && 
                y >= rect.top && y <= rect.bottom) {
              // 点击在图片上，获取图片URL
              const src = rect.dataset.src || this.data.imageList[i];
              this.previewImage(null, { 
                currentTarget: { dataset: { src, index: i } } 
              });
              return;
            }
          }
        }
      })
      .exec();
  },
  
  /**
   * 图片点击处理函数
   */
  handleImageClick(e) {
    const src = e.currentTarget.dataset.src;
    const index = this.data.imageList.indexOf(src);
    this.previewImage(e);
  },
  
  /**
   * 图片预览功能
   */
  previewImage(e) {
    const dataset = e ? e.currentTarget.dataset : null;
    const src = dataset ? dataset.src : null;
    const index = dataset ? dataset.index : 0;
    
    const { imageList } = this.data;
    
    // 如果没有图片列表，无法预览
    if (!imageList || imageList.length === 0) {
      console.log('没有可预览的图片');
      return;
    }
    
    // 确定当前图片URL
    let currentImageUrl = src;
    if (!currentImageUrl && index !== undefined && imageList[index]) {
      currentImageUrl = imageList[index];
    }
    
    // 如果仍无法确定图片URL，使用第一张
    if (!currentImageUrl && imageList.length > 0) {
      currentImageUrl = imageList[0];
    }
    
    console.log('预览图片:', currentImageUrl);
    
    // 使用微信预览API
    wx.previewImage({
      current: currentImageUrl,
      urls: imageList,
      showmenu: true, // 显示长按菜单
      success: () => console.log('预览成功'),
      fail: (err) => {
        console.error('预览失败:', err);
        wx.showToast({
          title: '图片预览失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 用户点击右上角分享 - 转发给朋友
   */
  onShareAppMessage() {
    const { article } = this.data;
    if (!article) {
      return {
        title: '玉鼻网',
        path: '/pages/index/index',
        imageUrl: 'https://www.yubi.wang/uploads/20250317/d909d692a5accd879333044a0a85c089.jpg'
      };
    }
    
    // 使用seotitle作为分享标题，如果没有则使用普通标题
    const title = article.seotitle || article.title || '玉鼻网';
    
    // 使用share_image作为分享图片，如果没有则使用指定的默认图片
    const imageUrl = article.share_image || 'https://www.yubi.wang/uploads/20250317/d909d692a5accd879333044a0a85c089.jpg';
    
    // 构建分享路径
    const path = `/pages/article/article?id=${article.id}`;
    
    return {
      title,
      path,
      imageUrl,
      success: (res) => {
        wx.showToast({
          title: '分享成功',
          icon: 'success'
        });
      }
    };
  },
  
  /**
   * 用户点击右上角分享到朋友圈
   */
  onShareTimeline() {
    const { article } = this.data;
    if (!article) {
      return {
        title: '玉鼻网',
        query: '',
        imageUrl: 'https://www.yubi.wang/uploads/20250317/d909d692a5accd879333044a0a85c089.jpg'
      };
    }
    
    // 使用seotitle作为分享标题，如果没有则使用普通标题
    const title = article.seotitle || article.title || '玉鼻网';
    
    // 使用share_image作为分享图片，如果没有则使用指定的默认图片
    const imageUrl = article.share_image || 'https://www.yubi.wang/uploads/20250317/d909d692a5accd879333044a0a85c089.jpg';
    
    // 构建查询参数
    const query = `id=${article.id}`;
    
    return {
      title,
      query,
      imageUrl
    };
  },

  // 封面图片加载成功
  onImageLoad(e) {},
  
  // 封面图片加载失败
  onImageError(e) {
    // 图片加载失败时使用默认图片替代
    if (this.data.article) {
      this.setData({
        'article.image': 'https://pic.616pic.com/ys_bnew_img/00/04/76/QcJhrXSFgb.jpg'
      });
    }
  },

  // 返回列表页
  goBack() {
    wx.navigateBack();
  }
}); 