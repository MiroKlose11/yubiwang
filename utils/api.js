// 文章API接口

/**
 * 获取文章列表
 * 
 * @param {Object|Number} params 参数对象，如果是数字则表示页码
 * @param {Number} params.page 页码，默认1
 * @param {Number} params.pageSize 每页条数，默认10 
 * @param {Number} params.channel_id 分类ID，可选
 * @param {String} params.keyword 搜索关键词，可选
 * @param {String} params.order 排序方式，可选，默认为"weigh desc,publishtime desc"
 * @param {Boolean} params.fetchAllTop 是否获取所有置顶文章，默认true
 * @returns {Promise} 返回Promise对象
 */
function getArticleList(params = {}) {
  const { 
    page = 1, 
    pageSize = 10, 
    channel_id, 
    keyword,
    order = "weigh desc,publishtime desc",
    fetchAllTop = true
  } = typeof params === 'object' ? params : { page: params };
  
  return new Promise(async (resolve, reject) => {
    try {
      // 基础查询参数
      const baseParams = {
        ...(channel_id ? { channel_id } : {}),
        ...(keyword ? { keyword } : {})
      };
      
      // 如果需要获取所有置顶文章且是第一页
      if (fetchAllTop && page === 1) {
        // 1. 先获取所有置顶文章（weigh > 0）
        const topResult = await new Promise((innerResolve, innerReject) => {
          wx.request({
            url: 'https://www.yubi.wang/api/article/list',
            method: 'GET',
            data: {
              ...baseParams,
              weigh_gt: 0,  // 查询weigh大于0的文章
              page: 1,
              limit: 100,   // 设置较大的限制以获取所有置顶文章
              order: "weigh desc,publishtime desc"
            },
            success: (res) => {
              if (res.data && res.data.code === 1) {
                innerResolve(res.data);
              } else {
                innerReject(res.data || { msg: '获取置顶文章失败' });
              }
            },
            fail: (err) => {
              innerReject(err || { msg: '网络请求失败' });
            }
          });
        });
        
        // 2. 获取普通文章（页面上剩余的位置）
        const topArticlesCount = topResult.data ? topResult.data.length : 0;
        const normalLimit = Math.max(0, pageSize - topArticlesCount);
        
        if (normalLimit > 0) {
          // 再获取普通文章
          const normalResult = await new Promise((innerResolve, innerReject) => {
            wx.request({
              url: 'https://www.yubi.wang/api/article/list',
              method: 'GET',
              data: {
                ...baseParams,
                weigh: 0,   // 查询weigh等于0的文章
                page: 1,
                limit: normalLimit,
                order: "publishtime desc"
              },
              success: (res) => {
                if (res.data && res.data.code === 1) {
                  innerResolve(res.data);
                } else {
                  innerReject(res.data || { msg: '获取普通文章失败' });
                }
              },
              fail: (err) => {
                innerReject(err || { msg: '网络请求失败' });
              }
            });
          });
          
          // 3. 合并置顶和普通文章
          const allArticles = [
            ...(topResult.data || []),
            ...(normalResult.data || [])
          ];
          
          // 构造返回结果
          resolve({
            code: 1,
            data: allArticles,
            // 标记这是合并的结果
            isMergedResult: true
          });
          return;
        } else {
          // 置顶文章已经足够填满当前页面
          resolve(topResult);
          return;
        }
      }
      
      // 常规分页请求（除了第一页以外的请求）
      wx.request({
        url: 'https://www.yubi.wang/api/article/list',
        method: 'GET',
        data: {
          ...baseParams,
          page,
          limit: pageSize,
          order,
          // 如果不是第一页，只获取非置顶文章
          ...(page > 1 ? { weigh: 0 } : {})
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
    } catch (error) {
      reject(error || { msg: '获取文章列表失败' });
    }
  });
}

/**
 * 获取页面列表
 * 
 * @param {Object} params 参数对象
 * @param {String} params.type 页面类型，可选筛选
 * @returns {Promise} 返回Promise对象
 */
function getPageList(params = {}) {
  const { type = 'page_whole' } = params;
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://www.yubi.wang/api/page/list',
      method: 'GET',
      data: {
        type
      },
      success: (res) => {
        if (res.data && res.data.code === 1) {
          resolve(res.data);
        } else {
          reject(res.data || { msg: '获取页面列表失败' });
        }
      },
      fail: (err) => {
        reject(err || { msg: '网络请求失败' });
      }
    });
  });
}

/**
 * 获取页面详情
 * 
 * @param {Number} id 页面ID
 * @returns {Promise} 返回Promise对象
 */
function getPageDetail(id) {
  if (!id) {
    return Promise.reject({ msg: '页面ID不能为空' });
  }
  
  console.log('准备请求页面详情API, ID:', id);
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://www.yubi.wang/api/page/detail',
      method: 'GET',
      data: {
        id
      },
      header: {
        'content-type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      success: (res) => {
        console.log('页面详情API响应状态码:', res.statusCode);
        console.log('页面详情API返回数据:', res.data);
        
        if (res.statusCode === 200) {
          if (res.data && res.data.code === 1) {
            resolve(res.data);
          } else {
            const errorMsg = (res.data && res.data.msg) ? res.data.msg : '获取页面详情失败';
            console.error('API返回错误:', errorMsg);
            reject({ msg: errorMsg, data: res.data });
          }
        } else {
          console.error('API请求失败，状态码:', res.statusCode);
          reject({ msg: `请求失败，状态码: ${res.statusCode}` });
        }
      },
      fail: (err) => {
        console.error('获取页面详情网络请求失败:', err);
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
  searchArticles,
  getPageList,
  getPageDetail
}; 