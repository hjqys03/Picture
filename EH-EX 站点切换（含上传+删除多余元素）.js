// ==UserScript==
// @name         EH/EX 站点切换（含上传+删除多余元素）
// @namespace    https://tampermonkey.net/
// @version      1.9
// @description  EH/EX 一键切换；修复 upload/upld 路径映射；在 e-hentai.org、exhentai.org、upload.e-hentai.org、upld.exhentai.org 删除计时器/悬赏/种子按钮及 g/ 页面怪物事件框，保留 HentaiVerse 等其它项。
// @author       HeartThrob
// @match        https://e-hentai.org/*
// @match        https://exhentai.org/*
// @match        https://upload.e-hentai.org/*
// @match        https://upld.exhentai.org/*
// @icon        https://e-hentai.org/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const nav = document.getElementById('nb');
    if (!nav) return;

    const url = new URL(window.location.href);
    let hostname = location.hostname;
    let mapped = true;

    if (hostname === 'e-hentai.org') {
        url.hostname = 'exhentai.org';
    } else if (hostname === 'exhentai.org') {
        url.hostname = 'e-hentai.org';
    } else if (hostname === 'upload.e-hentai.org') {
        url.hostname = 'upld.exhentai.org';
        if (!url.pathname.startsWith('/upld')) {
            url.pathname = '/upld' + url.pathname;
        }
    } else if (hostname === 'upld.exhentai.org') {
        url.hostname = 'upload.e-hentai.org';
        if (url.pathname.startsWith('/upld')) {
            url.pathname = url.pathname.replace(/^\/upld/, '') || '/';
        }
    } else {
        mapped = false;
    }

    if (mapped) {
        const targetUrl = url.toString();

        const sampleAnchor = nav.querySelector('a');
        if (sampleAnchor) {
            const sampleDiv = sampleAnchor.parentElement || null;
            let newDiv = sampleDiv ? sampleDiv.cloneNode(false) : document.createElement('div');
            let newA = sampleAnchor.cloneNode(false) || document.createElement('a');

            newA.href = targetUrl;
            newA.textContent = 'Eh/Ex 切换';
            newA.style.cursor = 'pointer';

            newDiv.appendChild(newA);
            nav.appendChild(newDiv);
        }
    }

    // === 删除 e-hentai.org / exhentai.org / upload.e-hentai.org / upld.exhentai.org 多余元素 ===
    if (['e-hentai.org', 'exhentai.org', 'upload.e-hentai.org', 'upld.exhentai.org'].includes(hostname)) {
        // 删除计时器按钮（宽度=70px）
        nav.querySelectorAll('div > a[style*="70px"]').forEach(a => a.parentElement?.remove());

        // 删除 "悬赏"
        nav.querySelector('a[href*="bounty.php"]')?.parentElement?.remove();

        // 删除 "种子"
        nav.querySelector('a[href*="torrents.php"]')?.parentElement?.remove();

        // 将事件框改为非阻塞提示
        const eventPane = document.getElementById('eventpane');
        if (eventPane) {
            // 获取内容
            const originalText = eventPane.textContent.trim().replace(/\s+/g, ' ');
            const preview = originalText.length > 100 ? originalText.slice(0, 100) + "..." : originalText;

            // 删除事件框
            eventPane.remove();

            // 显示非阻塞提示
            function showToast(message) {
                let container = document.querySelector('.eh-toast-container');
                if (!container) {
                    container = document.createElement('div');
                    container.className = 'eh-toast-container';
                    document.body.appendChild(container);
                }

                const toast = document.createElement('div');
                toast.className = 'eh-toast';
                toast.textContent = message;
                container.appendChild(toast);

                setTimeout(() => {
                    toast.remove();
                    if (!container.children.length) container.remove();
                }, 5200);
            }

            // 立即显示提示
            showToast(`📦 ${preview}`);
        }
    }
})();
