// ==UserScript==
// @name         Cmpedu Resource Downloader
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  机械工业出版社教育服务网资源下载，无需登录，无需教师权限，油猴脚本。
// @author       yanyaoli
// @match        *://*.cmpedu.com/ziyuans/ziyuan/*
// @match        *://*.cmpedu.com/books/book/*
// @connect      *.cmpedu.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 样式注入
    GM_addStyle(`
        .cmp-panel { position: fixed; top: 20px; right: 20px; width: 300px; max-height: 70vh; background: #ced6e0; border-radius: 12px; box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15); z-index: 99999; font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; transition: transform 0.2s ease; }
        .panel-header { padding: 16px; background: #a4b0be; border-bottom: 1px solid #747d8c; display: flex; justify-content: space-between; align-items: center; }
        .panel-title { margin: 0; font-size: 16px; color: #1a1a1a; font-weight: 600; }
        .close-btn { background: none; border: none; cursor: pointer; color: #6b7280; font-size: 24px; line-height: 1; padding: 4px; transition: color 0.2s; }
        .close-btn:hover { color: #1a1a1a; }
        .panel-content { padding: 16px; max-height: calc(70vh - 73px); overflow-y: auto; }
        .resource-item { padding: 12px 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
        .resource-item:hover { color: #1e90ff; }
        .resource-item:last-child { border-bottom: none; }
        .skeleton {
            background: #f2f2f2;
            border-radius: 4px;
            height: 20px;
            width: 100%;
            margin-bottom: 12px;
            animation: pulse 1.5s infinite;
        }
        .skeleton:last-child { margin-bottom: 0; }
        .error-message { color: #dc3545; display: flex; align-items: center; gap: 8px; padding: 12px; background: #fff5f5; border-radius: 8px; margin: 8px 0; }
        @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        @media (max-width: 480px) { .cmp-panel { width: 90%; right: 5%; left: auto; top: 10px; } }
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
                <h3 class="panel-title">资源下载</h3>
                <button class="close-btn" aria-label="关闭">×</button>
            </div>
            <div class="panel-content">
                <div class="skeleton"></div>
                <div class="skeleton"></div>
                <div class="skeleton"></div>
            </div>
        `;
        document.body.appendChild(panel);
        panel.querySelector('.close-btn').addEventListener('click', () => panel.remove());
        return panel;
    }

    function updatePanelContent(panel, content) {
        const panelContent = panel.querySelector('.panel-content');
        panelContent.innerHTML = content;
    }

    function createResourceItem(title) {
        return `
            <div class="resource-item">
                <strong style="flex: 1;">${title}</strong>
            </div>
        `;
    }

    function updateResourceItem(panel, index, content, downloadLink) {
        const items = panel.querySelectorAll('.resource-item');
        if(items[index]) {
            const item = items[index];
            item.innerHTML = `<strong style="flex: 1;">${content}</strong>`;
            item.style.cursor = 'pointer';
            item.setAttribute('data-download-link', downloadLink);
            item.onclick = () => window.open(downloadLink, '_blank');
        } else {
            // If we don't have an existing item, append a new one
            const panelContent = panel.querySelector('.panel-content');
            const newItem = document.createElement('div');
            newItem.className = 'resource-item';
            newItem.innerHTML = `<strong style="flex: 1;">${content}</strong>`;
            newItem.style.cursor = 'pointer';
            newItem.setAttribute('data-download-link', downloadLink);
            newItem.onclick = () => window.open(downloadLink, '_blank');
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
        onload: function(response) {
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
                updatePanelContent(panel, "<strong>未找到资源。</strong>");
                return;
            }

            // Clear skeleton placeholders before adding real content
            updatePanelContent(panel, '');

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
                    onload: function(response) {
                        const [resourceTitle, downloadLink] = processResourceResponse(response, title);
                        if (resourceTitle) {
                            updateResourceItem(panel, index, resourceTitle, downloadLink);
                        } else {
                            updateResourceItem(panel, index, `${title} - 链接解析失败`, null);
                        }
                    },
                    onerror: function() {
                        updateResourceItem(panel, index, `${title} - 请求失败`, null);
                    }
                });
            });
        },
        onerror: function() {
            updatePanelContent(panel, "<strong>获取资源页面失败。</strong>");
        }
    });
})();
