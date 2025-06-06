// ==UserScript==
// @name         Cmpedu Resource Downloader
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  机械工业出版社教育服务网资源下载，无需登录，无需教师权限，油猴脚本。
// @author       yanyaoli
// @match        *://*.cmpedu.com/ziyuans/ziyuan/*
// @match        *://*.cmpedu.com/books/book/*
// @connect      *.cmpedu.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @downloadURL https://update.greasyfork.org/scripts/483095/Cmpedu%20Resource%20Downloader.user.js
// @updateURL https://update.greasyfork.org/scripts/483095/Cmpedu%20Resource%20Downloader.meta.js
// ==/UserScript==

(function () {
  'use strict';

  // 样式注入
  GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :root {
            --panel-bg: rgba(250, 250, 250, 0.95);
            --panel-border: rgba(0, 0, 0, 0.06);
            --header-bg: rgba(255, 255, 255, 0.8);
            --text-primary: #000000;
            --text-secondary: #6e6e73;
            --accent-color: #0071e3;
            --accent-hover: #0077ed;
            --item-hover: rgba(0, 0, 0, 0.03);
            --item-active: rgba(0, 0, 0, 0.05);
            --item-border: rgba(0, 0, 0, 0.06);
            --error-color: #ff3b30;
            --success-color: #34c759;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --panel-bg: rgba(40, 40, 40, 0.95);
                --panel-border: rgba(255, 255, 255, 0.1);
                --header-bg: rgba(50, 50, 50, 0.8);
                --text-primary: #ffffff;
                --text-secondary: #a1a1a6;
                --item-hover: rgba(255, 255, 255, 0.05);
                --item-active: rgba(255, 255, 255, 0.1);
                --item-border: rgba(255, 255, 255, 0.1);
            }
        }

        .cmp-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            max-height: 75vh;
            background: var(--panel-bg);
            border-radius: 16px;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            z-index: 99999;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
            overflow: hidden;
            transition: left 0.1s ease-out, top 0.1s ease-out;
            border: 1px solid var(--panel-border);
            transform-origin: top right;
            opacity: 0;
            transform: scale(0.95);
            animation: panel-appear 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes panel-appear {
            0% { opacity: 0; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
        }

        .panel-header {
            padding: 16px 20px;
            background: var(--header-bg);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-bottom: 1px solid var(--item-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 1;
        }

        .panel-title {
            margin: 0;
            font-size: 16px;
            color: var(--text-primary);
            font-weight: 600;
            letter-spacing: -0.01em;
        }

        .close-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-secondary);
            font-size: 22px;
            line-height: 1;
            padding: 4px;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            margin: -4px;
        }

        .close-btn:hover {
            background-color: var(--item-hover);
            color: var(--text-primary);
        }

        .close-btn:active {
            background-color: var(--item-active);
            transform: scale(0.95);
        }

        .panel-content {
            padding: 8px 0;
            max-height: calc(75vh - 60px);
            overflow-y: auto;
            overflow-x: hidden;
            scrollbar-width: thin;
            scrollbar-color: var(--text-secondary) transparent;
        }

        .panel-content::-webkit-scrollbar {
            width: 6px;
        }

        .panel-content::-webkit-scrollbar-track {
            background: transparent;
        }

        .panel-content::-webkit-scrollbar-thumb {
            background-color: var(--text-secondary);
            border-radius: 3px;
            opacity: 0.5;
        }

        .resource-item {
            padding: 12px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--item-border);
            cursor: pointer;
            transition: all 0.15s ease;
            position: relative;
            color: var(--text-primary);
        }

        .resource-item:last-child {
            border-bottom: none;
        }

        .resource-item:hover {
            background-color: var(--item-hover);
        }

        .resource-item:active {
            background-color: var(--item-active);
        }

        .resource-item.disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .resource-item .title {
            flex: 1;
            font-weight: 500;
            font-size: 14px;
            margin-right: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .resource-item .download-icon {
            color: var(--accent-color);
            font-size: 16px;
            transition: color 0.2s ease;
            margin-left: 5px;
        }

        .resource-item .download-icon:hover {
            color: var(--accent-hover);
        }

        .skeleton {
            height: 20px;
            margin: 12px 20px;
            border-radius: 6px;
            background: linear-gradient(90deg,
                var(--item-border) 0%,
                var(--item-hover) 50%,
                var(--item-border) 100%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
        }

        .skeleton:nth-child(2) {
            width: 85%;
        }

        .skeleton:nth-child(3) {
            width: 70%;
        }

        @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        .empty-state {
            padding: 40px 20px;
            text-align: center;
            color: var(--text-secondary);
            font-size: 14px;
        }

        .error-message {
            color: var(--error-color);
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: rgba(255, 59, 48, 0.1);
            border-radius: 8px;
            margin: 12px 20px;
            font-size: 14px;
        }

        .success-message {
            color: var(--success-color);
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: rgba(52, 199, 89, 0.1);
            border-radius: 8px;
            margin: 12px 20px;
            font-size: 14px;
        }

        .github-icon {
            width: 16px;
            height: 16px;
            cursor: pointer;
            transition: transform 0.2s ease;
        }

        .github-icon:hover {
            transform: scale(1.1);
        }

        .panel-footer {
            padding: 12px 20px;
            border-top: 1px solid var(--item-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: var(--text-secondary);
        }

        @media (max-width: 480px) {
            .cmp-panel {
                width: calc(100% - 32px);
                right: 16px;
                left: 16px;
                top: 16px;
                max-height: 80vh;
            }
        }
    `);

  // 基础配置
  const isMobile = window.location.host.startsWith('m.');
  const baseUrl = isMobile ? 'http://m.cmpedu.com' : 'http://www.cmpedu.com';
  const panelId = "downloadPanel";

  function extractBookId() {
    if (window.location.href.includes('books/book')) {
      return window.location.pathname.split("/").pop().split(".")[0];
    }
    if (window.location.href.includes('ziyuans/ziyuan')) {
      const el = document.getElementById('BOOK_ID');
      return el ? el.value : null;
    }
    return null;
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = panelId;
    panel.className = 'cmp-panel';
    panel.innerHTML = `
            <div class="panel-header">
                <h3 class="panel-title">机工教育资源下载</h3>
                <button class="close-btn" aria-label="关闭">×</button>
            </div>
            <div class="panel-content">
                <div class="skeleton"></div>
                <div class="skeleton"></div>
                <div class="skeleton"></div>
            </div>
            <div class="panel-footer">
                <span>v3.1</span>
                <a href="https://github.com/yanyaoli/cmpedu-dl" target="_blank">
                    <img src="https://simpleicons.org/icons/github.svg" alt="GitHub" class="github-icon" />
                </a>
            </div>
        `;
    document.body.appendChild(panel);

    // 添加关闭动画
    panel.querySelector('.close-btn').addEventListener('click', () => {
      panel.style.opacity = '0';
      panel.style.transform = 'scale(0.95)';
      setTimeout(() => panel.remove(), 300);
    });

    // 拖动面板
    const header = panel.querySelector('.panel-header');
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      offset.x = e.clientX - panel.getBoundingClientRect().left;
      offset.y = e.clientY - panel.getBoundingClientRect().top;
      document.body.style.cursor = 'grabbing'; // 改成抓取手势
      e.preventDefault(); // 防止文本选择
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      // 确保面板的移动使用 `requestAnimationFrame`
      window.requestAnimationFrame(() => {
        panel.style.left = `${e.clientX - offset.x}px`;
        panel.style.top = `${e.clientY - offset.y}px`;
      });
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.cursor = 'default'; // 恢复光标
    });

    return panel;
  }

  function updatePanelContent(panel, content) {
    const panelContent = panel.querySelector('.panel-content');
    panelContent.innerHTML = content;
  }

  function createResourceItem(title, index) {
    return `
            <div class="resource-item" data-index="${index}">
                <div class="title">${title}</div>
                <svg class="download-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            </div>
        `;
  }

  function updateResourceItem(panel, index, content, downloadLink) {
    const items = panel.querySelectorAll('.resource-item');
    let item = null;

    // 查找对应索引的项目
    for (let i = 0; i < items.length; i++) {
      if (items[i].getAttribute('data-index') == index) {
        item = items[i];
        break;
      }
    }

    if (item) {
      if (downloadLink) {
        item.innerHTML = `
                    <div class="title">${content}</div>
                    <svg class="download-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                `;
        item.style.cursor = 'pointer';
        item.classList.remove('disabled');
        item.setAttribute('data-download-link', downloadLink);

        // 添加点击效果
        item.onclick = () => {
          window.open(downloadLink, '_blank');
        };
      } else {
        item.innerHTML = `
                    <div class="title">${content}</div>
                    <span style="font-size: 12px; color: var(--error-color);">无法下载</span>
                `;
        item.classList.add('disabled');
        item.style.cursor = 'not-allowed';
      }
    } else {
      // 如果没有找到现有项，添加新项
      const panelContent = panel.querySelector('.panel-content');
      const newItem = document.createElement('div');
      newItem.className = 'resource-item';
      newItem.setAttribute('data-index', index);

      if (downloadLink) {
        newItem.innerHTML = `
                    <div class="title">${content}</div>
                    <svg class="download-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                `;
        newItem.style.cursor = 'pointer';
        newItem.setAttribute('data-download-link', downloadLink);
        newItem.onclick = () => {
          window.open(downloadLink, '_blank');
        };
      } else {
        newItem.innerHTML = `
                    <div class="title">${content}</div>
                    <span style="font-size: 12px; color: var(--error-color);">无法下载</span>
                `;
        newItem.classList.add('disabled');
        newItem.style.cursor = 'not-allowed';
      }

      panelContent.appendChild(newItem);
    }
  }

  function processResourceResponse(response, title) {
    const downloadLinks = response.responseText.match(/window\.location\.href=\'(https?:\/\/[^\'"]+)\'/);
    if (downloadLinks) {
      return [title, downloadLinks[1]];
    }
    return [null, null];
  }

  // 主逻辑
  const bookId = extractBookId();
  if (!bookId) {
    console.error("无法提取 BOOK_ID");
    return;
  }

  const resourceUrl = `${baseUrl}/ziyuans/index.htm?BOOK_ID=${bookId}`;
  const panel = createPanel();

  GM_xmlhttpRequest({
    method: "GET",
    url: resourceUrl,
    onload: function (response) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.responseText, "text/html");
      const resourceDivs = doc.querySelectorAll("div.row.gjzy_list");
      const resources = Array.from(resourceDivs).map(div => {
        return {
          title: div.querySelector("div.gjzy_listRTit")?.textContent.trim() || "未知资源",
          resourceId: div.querySelector("a")?.href.split("/").pop().split(".")[0]
        };
      });

      if (resources.length === 0) {
        updatePanelContent(panel, `
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <p>未找到可下载的资源</p>
                    </div>
                `);
        return;
      }

      // 清除骨架屏，添加真实内容
      updatePanelContent(panel, '');

      // 先显示所有资源项的占位
      resources.forEach(({ title }, index) => {
        const panelContent = panel.querySelector('.panel-content');
        const itemHTML = createResourceItem(title, index);
        panelContent.innerHTML += itemHTML;
      });

      // 然后逐个请求下载链接
      resources.forEach(({ title, resourceId }, index) => {
        const downloadUrl = `${baseUrl}/ziyuans/d_ziyuan.df?id=${resourceId}`;
        GM_xmlhttpRequest({
          method: "GET",
          url: downloadUrl,
          headers: {
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
            "Accept": "text/html, */*; q=0.01",
            "User-Agent": "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5",
            "Accept-Language": "en-US,en;q=0.9",
            "X-Requested-With": "XMLHttpRequest"
          },
          onload: function (response) {
            const [resourceTitle, downloadLink] = processResourceResponse(response, title);
            if (resourceTitle) {
              updateResourceItem(panel, index, resourceTitle, downloadLink);
            } else {
              updateResourceItem(panel, index, `${title} - 链接解析失败`, null);
            }
          },
          onerror: function () {
            updateResourceItem(panel, index, `${title} - 请求失败`, null);
          }
        });
      });
    },
    onerror: function () {
      updatePanelContent(panel, `
                <div class="error-message">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>获取资源页面失败，请刷新重试</span>
                </div>
            `);
    }
  });
})();
