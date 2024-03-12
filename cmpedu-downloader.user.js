// ==UserScript==
// @name         Cmpedu Resource Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Download resources from CMPEDU
// @author       yanyaoli
// @match        http://www.cmpedu.com/ziyuans/ziyuan/*
// @match        http://www.cmpedu.com/books/book/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    var bookId;
    if (window.location.href.includes('books/book')) {
        bookId = window.location.href.split("/").pop().split(".")[0];
    } else if (window.location.href.includes('ziyuans/ziyuan')) {
        bookId = document.getElementById('BOOK_ID').value;
    }
    var url = "http://www.cmpedu.com/ziyuans/index.htm?BOOK_ID=" + bookId;
    var downloadLinksText = "";

    // Create a panel for download links
    var panel = document.createElement('div');
    panel.id = 'downloadPanel';
    panel.style = 'position:fixed;top:30px;left:10px;width:300px;height:auto;overflow:auto;background:white;z-index:10000;padding:10px;border:1px solid gray;word-break:break-all';
    document.body.appendChild(panel);

    GM_xmlhttpRequest({
        method: "GET",
        url: url,
        onload: function(response) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(response.responseText, "text/html");
            var resourceDivs = doc.querySelectorAll("div.row.gjzy_list");
            var requestsRemaining = resourceDivs.length;

            resourceDivs.forEach(function(resourceDiv) {
                var resourceTitle = resourceDiv.querySelector("div.gjzy_listRTit").textContent.trim();
                var resourceId = resourceDiv.querySelector("a").href.split("/").pop().split(".")[0];
                var downloadUrl = "http://www.cmpedu.com/ziyuans/d_ziyuan.df?id=" + resourceId;

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
                        var downloadLinks = response.responseText.match(/window\.location\.href=\'(https?:\/\/[^\'"]+)\'/);
                        if (downloadLinks) {
                            var downloadLink = downloadLinks[1];
                            downloadLinksText += resourceTitle + '<br><a href="' + downloadLink + '" target="_blank">Download</a><br><br>';
                        } else {
                            downloadLinksText += resourceTitle + " Download link was not found!";
                        }
                        requestsRemaining--;
                        if (requestsRemaining === 0) {
                            panel.innerHTML = downloadLinksText.replace(/(<br><br>)+$/, "");
                        }
                    },
                    onerror: function() {
                        downloadLinksText += resourceTitle + " Download request failed!";
                        requestsRemaining--;
                        if (requestsRemaining === 0) {
                            panel.innerHTML = downloadLinksText.replace(/(<br><br>)+$/, "");
                        }
                    }
                });
            });
        }
    });
})();