const { getArticleList, searchArticles } = require('../../utils/api');
const { formatTime } = require('../../utils/util');

// 服务器域名
const HOST = 'https://www.yubi.wang';

Page({
  data: {
    keyword: '', // 搜索关键词
    searchResults: [], // 搜索结果
    doctorResults: [], // 专家搜索结果
    loading: false, // 是否正在加载
    loadingMore: false, // 是否正在加载更多
    doctorLoading: false, // 专家数据加载状态
    doctorLoadingMore: false, // 专家加载更多状态
    hasMore: true, // 是否还有更多结果
    doctorHasMore: true, // 专家是否有更多
    page: 1, // 当前页码
    doctorPage: 1, // 专家当前页码
    orderby: '', // 排序字段
    orderway: 'desc', // 排序方式
    activeTab: 'article', // 当前激活的标签：article或doctor
    limit: 10, // Added for the new searchArticles function
    noResult: false // Added for the new searchArticles function
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

    if (options.type === 'doctor') {
      this.setData({ activeTab: 'doctor' });
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
   * 切换标签
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    
    this.setData({ activeTab: tab });
    
    // 如果切换到专家标签并且还没有加载过专家数据，则加载专家数据
    if (tab === 'doctor' && this.data.doctorResults.length === 0 && this.data.keyword) {
      this.searchDoctors(this.data.keyword);
    }
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
      doctorPage: 1,
      searchResults: [],
      doctorResults: [],
      loading: true,
      doctorLoading: true,
      hasMore: true,
      doctorHasMore: true
    });

    // 执行搜索
    if (this.data.activeTab === 'article') {
      this.searchArticles(this.data.keyword);
      // 预加载专家数据
      setTimeout(() => {
        this.searchDoctors(this.data.keyword);
      }, 300);
    } else {
      this.searchDoctors(this.data.keyword);
      // 预加载文章数据
      setTimeout(() => {
        this.searchArticles(this.data.keyword);
      }, 300);
    }
  },

  /**
   * 搜索文章
   */
  async searchArticles(keyword) {
    this.setData({ loading: true, loadingMore: false });

    try {
      const res = await wx.cloud.callFunction({
        name: 'search',
        data: {
          keyword,
          page: this.data.page,
          limit: this.data.limit,
          type: 'article'
        }
      });

      let results = res.result?.data || [];
      
      // 使用processResults处理结果
      results = this.processResults(results);

      // 更新搜索结果
      if (this.data.page === 1) {
        this.setData({
          searchResults: results,
          hasMore: results.length === this.data.limit,
          loading: false,
          noResult: results.length === 0
        });
      } else {
        this.setData({
          searchResults: [...this.data.searchResults, ...results],
          hasMore: results.length === this.data.limit,
          loading: false,
          loadingMore: false
        });
      }
    } catch (error) {
      console.error('搜索文章失败', error);
      this.setData({
        loading: false,
        loadingMore: false,
        noResult: this.data.page === 1
      });
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    }
  },

  /**
   * 搜索专家
   */
  searchDoctors(keyword) {
    if (!keyword) return;
    
    this.setData({
      doctorLoading: this.data.doctorPage === 1
    });

    wx.request({
      url: `${HOST}/api/member/search`,
      method: 'GET',
      data: {
        keyword: keyword,
        page: this.data.doctorPage,
        limit: 10
      },
      success: (res) => {
        if (res.data && res.data.code === 1 && res.data.data) {
          const doctorIds = res.data.data;
          
          if (doctorIds.length === 0) {
            this.setData({
              doctorLoading: false,
              doctorLoadingMore: false,
              doctorHasMore: false
            });
            return;
          }
          
          // 获取专家详细信息
          this.fetchDoctorDetails(doctorIds.map(item => item.id));
        } else {
          console.error('专家搜索返回数据格式不正确', res);
          this.setData({
            doctorLoading: false,
            doctorLoadingMore: false
          });
        }
      },
      fail: (err) => {
        console.error('搜索专家失败', err);
        this.setData({
          doctorLoading: false,
          doctorLoadingMore: false
        });
        wx.showToast({
          title: '搜索专家失败，请检查网络',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 获取专家详细信息
   */
  fetchDoctorDetails(idList) {
    if (!idList || idList.length === 0) return;
    
    const promises = idList.map(id => {
      return new Promise((resolve) => {
        wx.request({
          url: `${HOST}/api/member/info`,
          method: 'GET',
          data: { id },
          success: (res) => {
            if (res.data && res.data.code === 1 && res.data.data) {
              resolve(res.data.data);
            } else {
              resolve(null);
            }
          },
          fail: () => resolve(null)
        });
      });
    });
    
    Promise.all(promises).then(doctorDetails => {
      // 过滤掉null值并处理数据
      const validDoctors = doctorDetails.filter(item => item !== null);
      
      // 处理医生数据
      const processedDoctors = validDoctors.map(doctor => {
        // 处理头像
        if (doctor.head_img && doctor.head_img.startsWith('/')) {
          doctor.head_img = `${HOST}${doctor.head_img}`;
        }
        
        // 处理认证
        const AUTH_MAP = {
          '27': '秘书', '1': '顾问专家', '2': '导师专家', 
          '3': '核心专家', '4': '秘书长', '5': '常务委员', '6': '委员'
        };
        doctor.auth_text = AUTH_MAP[doctor.honor_auth] || '';
        
        // 处理职称
        const TITLE_MAP = {
          '7': '主任医师', '8': '副主任医师', '9': '主治医师', 
          '10': '助理医师', '22': '住院医师', '23': '医学生', 
          '24': '美学顾问', '25': '运营管理'
        };
        doctor.title_text = TITLE_MAP[doctor.positional_title] || doctor.positional_title || '';
        
        // 处理专长字段，用于显示在搜索结果中
        if (doctor.specialties) {
          const SPECIALTY_MAP = {
            '18': '初鼻整形',
            '19': '鼻修复',
            '20': '眉弓',
            '21': '鼻唇沟',
            '26': '运营管理',
            '28': '学术教育'
          };
          
          const specialtiesArr = doctor.specialties.split(',');
          doctor.specialties_text = specialtiesArr
            .map(id => SPECIALTY_MAP[id])
            .filter(text => text)
            .join('、');
        }
        
        return doctor;
      });
      
      // 更新数据
      if (this.data.doctorPage === 1) {
        this.setData({
          doctorResults: processedDoctors,
          doctorLoading: false,
          doctorLoadingMore: false,
          doctorHasMore: validDoctors.length === idList.length && idList.length === 10
        });
      } else {
        this.setData({
          doctorResults: [...this.data.doctorResults, ...processedDoctors],
          doctorLoading: false,
          doctorLoadingMore: false,
          doctorHasMore: validDoctors.length === idList.length && idList.length === 10
        });
      }
    });
  },

  /**
   * 加载更多搜索结果
   */
  loadMoreResults() {
    if (this.data.activeTab === 'article') {
      if (this.data.loadingMore || !this.data.hasMore) return;
      
      this.setData({
        page: this.data.page + 1,
        loadingMore: true
      });
      
      this.searchArticles(this.data.keyword);
    } else {
      if (this.data.doctorLoadingMore || !this.data.doctorHasMore) return;
      
      this.setData({
        doctorPage: this.data.doctorPage + 1,
        doctorLoadingMore: true
      });
      
      this.searchDoctors(this.data.keyword);
    }
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
   * 跳转到专家详情
   */
  goToDoctorDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/doctor/detail?id=${id}`
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
      path: `/pages/search/search?keyword=${encodeURIComponent(this.data.keyword)}&type=${this.data.activeTab}`
    };
  },

  // 处理搜索结果
  processResults(results) {
    if (!results || !Array.isArray(results)) {
      return [];
    }

    return results.map((item, index) => {
      // 确保有唯一key
      item.uniqueKey = (item.id || '') + '_search_' + index;
      
      // 其他处理逻辑...
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

      return item;
    });
  }
}); 