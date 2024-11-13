// ==UserScript==
// @name         Cmpedu Resource Downloader
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  机械工业出版社教育服务网资源下载，无需登录，无需教师权限，油猴脚本。
// @author       yanyaoli
// @match        *://*.cmpedu.com/ziyuans/ziyuan/*
// @match        *://*.cmpedu.com/books/book/*
// @connect      *.cmpedu.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // 动态设置 baseUrl，支持 www 和 m 域名
    const isMobile = window.location.host.startsWith('m.');
    const baseUrl = isMobile ? 'http://m.cmpedu.com' : 'http://www.cmpedu.com';

    /**
     * 提取页面中的书籍 ID (BOOK_ID)
     * 适配两种路径：
     * - http://www.cmpedu.com/books/book/12345.htm
     * - http://www.cmpedu.com/ziyuans/ziyuan/12345.htm
     */
    let bookId = null;
    if (window.location.href.includes('books/book')) {
        bookId = window.location.pathname.split("/").pop().split(".")[0];
    } else if (window.location.href.includes('ziyuans/ziyuan')) {
        const bookIdElement = document.getElementById('BOOK_ID');
        bookId = bookIdElement ? bookIdElement.value : null;
    }

    if (!bookId) {
        console.error("无法提取 BOOK_ID");
        return;
    }

    // 资源页面 URL
    const resourceUrl = `${baseUrl}/ziyuans/index.htm?BOOK_ID=${bookId}`;
    const panelId = "downloadPanel";

    /**
     * 创建显示下载链接的 UI 面板
     */
    const createPanel = () => {
        const panel = document.createElement('div');
        panel.id = panelId;
        panel.style = `
            position: fixed;
            top: 20px;
            left: 20px;
            width: 400px;
            max-height: 70vh;
            overflow-y: auto;
            background: #ffffff;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 15px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            z-index: 10000;
        `;
        panel.innerHTML = `<strong>正在加载资源...</strong>`;
        document.body.appendChild(panel);
    };

    /**
     * 更新面板内容
     * @param {string} content 要更新的 HTML 内容
     */
    const updatePanel = (content) => {
        const panel = document.getElementById(panelId);
        if (panel) panel.innerHTML = content;
    };

    createPanel();

    /**
     * 发送请求获取资源页面并解析内容
     */
    GM_xmlhttpRequest({
        method: "GET",
        url: resourceUrl,
        onload: function (response) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(response.responseText, "text/html");

            // 查找所有资源列表
            const resourceDivs = doc.querySelectorAll("div.row.gjzy_list");
            const resources = Array.from(resourceDivs).map(div => {
                const title = div.querySelector("div.gjzy_listRTit")?.textContent.trim() || "未知资源";
                const resourceId = div.querySelector("a")?.href.split("/").pop().split(".")[0];
                return { title, resourceId };
            });

            if (resources.length === 0) {
                updatePanel("<strong>未找到资源。</strong>");
                return;
            }

            let downloadLinksText = "";
            let pendingRequests = resources.length;

            // 遍历资源，获取每个资源的下载链接
            resources.forEach(({ title, resourceId }) => {
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
                        // 匹配 window.location.href 的下载链接
                        const downloadLinks = response.responseText.match(/window\.location\.href=\'(https?:\/\/[^\'"]+)\'/);
                        if (downloadLinks) {
                            const downloadLink = downloadLinks[1];
                            downloadLinksText += `
                                <div style="margin-bottom: 20px; display: flex; align-items: center;">
                                    <strong style="flex: 1;">${title}</strong>
                                    <a href="${downloadLink}" target="_blank" style="text-decoration: none;">
                                        <button style="
                                            display: flex;
                                            align-items: center;
                                            background: #007BFF;
                                            color: #fff;
                                            border: none;
                                            border-radius: 5px;
                                            padding: 10px 15px;
                                            cursor: pointer;
                                            font-size: 14px;
                                            transition: background 0.3s;
                                        " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007BFF'">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 20px; height: 20px; margin-right: 5px;">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M8 10l4 4m0 0l4-4m-4 4V4" />
                                            </svg>
                                            下载
                                        </button>
                                    </a>
                                </div>`;
                        } else {
                            downloadLinksText += `
                                <div style="margin-bottom: 20px; color: red;">
                                    <strong>${title}</strong><br>
                                    未找到下载链接！
                                </div>`;
                        }

                        pendingRequests--;
                        if (pendingRequests === 0) {
                            updatePanel(downloadLinksText || "<strong>未找到有效的下载链接。</strong>");
                        }
                    },
                    onerror: function () {
                        downloadLinksText += `
                            <div style="margin-bottom: 20px; color: red;">
                                <strong>${title}</strong><br>
                                请求下载链接失败！
                            </div>`;
                        pendingRequests--;
                        if (pendingRequests === 0) {
                            updatePanel(downloadLinksText || "<strong>未找到有效的下载链接。</strong>");
                        }
                    }
                });
            });
        },
        onerror: function () {
            updatePanel("<strong>获取资源页面失败。</strong>");
        }
    });
})();
