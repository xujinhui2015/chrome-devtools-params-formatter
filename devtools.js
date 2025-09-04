let panelWindow = null;

// 创建一个 DevTools 面板
chrome.devtools.panels.create(
  "Params Formatter",
  null,
  "panel.html",
  function(panel) {
    console.log("DevTools Params Formatter 面板已创建");
    
    // 当面板显示时获取窗口引用
    panel.onShown.addListener(function(window) {
      panelWindow = window;
      console.log("面板窗口已获取");
    });
    
    panel.onHidden.addListener(function() {
      console.log("面板已隐藏");
    });
  }
);

// 监听网络请求选择
chrome.devtools.network.onNavigated.addListener(function() {
  console.log("页面导航");
});

// 监听网络请求完成
chrome.devtools.network.onRequestFinished.addListener(function(request) {
  console.log("网络请求完成:", request.request.url);
  
  // 存储请求数据供面板使用
  if (panelWindow && panelWindow.updateRequestData) {
    panelWindow.updateRequestData(request);
  }
});

// 获取当前选中的网络请求
function getCurrentNetworkRequest() {
  // 这个功能需要用户手动选择，我们通过面板界面来实现
  return null;
}
