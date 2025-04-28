const { getArticleList, searchArticles } = require('../../utils/api');
const { formatTime } = require('../../utils/util');

// 服务器域名
const HOST = 'https://www.yubi.wang';

Page({
  data: {
    keyword: '', // 搜索关键词
    searchResults: [], // 搜索结果
    loading: false, // 是否正在加载
    loadingMore: false, // 是否正在加载更多
    hasMore: true, // 是否还有更多结果
    page: 1, // 当前页码
    orderby: '', // 排序字段
    orderway: 'desc' // 排序方式
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: '搜索'
    });
    
    if (options.keyword) {
      const keyword = decodeURIComponent(options.keyword);
      this.setData({ keyword });
      this.doSearch();
    }
  },

  /**
   * 监听搜索框输入
   */
  onKeywordInput(e) {
    this.setData({
      keyword: e.detail.value
    });
  },

  /**
   * 执行搜索
   */
  doSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }

    // 检查搜索词长度限制
    if (keyword.length > 15) {
      wx.showToast({
        title: '搜索关键词不能超过15个字符',
        icon: 'none'
      });
      return;
    }

    // 重置页码和结果
    this.setData({
      page: 1,
      searchResults: [],
      loading: true,
      hasMore: true
    });

    // 执行搜索
    this.searchArticles(keyword);
  },

  /**
   * 搜索文章
   */
  async searchArticles(keyword) {
    if (!keyword) return;
    
    try {
      // 使用搜索API
      const res = await searchArticles({
        search: keyword,
        page: this.data.page,
        pagesize: 10
      });
      
      // 从返回数据中获取文章列表
      let newArticles = [];
      
      // 解析返回的数据格式（新API返回格式）
      if (res.code === 1 && res.data) {
        newArticles = res.data;
      } else {
        console.log('搜索返回数据格式不正确或为空', res);
      }
      
      // 处理文章数据
      newArticles.forEach(item => {
        // 处理时间
        if (item.createtime || item.publishtime) {
          const timestamp = item.publishtime || item.createtime;
          item.createTime = formatTime(new Date(parseInt(timestamp) * 1000));
        }
        
        // 处理图片路径
        if (item.image) {
          if (item.image.startsWith('/uploads/')) {
            item.image = `${HOST}${item.image}`;
          }
        } else {
          // 无图时不设置图片
          item.image = '';
        }
      });
      
      // 更新搜索结果
      if (this.data.page === 1) {
        this.setData({
          searchResults: newArticles,
          loading: false,
          loadingMore: false,
          hasMore: newArticles.length === 10 // 如果返回不足10条，说明没有更多了
        });
      } else {
        // 加载更多的情况
        this.setData({
          searchResults: [...this.data.searchResults, ...newArticles],
          loading: false,
          loadingMore: false,
          hasMore: newArticles.length === 10
        });
      }
      
    } catch (error) {
      console.error('搜索文章失败', error);
      this.setData({ 
        loading: false,
        loadingMore: false
      });
      wx.showToast({
        title: error.msg || '搜索失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载更多搜索结果
   */
  loadMoreResults() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    
    this.setData({
      page: this.data.page + 1,
      loadingMore: true
    });
    
    this.searchArticles(this.data.keyword);
  },

  /**
   * 跳转到文章详情
   */
  goToArticleDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/article/article?id=${id}`
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    this.loadMoreResults();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: `搜索: ${this.data.keyword}`,
      path: `/pages/search/search?keyword=${encodeURIComponent(this.data.keyword)}`
    };
  }
}); 