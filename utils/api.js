// 文章API接口

/**
 * 获取文章列表
 * 
 * @param {Object|Number} params 参数对象，如果是数字则表示页码
 * @param {Number} params.page 页码，默认1
 * @param {Number} params.pageSize 每页条数，默认10 
 * @param {Number} params.channel_id 分类ID，可选
 * @param {String} params.keyword 搜索关键词，可选
 * @returns {Promise} 返回Promise对象
 */
function getArticleList(params = {}) {
  const { page = 1, pageSize = 10, channel_id, keyword } = typeof params === 'object' ? params : { page: params };
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://www.yubi.wang/api/article/list',
      method: 'GET',
      data: {
        page,
        limit: pageSize,
        ...(channel_id ? { channel_id } : {}),
        ...(keyword ? { keyword } : {})
      },
      success: (res) => {
        if (res.data && res.data.code === 1) {
          resolve(res.data);
        } else {
          reject(res.data || { msg: '获取文章列表失败' });
        }
      },
      fail: (err) => {
        reject(err || { msg: '网络请求失败' });
      }
    });
  });
}

/**
 * 获取文章详情
 * @param {String} id 文章ID
 */
const getArticleDetail = (id) => {
  console.log('请求文章详情, ID:', id);
  return new Promise((resolve, reject) => {
    wx.request({
      url: `https://www.yubi.wang/api/article/detail?id=${id}`,
      method: 'GET',
      success: (res) => {
        console.log('文章详情接口返回:', res);
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail: (err) => {
        console.error('获取文章详情失败:', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取文章分类列表
 */
const getCategories = () => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://www.yubi.wang/api/category/list',
      method: 'GET',
      success: (res) => {
        console.log('分类列表接口返回:', res);
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail: (err) => {
        console.error('获取分类列表失败:', err);
        reject(err);
      }
    });
  });
};

/**
 * 搜索文章
 * 
 * @param {Object} params 参数对象
 * @param {String} params.search 搜索关键词
 * @param {Number} params.page 页码，默认1
 * @param {Number} params.pagesize 每页条数，默认10
 * @returns {Promise} 返回Promise对象
 */
function searchArticles(params = {}) {
  const { search, page = 1, pagesize = 10 } = params;
  
  if (!search) {
    return Promise.reject({ msg: '搜索关键词不能为空' });
  }
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://www.yubi.wang/addons/cms/search/api',
      method: 'GET',
      data: {
        q: search, // 使用q作为搜索参数
        page,
        pagesize,
        fields: 'id,title,description,image,channel_id,createtime,publishtime,views,dislikes,likes' // 指定返回的字段
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 检查业务层返回码
          const data = res.data;
          if (data && data.code === 1) {
            resolve(data);
          } else {
            reject({ msg: data.msg || '搜索文章失败' });
          }
        } else {
          reject({ msg: '搜索接口异常' });
        }
      },
      fail: (err) => {
        reject({ msg: '网络请求失败' });
      }
    });
  });
}

// 导出函数
module.exports = {
  getArticleList,
  getArticleDetail,
  getCategories,
  searchArticles
}; 