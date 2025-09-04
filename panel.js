// 面板脚本
let allRequests = [];
let filteredRequests = [];
let selectedRequestIndex = -1;
let searchTerm = '';
let eventListenersAdded = false; // 防止重复添加事件监听器

// 全局函数，供 devtools.js 调用
window.updateRequestData = function(request) {
  // 只处理 Fetch/XHR 请求
  if (isFetchOrXHR(request)) {
    console.log("收到 Fetch/XHR 请求:", request.request.url);
    allRequests.push(request);
    filterRequests();
    updateRequestsList();
  }
};

// 判断是否为 Fetch/XHR 请求
function isFetchOrXHR(request) {
  const url = request.request.url;
  const method = request.request.method;
  
  // 排除 OPTIONS 请求
  if (method === 'OPTIONS') {
    return false;
  }
  
  // 排除静态资源
  if (url.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)(\?.*)?$/i)) {
    return false;
  }
  
  // 排除页面导航
  if (method === 'GET' && request.response.headers.find(h => 
    h.name.toLowerCase() === 'content-type' && 
    h.value.includes('text/html'))) {
    return false;
  }
  
  // 包含 POST 数据或者是 API 请求
  return request.request.postData || 
         url.includes('/api/') || 
         url.includes('/ajax/') ||
         method !== 'GET';
}

