// 页面详情页
const { getPageDetail } = require('../../utils/api');
const { formatTime } = require('../../utils/util');

// 获取应用实例
const app = getApp();

// 服务器域名
const HOST = 'https://www.yubi.wang';

Page({
  data: {
    pageId: null,
    page: null,
    loading: true,
    error: false,
    errorMsg: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({
        pageId: options.id
      });
      this.loadPageDetail(options.id);
    } else {
      this.setData({
        loading: false,
        error: true
      });
      wx.showToast({
        title: '页面ID无效',
        icon: 'none'
      });
    }
  },

  /**
   * 加载页面详情
   */
  async loadPageDetail(id) {
    try {
      this.setData({ loading: true, error: false });
      
      console.log('开始请求页面详情，ID:', id);
      const result = await getPageDetail(id);
      console.log('页面详情接口返回:', result);
      
      if (result && result.code === 1 && result.data) {
        const page = result.data;
        console.log('获取到页面数据:', page);
        
        // 格式化日期
        if (page.create_time) {
          page.createTime = formatTime(new Date(parseInt(page.create_time) * 1000));
        } else if (page.createtime) {
          page.createTime = formatTime(new Date(parseInt(page.createtime) * 1000));
        }
        
        // 处理内容
        if (page.content) {
          // 处理图片路径
          page.content = this.processContent(page.content);
          console.log('内容处理后长度:', page.content.length);
        } else {
          console.log('页面内容为空');
          // 如果内容为空，可以显示一个友好的提示
          page.content = '<p style="text-align:center;color:#999;padding:40rpx 0;">暂无内容</p>';
        }
        
        this.setData({
          page,
          loading: false
        });
        
        // 设置页面标题
        if (page.title) {
          wx.setNavigationBarTitle({
            title: page.title
          });
        }
      } else {
        console.error('接口返回数据格式不符合预期:', result);
        this.setData({
          loading: false,
          error: true,
          errorMsg: result && result.msg ? result.msg : '获取内容失败'
        });
      }
    } catch (error) {
      console.error('加载页面详情失败', error);
      this.setData({
        loading: false,
        error: true,
        errorMsg: error && error.msg ? error.msg : '内容加载失败，请稍后重试'
      });
    }
  },

  /**
   * 处理内容中的图片路径
   */
  processContent(content) {
    if (!content) return '';
    
    console.log('处理前的内容片段:', content.substring(0, 200) + '...');
    
    // 确保图片域名正确 - 处理相对路径
    let processedContent = content.replace(/src="\/uploads\//g, `src="${HOST}/uploads/`);
    
    // 处理不带/开头的相对路径
    processedContent = processedContent.replace(/src="uploads\//g, `src="${HOST}/uploads/`);
    
    // 处理//开头的协议相对路径
    processedContent = processedContent.replace(/src="\/\/www/g, 'src="https://www');
    
    // 为所有图片添加样式
    processedContent = processedContent.replace(/<img/g, '<img style="max-width:100%;height:auto;display:block;margin:20rpx auto;"');
    
    console.log('处理后的内容片段:', processedContent.substring(0, 200) + '...');
    
    return processedContent;
  },

  /**
   * 返回列表
   */
  goBack() {
    wx.navigateBack();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const title = this.data.page ? this.data.page.title : '美鼻网-学术公告';
    return {
      title: title,
      path: `/pages/page/detail?id=${this.data.pageId}`
    };
  }
}); 