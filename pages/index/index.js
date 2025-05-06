// index.js
const { getArticleList } = require('../../utils/api');
const { formatTime } = require('../../utils/util');
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

// 服务器域名
const HOST = 'https://www.yubi.wang';

// 职称映射
const TITLE_MAP = {
  '7': '主任医师',
  '8': '副主任医师',
  '9': '主治医师',
  '10': '助理医师',
  '22': '住院医师',
  '23': '医学生',
  '24': '美学顾问',
  '25': '运营管理'
};

// 专长映射
const SPECIALTY_MAP = {
  '18': '初鼻整形',
  '19': '鼻修复',
  '20': '眉弓',
  '21': '鼻唇沟',
  '26': '运营管理',
  '28': '学术教育'
};

// 认证映射
const AUTH_MAP = {
  '27': '秘书',
  '1': '顾问专家',
  '2': '导师专家',
  '3': '核心专家',
  '4': '秘书长',
  '5': '常务委员',
  '6': '委员'
};

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
      { id: 1, name: '新闻动态' },
      { id: 7, name: '授权专家' },
      { id: 11, name: '签约专家' },
      { id: 2, name: '玉鼻优品' },
      { id: 12, name: '学术公告' }
    ],
    currentCategory: 1, // 设置新闻动态为默认分类
    searchKeyword: '', // 搜索关键词
    isSearching: false, // 是否处于搜索模式
    showBackToTop: false, // 是否显示返回顶部按钮
    showSwiper: true, // 是否显示轮播图
    doctors: [], // 医生列表
    doctorPage: 1, // 医生列表页码
    doctorHasMore: true, // 医生列表是否有更多
    doctorLoading: false, // 医生列表加载状态
    activeFilter: '', // 当前激活的筛选类型
    selectedAuth: '', // 选中的认证
    selectedTitle: '', // 选中的职称
    selectedLocation: '', // 选中的地点
    selectedSpecialty: '', // 选中的专长
    selectedLetter: '', // 选中的姓氏首字母
    letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z'],
    locations: [], // 所有医生的执业地点列表
    filteredDoctors: [], // 筛选后的医生列表
    AUTH_MAP: AUTH_MAP,
    TITLE_MAP: TITLE_MAP,
    SPECIALTY_MAP: SPECIALTY_MAP,
  },

  onLoad(options) {
    // 处理分享参数
    if (options.category) {
      const categoryId = Number(options.category);
      if (categoryId !== this.data.currentCategory) {
        this.setData({
          currentCategory: categoryId,
          // 只有新闻动态分类显示轮播图
          showSwiper: categoryId === 1
        });
      }
    }

    // 加载文章列表
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
      // 判断当前分类是否为专家
      if (this.data.currentCategory === 7 || this.data.currentCategory === 11) {
        // 跳转到搜索页面，使用专家搜索类型
        wx.navigateTo({
          url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}&type=doctor`
        });
      } else {
        // 跳转到搜索结果页（文章）
        wx.navigateTo({
          url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`
        });
      }
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

  // 搜索医生
  async searchDoctors(keyword) {
    // 过滤当前医生列表中包含关键词的医生
    const searchResults = this.data.doctors.filter(doctor => {
      return (
        (doctor.name && doctor.name.toLowerCase().includes(keyword.toLowerCase())) ||
        (doctor.hospital && doctor.hospital.toLowerCase().includes(keyword.toLowerCase())) ||
        (doctor.title_text && doctor.title_text.toLowerCase().includes(keyword.toLowerCase())) ||
        (doctor.specialties_text && doctor.specialties_text.toLowerCase().includes(keyword.toLowerCase())) ||
        (doctor.auth_text && doctor.auth_text.toLowerCase().includes(keyword.toLowerCase())) ||
        (doctor.city_name && doctor.city_name.toLowerCase().includes(keyword.toLowerCase()))
      );
    });

    this.setData({
      filteredDoctors: searchResults,
      noData: searchResults.length === 0,
      // 清除所有筛选条件
      selectedAuth: '',
      selectedTitle: '',
      selectedLocation: '',
      selectedSpecialty: '',
      selectedLetter: '',
      activeFilter: ''
    });

    if (searchResults.length === 0) {
      wx.showToast({
        title: '未找到相关医生',
        icon: 'none'
      });
    }
  },

  // 切换分类
  switchCategory: function(e) {
    const categoryId = Number(e.currentTarget.dataset.id);
    if (categoryId === this.data.currentCategory) return;
    
    this.setData({
      currentCategory: categoryId,
      searchKeyword: '', // 切换分类时清空搜索词
      isSearching: false, // 退出搜索模式
      showSwiper: categoryId === 1, // 只有新闻动态分类显示轮播图
      page: 1, // 重置页码
      doctorPage: 1, // 重置医生列表页码
      activeFilter: '',
      selectedAuth: '',
      selectedTitle: '',
      selectedLocation: '',
      selectedSpecialty: '',
      selectedLetter: '',
      filteredDoctors: []
    });
    
    if (categoryId === 7 || categoryId === 11) {
      // 加载医生列表
      this.loadDoctors(true);
    } else {
      this.filterArticles();

      // 如果过滤后的文章太少，加载更多
      if (this.data.filteredArticles.length < 5 && this.data.hasMore &&
        categoryId !== 7 && categoryId !== 11) {
        this.loadMoreForCategory();
      }
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

    if (currentCategory === 1) {
      // 新闻动态 - channel_id为3 4 5 6的文章
      filteredArticles = articles.filter(item =>
        [3, 4, 5, 6].includes(item.channel_id)
      );
    } else if (currentCategory === 2) {
      // 玉鼻优品 - channel_id为2 8 9 10 26的文章
      filteredArticles = articles.filter(item =>
        [2, 8, 9, 10, 26].includes(item.channel_id)
      );
    } else if (currentCategory === 12) {
      // 学术公告 - channel_id为16的文章
      filteredArticles = articles.filter(item =>
        item.channel_id === 16
      );
    } else if (currentCategory === 7 || currentCategory === 11) {
      // 签约专家和授权专家暂时不展示任何文章
      filteredArticles = [];
    } else {
      // 其它分类按照ID精确匹配
      filteredArticles = articles.filter(item =>
        item.channel_id === currentCategory
      );
    }

    // 确保每个过滤后的文章都有唯一key
    filteredArticles = filteredArticles.map((item, index) => {
      if (!item.uniqueKey) {
        item.uniqueKey = (item.id || '') + '_' + currentCategory + '_' + index;
      }
      return item;
    });

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
      newArticles.forEach((item, index) => {
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

        // 生成唯一key，避免wx:key重复
        item.uniqueKey = (item.id || '') + '_' + (isRefresh ? index : this.data.articles.length + index);
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
    if (this.data.currentCategory === 7 || this.data.currentCategory === 11) {
      // 刷新医生列表
      this.loadDoctors(true).then(() => {
        wx.stopPullDownRefresh();
      }).catch(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      // 刷新文章列表
      this.loadArticles(true).then(() => {
        wx.stopPullDownRefresh();
      }).catch(() => {
        wx.stopPullDownRefresh();
      });
    }
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.currentCategory === 7 || this.data.currentCategory === 11) {
      // 加载更多医生
      this.loadDoctors();
    } else if (!this.data.isSearching) {
      // 加载更多文章
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
  },

  // 加载医生列表
  async loadDoctors(isRefresh = false) {
    if (this.data.doctorLoading || (!isRefresh && !this.data.doctorHasMore)) return;

    this.setData({ doctorLoading: true });

    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${HOST}/api/member/list`,
          method: 'GET',
          data: {
            page: isRefresh ? 1 : this.data.doctorPage,
            limit: 10
          },
          success: (res) => {
            if (res.data && res.data.code === 1) {
              resolve(res.data);
            } else {
              reject(res.data || { msg: '获取医生列表失败' });
            }
          },
          fail: (err) => {
            reject(err || { msg: '网络请求失败' });
          }
        });
      });

      const newDoctors = res.data || [];

      // 处理医生数据
      newDoctors.forEach(doctor => {
        // 处理头像路径
        if (doctor.head_img && doctor.head_img.startsWith('/')) {
          doctor.head_img = `${HOST}${doctor.head_img}`;
        }

        // 处理职称显示
        doctor.title_text = this.data.TITLE_MAP[doctor.positional_title] || '';

        // 处理专长显示
        if (doctor.specialties) {
          const specialtiesArr = doctor.specialties.split(',');
          doctor.specialties_text = specialtiesArr
            .map(id => this.data.SPECIALTY_MAP[id])
            .filter(text => text)
            .join('、');
        }

        // 处理认证显示
        doctor.auth_text = this.data.AUTH_MAP[doctor.honor_auth] || '';

        // 处理城市名称显示
        if (doctor.city_name) {
          // 提取省份名称
          let provinceName = '';
          if (doctor.city_name.includes('/')) {
            provinceName = doctor.city_name.split('/')[0];
            // 提取省份主要名称（移除"省"、"市"等后缀）
            if (provinceName.includes('省')) {
              provinceName = provinceName.split('省')[0];
            } else if (provinceName.includes('市') && !provinceName.startsWith('北京') && !provinceName.startsWith('上海') && !provinceName.startsWith('天津') && !provinceName.startsWith('重庆')) {
              provinceName = provinceName.split('市')[0];
            }
          } else {
            provinceName = doctor.city_name;
          }

          // 保存原始值，并设置简化显示
          doctor.original_city_name = doctor.city_name;
          doctor.city_name = provinceName;
        }

        // 确保有 first_py 字段
        if (!doctor.first_py && doctor.name) {
          // 如果没有 first_py 字段但有 name，取 name 的首字母
          doctor.first_py = doctor.name.charAt(0).toUpperCase();
        }

        // 确保各个筛选字段都有值
        if (!doctor.first_py) doctor.first_py = '';
        if (!doctor.specialties) doctor.specialties = '';
        if (!doctor.honor_auth) doctor.honor_auth = '';
        if (!doctor.positional_title) doctor.positional_title = '';

        // 生成 uniqueKey
        doctor.uniqueKey = (doctor.id || '') + '_' + (doctor.name || '') + '_' + (doctor.honor_auth || '') + '_' + (doctor.positional_title || '');
      });

      const allDoctors = isRefresh ? newDoctors : [...this.data.doctors, ...newDoctors];

      this.setData({
        doctors: allDoctors,
        doctorPage: isRefresh ? 2 : this.data.doctorPage + 1,
        doctorLoading: false,
        doctorHasMore: newDoctors.length === 10,
        noData: isRefresh && allDoctors.length === 0
      });

      // 更新地点列表
      this.loadLocations();

      // 每次加载都重新应用筛选条件
      this.filterDoctors();

    } catch (error) {
      console.error('获取医生列表失败', error);
      this.setData({
        doctorLoading: false,
        noData: isRefresh && this.data.doctors.length === 0
      });
      wx.showToast({
        title: error.msg || '获取医生列表失败',
        icon: 'none'
      });
    }
  },

  // 跳转到专家详情
  goToDoctorDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/doctor/detail?id=${id}`
    });
  },

  /**
   * 切换筛选类型
   */
  toggleFilter: function(e) {
    const type = e.currentTarget.dataset.type;
    
    // 如果点击已经激活的筛选，则关闭
    if (this.data.activeFilter === type) {
      this.setData({
        activeFilter: ''
      });
    } else {
      this.setData({
        activeFilter: type
      });
    }
  },

  // 选择认证
  selectAuth(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      selectedAuth: value,
      activeFilter: ''
    });
    this.filterDoctors();
  },

  // 选择职称
  selectTitle(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      selectedTitle: value,
      activeFilter: ''
    });
    this.filterDoctors();
  },

  // 选择地点
  selectLocation: function(e) {
    const value = e.currentTarget.dataset.value;
    
    // 重置其他筛选条件（仅对授权专家页面）
    if (this.data.currentCategory === 7) {
      this.setData({
        selectedAuth: '',
        selectedTitle: '',
        selectedLocation: value,
        selectedSpecialty: '',
        selectedLetter: '',
        activeFilter: ''
      });
    } else {
      this.setData({
        selectedLocation: value,
        activeFilter: ''
      });
    }
    
    this.filterDoctors();
  },

  // 选择专长
  selectSpecialty(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      selectedSpecialty: value,
      activeFilter: ''
    });
    this.filterDoctors();
  },

  // 选择姓氏首字母
  selectLetter(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      selectedLetter: value,
      activeFilter: ''
    });
    this.filterDoctors();
  },

  /**
   * 清除筛选条件
   */
  clearFilter: function() {
    // 为授权专家页面，只清除地点筛选
    if (this.data.currentCategory === 7) {
      this.setData({
        selectedLocation: '',
        filteredDoctors: []
      });
    } else {
      this.setData({
        selectedAuth: '',
        selectedTitle: '',
        selectedLocation: '',
        selectedSpecialty: '',
        selectedLetter: '',
        activeFilter: '',
        filteredDoctors: []
      });
    }
  },

  /**
   * 筛选医生列表
   */
  filterDoctors: function() {
    let filtered = [...this.data.doctors];
    
    // 授权专家页面只按地点筛选
    if (this.data.currentCategory === 7) {
      if (this.data.selectedLocation) {
        filtered = filtered.filter(doctor => doctor.city_name === this.data.selectedLocation);
      }
    } else {
      // 签约专家页面保留完整筛选
      // 按认证筛选
      if (this.data.selectedAuth) {
        filtered = filtered.filter(doctor => String(doctor.honor_auth) === String(this.data.selectedAuth));
      }
      
      // 按职称筛选
      if (this.data.selectedTitle) {
        filtered = filtered.filter(doctor => String(doctor.positional_title) === String(this.data.selectedTitle));
      }
      
      // 按地点筛选
      if (this.data.selectedLocation) {
        filtered = filtered.filter(doctor => doctor.city_name === this.data.selectedLocation);
      }
      
      // 按专长筛选
      if (this.data.selectedSpecialty) {
        filtered = filtered.filter(doctor => {
          if (!doctor.specialties) return false;
          const specialtiesArr = doctor.specialties.split(',').map(String);
          return specialtiesArr.includes(String(this.data.selectedSpecialty));
        });
      }
      
      // 按姓氏首字母筛选
      if (this.data.selectedLetter) {
        filtered = filtered.filter(doctor => {
          if (!doctor.first_py) return false;
          const firstPy = doctor.first_py.toUpperCase();
          return firstPy === this.data.selectedLetter;
        });
      }
    }
    
    this.setData({
      filteredDoctors: filtered
    });
  },

  // 加载医生的执业地点列表
  loadLocations: function() {
    // 从当前医生列表中提取所有不重复的地点
    if (this.data.doctors && this.data.doctors.length > 0) {
      let locations = [...new Set(this.data.doctors.map(doctor => doctor.city_name))].filter(Boolean);
      
      // 添加常见整形地点
      let commonLocations = ['北京', '上海', '广东', '浙江', '江苏', '四川', '湖北', '辽宁', '山东'];
      // 合并已有地点和常见地点，去重
      locations = [...new Set([...locations, ...commonLocations])].filter(Boolean).sort();
      
      this.setData({ locations });
    }
  },
});