// 过滤请求
function filterRequests() {
  if (!searchTerm) {
    filteredRequests = [...allRequests];
  } else {
    filteredRequests = allRequests.filter(request => 
      request.request.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
}

// 搜索功能
function handleSearch(term) {
  searchTerm = term;
  filterRequests();
  selectedRequestIndex = -1; // 重置选择
  updateRequestsList();
  
  // 隐藏标签页并显示无选择提示
  document.getElementById('details-tabs').style.display = 'none';
  document.getElementById('tab-headers').innerHTML = '';
  document.getElementById('tab-preview').innerHTML = '';
  document.getElementById('tab-response').innerHTML = '';
  
  // 显示无选择提示
  const noSelection = document.querySelector('.no-selection');
  if (noSelection) {
    noSelection.style.display = 'block';
  } else {
    document.getElementById('details-content').innerHTML = '<div class="no-selection">选择左侧请求查看详情</div>';
  }
}

// 更新请求列表 - 优化性能，避免重复添加事件监听器
function updateRequestsList() {
  const container = document.getElementById('requests-table');
  
  if (filteredRequests.length === 0) {
    if (allRequests.length === 0) {
      container.innerHTML = '<div class="no-requests">等待 Fetch/XHR 请求...</div>';
    } else {
      container.innerHTML = '<div class="no-requests">没有匹配的请求</div>';
    }
    return;
  }
  
  let html = '';
  
  filteredRequests.forEach((request, index) => {
    const method = request.request.method;
    const url = request.request.url;
    const status = request.response.status || '---';
    const name = getRequestName(url);
    const type = getRequestType(request);
    const size = getRequestSize(request);
    
    html += `
      <div class="request-row ${index === selectedRequestIndex ? 'selected' : ''}" 
           data-index="${index}">
        <div class="request-method">${method}</div>
        <div class="request-status">${status}</div>
        <div class="request-name" title="${url}">${name}</div>
        <div class="request-type">${type}</div>
        <div class="request-size">${size}</div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // 只在第一次或者需要时添加事件监听器
  if (!eventListenersAdded) {
    addEventListeners();
    eventListenersAdded = true;
  }
}

// 获取请求名称 - 显示完整路径
function getRequestName(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname || url;
  } catch (e) {
    // 如果 URL 解析失败，尝试手动提取路径
    const match = url.match(/https?:\/\/[^\/]+(.*)$/);
    return match ? match[1] : url;
  }
}

// 获取请求类型
function getRequestType(request) {
  if (request.request.postData) {
    return 'XHR';
  }
  return 'fetch';
}

// 获取请求大小
function getRequestSize(request) {
  // 尝试多种方式获取大小
  const size = request.response.content?.size || 
               request.response.bodySize || 
               request.response._transferSize || 
               request.response.headers?.find(h => h.name.toLowerCase() === 'content-length')?.value || 
               0;
  
  const sizeNum = parseInt(size);
  if (isNaN(sizeNum) || sizeNum <= 0) return '---';
  
  if (sizeNum < 1024) return sizeNum + 'B';
  if (sizeNum < 1024 * 1024) return Math.round(sizeNum / 1024) + 'KB';
  return Math.round(sizeNum / (1024 * 1024)) + 'MB';
}

// 选择请求
function selectRequest(index) {
  selectedRequestIndex = index;
  updateRequestsList(); // 更新选中状态
  
  const request = filteredRequests[index];
  displayRequestDetails(request);
}

// 显示请求详情
function displayRequestDetails(request) {
  // 显示标签页
  document.getElementById('details-tabs').style.display = 'flex';
  
  // 清空无选择提示 - 更可靠的方式
  const noSelectionElements = document.querySelectorAll('.no-selection');
  noSelectionElements.forEach(element => {
    element.style.display = 'none';
  });
  
  // 显示请求标签页内容
  displayHeadersTab(request);
  displayPreviewTab(request);
  displayResponseTab(request);
  
  // 默认显示请求标签页
  switchTab('headers');
}

// 显示请求标签页
function displayHeadersTab(request) {
  const container = document.getElementById('tab-headers');
  
  let html = '';
  
  // 请求基本信息
  html += '<div class="request-info">';
  html += `<div class="info-row"><span class="info-label">URL:</span><span class="info-value">${request.request.url}</span></div>`;
  html += `<div class="info-row"><span class="info-label">方法:</span><span class="info-value">${request.request.method}</span></div>`;
  html += `<div class="info-row"><span class="info-label">状态:</span><span class="info-value">${request.response.status} ${request.response.statusText || ''}</span></div>`;
  html += '</div>';
  
  // 请求参数
  if (request.request.postData) {
    const params = parseParams(request.request.postData.text);
    
    if (Object.keys(params).length > 0) {
      const keyValueText = formatAsKeyValue(params);
      html += '<div class="params-section">';
      html += '<div class="params-header">';
      html += '<div class="section-title">请求参数 (Request Payload)</div>';
      html += '<button class="copy-btn" data-target="#payload-content">复制</button>';
      html += '</div>';
      html += '<pre class="key-value-format" id="payload-content">' + escapeHtml(keyValueText) + '</pre>';
      html += '</div>';
    } else {
      html += '<div class="params-section">';
      html += '<div class="params-header">';
      html += '<div class="section-title">原始请求数据</div>';
      html += '<button class="copy-btn" data-target="#raw-payload-content">复制</button>';
      html += '</div>';
      html += '<pre class="key-value-format" id="raw-payload-content">' + escapeHtml(request.request.postData.text) + '</pre>';
      html += '</div>';
    }
  }
  
  // 请求头 (只显示 authorization 和 cookie)
  const importantHeaders = getImportantHeaders(request.request.headers);
  if (Object.keys(importantHeaders).length > 0) {
    let headersLines = '';
    for (const [key, value] of Object.entries(importantHeaders)) {
      headersLines += key + ' ' + String(value);
    }
    headersLines = headersLines.trim();
    html += '<div class="params-section">';
    html += '<div class="params-header">';
    html += '<div class="section-title">请求头</div>';
    html += '<button class="copy-btn" data-target="#headers-table">复制</button>';
    html += '</div>';
    html += '<div class="param-table" id="headers-table">';
    for (const [key, value] of Object.entries(importantHeaders)) {
      html += '<div class="param-row">';
      html += '<div class="param-key">' + escapeHtml(key) + '</div>';
      html += '<div class="param-value">' + escapeHtml(String(value)) + '</div>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';
  }
  
  // URL 参数
  const urlParams = getUrlParams(request.request.url);
  if (Object.keys(urlParams).length > 0) {
    html += '<div class="params-section">';
    html += '<div class="section-title">URL 参数 (Query String)</div>';
    html += '<div class="param-table">';
    
    for (const [key, value] of Object.entries(urlParams)) {
      html += '<div class="param-row">';
      html += '<div class="param-key">' + escapeHtml(key) + '</div>';
      html += '<div class="param-value">' + escapeHtml(String(value)) + '</div>';
      html += '</div>';
    }
    
    html += '</div></div>';
  }
  
  if (!request.request.postData && Object.keys(urlParams).length === 0 && Object.keys(importantHeaders).length === 0) {
    html += '<div class="no-selection">该请求没有参数数据</div>';
  }
  
  container.innerHTML = html;
}

// 显示预览标签页
function displayPreviewTab(request) {
  const container = document.getElementById('tab-preview');
  
  // 显示加载状态
  container.innerHTML = '<div class="no-selection">正在加载响应内容...</div>';
  
  // 异步获取响应内容
  getResponseContent(request, (content) => {
    let html = '';
    
    if (content) {
      try {
        // 尝试解析 JSON 并格式化显示
        const jsonData = JSON.parse(content);
        const formattedJson = JSON.stringify(jsonData, null, 2);
        html += '<div class="params-section">';
        html += '<div class="params-header">';
        html += '<div class="section-title">响应预览 (JSON)</div>';
        html += '<button class="copy-btn" data-target="#preview-content">复制</button>';
        html += '</div>';
        html += '<pre class="response-content" id="preview-content">' + escapeHtml(formattedJson) + '</pre>';
        html += '</div>';
      } catch (e) {
        // 如果不是 JSON，直接显示文本
        const previewContent = content.substring(0, 5000);
        html += '<div class="params-section">';
        html += '<div class="params-header">';
        html += '<div class="section-title">响应预览</div>';
        html += '<button class="copy-btn" data-target="#preview-content">复制</button>';
        html += '</div>';
        html += '<pre class="response-content" id="preview-content">' + escapeHtml(previewContent) + '</pre>';
        html += '</div>';
      }
    } else {
      html += '<div class="no-selection">没有响应内容</div>';
    }
    
    container.innerHTML = html;
  });
}

// 显示响应标签页
function displayResponseTab(request) {
  const container = document.getElementById('tab-response');
  
  // 显示加载状态
  container.innerHTML = '<div class="no-selection">正在加载响应内容...</div>';
  
  // 异步获取响应内容
  getResponseContent(request, (content) => {
    let html = '';
    
    if (content) {
      html += '<div class="params-section">';
      html += '<div class="params-header">';
      html += '<div class="section-title">响应内容</div>';
      html += '<button class="copy-btn" data-target="#response-content">复制</button>';
      html += '</div>';
      html += '<pre class="response-content" id="response-content">' + escapeHtml(content) + '</pre>';
      html += '</div>';
    } else {
      html += '<div class="no-selection">没有响应内容</div>';
    }
    
    container.innerHTML = html;
  });
}

// 异步获取响应内容
function getResponseContent(request, callback) {
  // 首先尝试直接从 request 对象获取
  if (request.response.content && request.response.content.text) {
    callback(request.response.content.text);
    return;
  }
  
  // 如果没有直接内容，尝试使用 Chrome DevTools API
  if (request.getContent) {
    request.getContent((content, encoding) => {
      if (content) {
        callback(content);
      } else {
        callback(null);
      }
    });
  } else {
    // 降级方案：检查其他可能的响应内容字段
    const content = request.response.body || 
                   request.response.content?.text || 
                   request.response._body || 
                   null;
    callback(content);
  }
}

// 获取重要的请求头 (authorization 和 cookie)
function getImportantHeaders(headers) {
  const importantHeaders = {};
  
  if (headers) {
    headers.forEach(header => {
      const name = header.name.toLowerCase();
      if (name === 'authorization' || name === 'cookie') {
        importantHeaders[header.name] = header.value;
      }
    });
  }
  
  return importantHeaders;
}

// 切换标签页
function switchTab(tabName) {
  // 更新标签按钮状态
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // 更新标签内容显示
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// 获取 URL 参数
function getUrlParams(url) {
  const params = {};
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch (e) {
    // 如果 URL 解析失败，尝试手动解析
    const queryString = url.split('?')[1];
    if (queryString) {
      queryString.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) {
          params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
      });
    }
  }
  return params;
}

// 解析参数
function parseParams(data) {
  const params = {};
  
  if (!data) return params;
  
  try {
    // 尝试解析 JSON
    const jsonData = JSON.parse(data);
    if (typeof jsonData === 'object' && jsonData !== null) {
      return flattenObject(jsonData);
    }
  } catch (e) {
    // 如果不是 JSON，尝试解析 URL 编码的参数
    const pairs = data.split('&');
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });
  }
  
  return params;
}

// 扁平化对象
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 格式化为 key:value 格式（无空格）
function formatAsKeyValue(params) {
  let result = '';
  for (const [key, value] of Object.entries(params)) {
    result += `${key}:${value}\n`;
  }
  return result.trim();
}

// 复制到剪贴板
function copyToClipboard(text, button) {
  // 优先使用降级方案，因为在 DevTools 面板中 Clipboard API 可能受限
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showCopySuccess(button);
    } else {
      // 如果 execCommand 失败，尝试 Clipboard API
      tryClipboardAPI(text, button);
    }
  } catch (err) {
    console.error('execCommand 复制失败:', err);
    // 尝试 Clipboard API
    tryClipboardAPI(text, button);
  } finally {
    document.body.removeChild(textArea);
  }
}

// 尝试使用 Clipboard API
function tryClipboardAPI(text, button) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showCopySuccess(button);
    }).catch(err => {
      console.error('Clipboard API 也失败:', err);
      showCopyError(button);
    });
  } else {
    showCopyError(button);
  }
}

// 显示复制成功
function showCopySuccess(button) {
  const originalText = button.textContent;
  button.textContent = '已复制';
  button.classList.add('copy-success');
  
  setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove('copy-success');
  }, 2000);
}

// 显示复制失败
function showCopyError(button) {
  const originalText = button.textContent;
  button.textContent = '复制失败';
  button.style.background = '#f44336';
  
  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = '';
  }, 2000);
}

// 添加事件监听器 - 优化性能，使用事件委托
function addEventListeners() {
  // 清除按钮事件
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearRequests);
  }
  
  // 搜索输入框事件
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
  }
  
  // 使用事件委托处理请求行点击和复制按钮点击
  document.addEventListener('click', function(e) {
    // 请求行点击事件
    const requestRow = e.target.closest('.request-row');
    if (requestRow) {
      const index = parseInt(requestRow.getAttribute('data-index'));
      if (!isNaN(index)) {
        selectRequest(index);
      }
      return;
    }
    
    // 复制按钮点击事件
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
      const targetSelector = copyBtn.getAttribute('data-target');
      if (targetSelector) {
        const targetEl = document.querySelector(targetSelector);
        if (targetEl) {
          copyToClipboard(targetEl.textContent, copyBtn);
          return;
        }
      }
      const text = copyBtn.getAttribute('data-text');
      if (text) {
        copyToClipboard(text, copyBtn);
      }
      return;
    }
    
    // 标签页点击事件
    const tabBtn = e.target.closest('.tab-button');
    if (tabBtn) {
      const tabName = tabBtn.getAttribute('data-tab');
      if (tabName) {
        switchTab(tabName);
      }
      return;
    }
  });
}

// 搜索输入处理
function handleSearchInput(e) {
  handleSearch(e.target.value);
}

// 清除请求记录
function clearRequests() {
  allRequests = [];
  filteredRequests = [];
  selectedRequestIndex = -1;
  searchTerm = '';
  
  // 清空搜索框
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // 隐藏标签页
  document.getElementById('details-tabs').style.display = 'none';
  
  // 清空所有标签页内容
  document.getElementById('tab-headers').innerHTML = '';
  document.getElementById('tab-preview').innerHTML = '';
  document.getElementById('tab-response').innerHTML = '';
  
  document.getElementById('requests-table').innerHTML = '<div class="no-requests">等待 Fetch/XHR 请求...</div>';
  
  // 显示无选择提示 - 使用与搜索功能一致的方式
  const noSelection = document.querySelector('.no-selection');
  if (noSelection) {
    noSelection.style.display = 'block';
  } else {
    document.getElementById('details-content').innerHTML = '<div class="no-selection">选择左侧请求查看详情</div>';
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('Params Formatter 面板已加载');
  filterRequests(); // 初始化过滤数组
  addEventListeners();
});

// 使函数全局可用
window.selectRequest = selectRequest;
window.clearRequests = clearRequests;
window.copyToClipboard = copyToClipboard;