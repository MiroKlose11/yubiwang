// index.js
const { getArticleList } = require('../../utils/api');
const { formatTime } = require('../../utils/util');
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

// 服务器域名
const HOST = 'https://www.yubi.wang';

Page({
  data: {
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    articles: [], // 所有文章
    filteredArticles: [], // 分类后的文章
    loading: false,
    page: 1,
    hasMore: true,
    noData: false,
    // 分类相关
    categories: [
      { id: 4, name: '科技前沿' },
      { id: 5, name: '时代观察' },
      { id: 6, name: '企业动态' },
      { id: 3, name: '行业资讯' },
      { id: 2, name: '玉鼻优品' }
    ],
    currentCategory: 0, // 0表示全部
    searchKeyword: '', // 搜索关键词
    isSearching: false, // 是否处于搜索模式
    showBackToTop: false // 是否显示返回顶部按钮
  },
  
  onLoad() {
    this.loadArticles(true);
  },
  
  // 搜索框输入事件
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },
  
  // 搜索按钮点击或回车确认事件
  onSearchConfirm() {
    const keyword = this.data.searchKeyword.trim();
    if (keyword) {
      // 跳转到搜索结果页
      wx.navigateTo({
        url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`
      });
    } else {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
    }
  },
  
  // 搜索文章
  async searchArticles(keyword) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      // TODO: 改为使用搜索API，暂时使用本地搜索
      // 模拟搜索，在已加载的文章中查找
      const searchResults = this.data.articles.filter(item => {
        return (
          (item.title && item.title.indexOf(keyword) !== -1) || 
          (item.description && item.description.indexOf(keyword) !== -1) ||
          (item.content && item.content.indexOf(keyword) !== -1)
        );
      });
      
      this.setData({
        filteredArticles: searchResults,
        loading: false,
        noData: searchResults.length === 0,
        hasMore: false // 搜索模式下不显示加载更多
      });
      
    } catch (error) {
      console.error('搜索文章失败', error);
      this.setData({ 
        loading: false,
        noData: true
      });
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    }
  },
  
  // 切换分类
  switchCategory(e) {
    const categoryId = Number(e.currentTarget.dataset.id);
    if (categoryId === this.data.currentCategory) return;
    
    this.setData({ 
      currentCategory: categoryId,
      searchKeyword: '', // 切换分类时清空搜索词
      isSearching: false // 退出搜索模式
    });
    this.filterArticles();
    
    // 如果过滤后的文章太少，加载更多
    if (this.data.filteredArticles.length < 5 && this.data.hasMore) {
      this.loadMoreForCategory();
    }
  },
  
  // 加载当前分类的更多文章
  async loadMoreForCategory() {
    if (this.data.loading || !this.data.hasMore) return;
    if (this.data.filteredArticles.length >= 10) return;
    
    await this.loadArticles(false);
    
    // 如果仍然不足，继续加载
    if (this.data.filteredArticles.length < 5 && this.data.hasMore) {
      setTimeout(() => this.loadMoreForCategory(), 300);
    }
  },
  
  // 根据当前选择的分类过滤文章
  filterArticles() {
    const { articles, currentCategory, isSearching, searchKeyword } = this.data;
    let filteredArticles;
    
    // 如果在搜索模式，直接返回
    if (isSearching && searchKeyword) {
      return;
    }
    
    if (currentCategory === 0) {
      filteredArticles = articles;
    } else if (currentCategory === 2) {
      filteredArticles = articles.filter(item => 
        [2, 8, 9, 10, 26].includes(item.channel_id)
      );
    } else {
      filteredArticles = articles.filter(item => 
        item.channel_id === currentCategory
      );
    }
    
    this.setData({
      filteredArticles,
      noData: filteredArticles.length === 0
    });
  },
  
  // 加载文章列表
  async loadArticles(isRefresh = false) {
    if (this.data.loading || (!isRefresh && !this.data.hasMore)) return;
    
    // 如果在搜索模式且不是刷新，则不加载新文章
    if (this.data.isSearching && !isRefresh) return;
    
    const page = isRefresh ? 1 : this.data.page;
    this.setData({ loading: true });
    
    try {
      const res = await getArticleList({ page });
      const newArticles = res.data || [];
      
      // 处理文章数据
      newArticles.forEach(item => {
        // 处理时间
        if (item.createTime || item.publishtime) {
          const timestamp = item.publishtime || item.createTime;
          item.createTime = formatTime(new Date(parseInt(timestamp) * 1000));
        }
        
        // 处理图片路径
        if (item.image) {
          if (item.image.startsWith('/uploads/')) {
            item.image = `${HOST}${item.image}`;
          }
        } else if (item.coverImg) {
          if (item.coverImg.startsWith('/uploads/')) {
            item.image = `${HOST}${item.coverImg}`;
          } else {
            item.image = item.coverImg;
          }
        } else {
          item.image = 'https://pic.616pic.com/ys_bnew_img/00/04/76/QcJhrXSFgb.jpg';
        }
      });
      
      // 更新文章列表
      const allArticles = isRefresh ? newArticles : [...this.data.articles, ...newArticles];
      
      this.setData({
        articles: allArticles,
        page: page + 1,
        loading: false,
        hasMore: newArticles.length === 10
      });
      
      // 如果在搜索模式下刷新，则重新执行搜索
      if (this.data.isSearching && this.data.searchKeyword && isRefresh) {
        this.searchArticles(this.data.searchKeyword);
      } else {
        // 否则根据分类过滤文章
        this.filterArticles();
      }
    } catch (error) {
      console.error('获取文章列表失败', error);
      this.setData({ 
        loading: false,
        noData: isRefresh && this.data.filteredArticles.length === 0
      });
      wx.showToast({
        title: '获取文章列表失败',
        icon: 'none'
      });
    }
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.loadArticles(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 触底加载更多
  onReachBottom() {
    if (!this.data.isSearching) {
      this.loadArticles();
    }
  },
  
  // 跳转到文章详情
  goToArticleDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/article/article?id=${id}`
    });
  },
  
  // 用户信息相关方法
  getUserProfile(e) {
    wx.getUserProfile({
      desc: '展示用户信息',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
      }
    });
  },
  
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    const { nickName } = this.data.userInfo;
    this.setData({
      "userInfo.avatarUrl": avatarUrl,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    });
  },
  
  onInputChange(e) {
    const nickName = e.detail.value;
    const { avatarUrl } = this.data.userInfo;
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    });
  },
  
  /**
   * 用户点击右上角分享 - 转发给朋友
   * 必须返回一个对象，用于自定义转发内容
   */
  onShareAppMessage(options) {
    // 获取当前分类名称
    let categoryName = '全部';
    if (this.data.currentCategory !== 0) {
      const category = this.data.categories.find(item => item.id === this.data.currentCategory);
      if (category) {
        categoryName = category.name;
      }
    }
    
    // 分享标题 - 使用当前分类
    const title = `玉鼻网 - ${categoryName}`;
    
    // 分享图片 - 使用固定图片
    const imageUrl = 'https://www.yubi.wang/uploads/20250317/d909d692a5accd879333044a0a85c089.jpg';
    
    // 构建分享路径，携带当前分类ID
    const path = `/pages/index/index?category=${this.data.currentCategory}`;
    
    return {
      title: title,
      path: path,
      imageUrl: imageUrl,
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
   * 必须返回一个对象，用于自定义分享内容
   */
  onShareTimeline() {
    // 获取当前分类名称
    let categoryName = '全部';
    if (this.data.currentCategory !== 0) {
      const category = this.data.categories.find(item => item.id === this.data.currentCategory);
      if (category) {
        categoryName = category.name;
      }
    }
    
    // 分享标题 - 使用当前分类
    const title = `玉鼻网 - ${categoryName}`;
    
    // 分享图片 - 使用固定图片
    const imageUrl = 'https://www.yubi.wang/uploads/20250317/d909d692a5accd879333044a0a85c089.jpg';
    
    // 构建查询参数，携带当前分类ID
    const query = `category=${this.data.currentCategory}`;
    
    return {
      title: title,
      query: query,
      imageUrl: imageUrl
    };
  },
  
  /**
   * 生命周期函数--监听页面加载
   * 处理分享进入的场景
   */
  onLoad(options) {
    // 处理分享参数
    if (options.category) {
      const categoryId = Number(options.category);
      if (categoryId !== this.data.currentCategory) {
        this.setData({ currentCategory: categoryId });
      }
    }
    
    // 加载文章列表
    this.loadArticles(true);
  },
  
  // 页面滚动事件处理函数
  onPageScroll(e) {
    // 当滚动超过一定距离时显示返回顶部按钮
    if (e.scrollTop > 300 && !this.data.showBackToTop) {
      this.setData({
        showBackToTop: true
      });
    } else if (e.scrollTop <= 300 && this.data.showBackToTop) {
      this.setData({
        showBackToTop: false
      });
    }
  },
  
  // 返回顶部点击事件
  backToTop() {
    // 使用微信原生API快速返回顶部
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });
  }
});
