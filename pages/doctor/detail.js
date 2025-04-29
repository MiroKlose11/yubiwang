// 专家详情页
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
    id: null,
    doctor: null,
    loading: true,
    error: false,
    errorMsg: '加载失败，请重试',
    currentVideoIndex: 0 // 当前选中的视频索引
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadDoctorDetail();
    } else {
      this.setData({
        loading: false,
        error: true,
        errorMsg: '缺少专家ID参数'
      });
    }
  },

  // 加载专家详情
  loadDoctorDetail() {
    const { id } = this.data;
    if (!id) return;

    this.setData({
      loading: true,
      error: false
    });

    wx.request({
      url: `${HOST}/api/member/info`,
      method: 'GET',
      data: { id },
      success: (res) => {
        if (res.data && res.data.code === 1 && res.data.data) {
          const doctorData = res.data.data;
          
          // 处理专家数据
          this.processDoctorData(doctorData);
        } else {
          this.setData({
            loading: false,
            error: true,
            errorMsg: res.data?.msg || '获取专家信息失败'
          });
        }
      },
      fail: (err) => {
        console.error('请求专家详情失败', err);
        this.setData({
          loading: false,
          error: true,
          errorMsg: '网络请求失败，请检查网络连接'
        });
      }
    });
  },

  // 处理专家数据
  processDoctorData(doctorData) {
    // 处理头像
    if (doctorData.head_img && doctorData.head_img.startsWith('/')) {
      doctorData.head_img = `${HOST}${doctorData.head_img}`;
    }

    // 处理职称
    doctorData.title_text = TITLE_MAP[doctorData.positional_title] || doctorData.positional_title || '';

    // 处理专长
    if (doctorData.specialties) {
      const specialtiesArr = doctorData.specialties.split(',');
      doctorData.specialties_text = specialtiesArr
        .map(id => SPECIALTY_MAP[id])
        .filter(text => text)
        .join('、');
      doctorData.specialties_arr = specialtiesArr
        .map(id => SPECIALTY_MAP[id])
        .filter(text => text);
    } else {
      doctorData.specialties_text = '';
      doctorData.specialties_arr = [];
    }

    // 处理认证
    doctorData.auth_text = AUTH_MAP[doctorData.honor_auth] || '';

    // 处理各种数组字段
    if (doctorData.social_position) {
      doctorData.social_position_arr = this.splitTextToArray(doctorData.social_position);
    }
    
    if (doctorData.awards_honors) {
      doctorData.awards_honors_arr = this.splitTextToArray(doctorData.awards_honors);
    }
    
    // 科研成果不再处理成数组，保持原始格式
    if (doctorData.research_achievements) {
      // 替换换行符为<br>标签
      doctorData.research_achievements = doctorData.research_achievements
        .replace(/\n/g, '<br>')
        .replace(/• /g, '• '); // 保留列表符号
    }

    // 处理个人简介富文本
    if (doctorData.personal_introduction) {
      doctorData.personal_introduction = this.processRichText(doctorData.personal_introduction);
    }

    // 提取视频
    doctorData.videos = this.extractVideos(doctorData);

    this.setData({
      doctor: doctorData,
      loading: false,
      currentVideoIndex: 0 // 重置视频索引
    });
  },

  // 处理富文本内容
  processRichText(html) {
    if (!html) return '';

    // 修正图片路径
    let processedHtml = html.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, (match, src) => {
      // 如果图片路径是相对路径，加上域名
      if (src.startsWith('/')) {
        return match.replace(src, `${HOST}${src}`);
      }
      return match;
    });

    // 给图片添加样式
    processedHtml = processedHtml.replace(/<img/gi, '<img style="max-width:100%;height:auto;display:block;margin:10px 0;"');

    // 处理段落样式
    processedHtml = processedHtml.replace(/<p/gi, '<p style="margin-bottom:15px;line-height:1.8;"');

    return processedHtml;
  },

  // 提取视频
  extractVideos(doctorData) {
    const videos = [];
    
    // 如果有专门的视频字段，优先使用
    if (doctorData.videos) {
      try {
        // 尝试解析JSON格式的视频数据
        const parsedVideos = typeof doctorData.videos === 'string' 
          ? JSON.parse(doctorData.videos) 
          : doctorData.videos;
        
        if (Array.isArray(parsedVideos)) {
          return parsedVideos.map((video, index) => {
            // 处理视频URL
            let url = video.url;
            // 确保视频URL前面加上HOST，如果是相对路径
            if (url.startsWith('/')) {
              url = `${HOST}${url}`;
            }
            // 移除URL中的可能导致跨域问题的参数和片段
            url = url.split('#')[0];
            
            return {
              ...video,
              title: video.title || `视频 ${index + 1}`,
              url: url
            };
          });
        } else if (typeof parsedVideos === 'object') {
          let url = parsedVideos.url;
          // 确保视频URL前面加上HOST，如果是相对路径
          if (url.startsWith('/')) {
            url = `${HOST}${url}`;
          }
          // 移除URL中的可能导致跨域问题的参数和片段
          url = url.split('#')[0];
          
          return [{
            ...parsedVideos,
            title: parsedVideos.title || '视频 1',
            url: url
          }];
        }
      } catch (e) {
        console.error('解析视频数据失败', e);
      }
    }
    
    // 从个人简介中提取视频链接
    if (doctorData.personal_introduction) {
      // 查找富文本中的视频标签
      const videoRegex = /<video[^>]*src="([^"]*)"[^>]*>/gi;
      let match;
      
      while ((match = videoRegex.exec(doctorData.personal_introduction)) !== null) {
        let url = match[1];
        if (url) {
          // 处理相对路径
          if (url.startsWith('/')) {
            url = `${HOST}${url}`;
          }
          // 移除URL中的可能导致跨域问题的参数和片段
          url = url.split('#')[0];
          
          videos.push({
            url: url,
            title: `视频 ${videos.length + 1}`
          });
        }
      }
      
      // 移除富文本中的视频标签，避免重复显示
      if (videos.length > 0) {
        doctorData.personal_introduction = doctorData.personal_introduction.replace(/<video[^>]*>[^<]*<\/video>/gi, '');
      }
    }
    
    return videos;
  },

  // 切换视频
  switchVideo(e) {
    const index = e.currentTarget.dataset.index;
    if (this.data.currentVideoIndex === index) return;
    
    // 暂停当前视频
    const videoContext = wx.createVideoContext('doctorVideo', this);
    videoContext.pause();
    
    // 仅切换索引，不自动播放
    this.setData({ currentVideoIndex: index });
  },

  // 富文本点击处理
  handleRichTextTap(e) {
    // 处理富文本中的链接点击
    console.log('富文本点击', e);
  },

  // 拆分文本为数组（按行）
  splitTextToArray(text) {
    if (!text) return [];
    
    // 移除多余空白，按行分割
    return text.split(/[,，;；\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  },

  // 页面分享
  onShareAppMessage() {
    const { doctor } = this.data;
    const title = doctor ? `${doctor.name} - ${doctor.title_text}` : '专家详情';
    
    return {
      title: title,
      path: `/pages/doctor/detail?id=${this.data.id}`
    };
  },
  
  // 分享到朋友圈
  onShareTimeline() {
    const { doctor } = this.data;
    const title = doctor ? `${doctor.name} - ${doctor.title_text}` : '专家详情';
    
    return {
      title: title,
      query: `id=${this.data.id}`
    };
  }
}); 