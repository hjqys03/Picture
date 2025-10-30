// ==UserScript==
// @name         ExHentai Archive Downloader (Original Only)
// @namespace    https://e-hentai.org/
// @version      1.2
// @description  归档下载功能
// @author       ????
// @icon            https://e-hentai.org/favicon.ico
// @match        https://exhentai.org/g/*/*
// @match        https://e-hentai.org/g/*/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  (function exhy_addArchiveButtonStyle() {
      if (document.getElementById("exhy-archive-btn-style")) return;
      const style = document.createElement("style");
      style.id = "exhy-archive-btn-style";
      style.textContent = `
        /* 仅影响本脚本的按钮 */
        .exhy-archive-helper-one-click {
            width: 14.5px;
            height: 14.5px;
            background: radial-gradient(#ffc36b,#c56a00);
            border-radius: 15px;
            border: 1px #666 solid;
            box-sizing: border-box;
            color: #ebeae9;
            text-align: center;
            line-height: 15px;
            cursor: pointer;
            user-select: none;
            display: inline-block;
            margin-left: 6px;
        }
        .exhy-archive-helper-one-click:hover {
            background: radial-gradient(#bf893b,#985200);
        }
        .exhy-archive-helper-one-click.bt {
            background: radial-gradient(#a2d04f,#5fb213);
        }
        .exhy-archive-helper-one-click.bt:hover {
            background: radial-gradient(#95cf2b,#427711);
        }
        .exhy-archive-helper-one-click i {
            font-style: initial;
            transform: scale(0.7);
            margin-left: -1.5px;
        }
        .exhy-archive-helper-one-click svg circle {
            stroke: #fff !important;
            stroke-width: 15px !important;
        }
        .exhy-archive-helper-one-click svg {
            width: 10px;
            display: inline-block;
            height: 10px;
            padding-top: 1.3px;
        }
      `;
      document.head.appendChild(style);
  })();

  // --- 工具函数 ---
  function log(...args) { console.log('[ArchiveDownloader]', ...args); }
  async function getDoc(url, options = {}) {
    const res = await fetch(url, options);
    const html = await res.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }

  // --- 获取归档页面 ---
  async function fetchArchivePopup() {
    const archiveLink = document.querySelector('#gd5 > p:nth-child(2) a');
    if (!archiveLink) {
      alert('未找到归档下载链接');
      return null;
    }

    const onClick = archiveLink.getAttribute('onclick');
    const match = onClick && onClick.match(/(https:\/\/\S+)',\d+,\d+/);
    if (!match) {
      alert('无法解析归档链接');
      return null;
    }

    const link = match[1];
    const doc = await getDoc(link);
    return doc.querySelector('#db');
  }

  // --- 只下载原始分辨率 ---
  async function sendDownloadRequest(url) {
    const params = 'dlcheck=Download Original Archive&dltype=org';

    const res = await fetch(url, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const html = await res.text();
    if (!html.includes('Locating archive server')) {
      console.warn('下载失败:', html);
      alert('下载失败，请检查控制台');
      return;
    }

    const match = html.match(/document\.location = "(.*)"/);
    if (match && match[1]) {
      window.location.href = `${match[1]}?start=1`;
    } else {
      alert('未能找到下载链接');
    }
  }

  // --- 注入按钮 ---
  function injectButton() {
      const container = document.querySelector('#gd5 > p:nth-child(2)');
      if (!container) return;

  const btn = document.createElement('span');
  btn.className = 'exhy-archive-helper-one-click';
  btn.title = '原档下载';
  btn.style.marginLeft = "5px"; // 按钮和文字间距
  btn.innerHTML = `<i style="
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      font-size: 4px;    /* 调整箭头大小 */
      line-height: 1;
      margin: 0;
      transform: none;
  ">🡇</i>`;
  container.appendChild(btn);

    btn.addEventListener('click', async () => {
        btn.classList.add('is-fetching');
        const popup = await fetchArchivePopup();
        if (!popup) {
            btn.classList.remove('is-fetching');
            return;
        }

        const form = popup.querySelector('form[action*="archiver.php"]');
        if (!form) {
            alert('未找到归档表单');
            btn.classList.remove('is-fetching');
            return;
        }

        const action = form.getAttribute('action');
        await sendDownloadRequest(action);
        btn.classList.remove('is-fetching');
    });
}

  // --- 启动 ---
  window.addEventListener('load', injectButton);
})();
