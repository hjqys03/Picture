// ==UserScript==
// @name         绅士漫画 → e-hentai & hdoujin 相似画廊搜索
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  在 绅士漫画 中添加 e-hentai & hdoujin 相似画廊搜索，自动检测总页数，按页码顺序并发抓取所有分页预览图
// @match        https://www.wnacg.com/*
// @grant        none
// @run-at       document-end
// @icon         http://www.wnacg.com/favicon.ico
// ==/UserScript==

(function () {
  "use strict";

  // ====== 标题清洗逻辑 ======
  const PATTERN_TITLE_PREFIX =
        /^(?:(?:\([^)]*\))|(?:\[[^\]]*\])|(?:\{[^}]*\})|\s+)*/g;
  const PATTERN_TITLE_SUFFIX =
        /(?:\s+ch.[\s\d-]+)?(?:(?:\([^)]*\))|(?:\[[^\]]*\])|(?:\{[^}]*\})|\s+)*$/gi;

  function cleanTitle(raw) {
    if (!raw) return "";
    let extractTitle = raw
      .replaceAll(PATTERN_TITLE_PREFIX, "")
      .replaceAll(PATTERN_TITLE_SUFFIX, "");
    const separateIndex = extractTitle.search(/\||｜|︱|\+/);
    if (separateIndex >= 0) extractTitle = extractTitle.slice(0, separateIndex).trim();
    return extractTitle.trim();
  }

  function buildEHUrl(title) {
    return "https://e-hentai.org/?f_search=" + encodeURIComponent(`"${title}"`) + "&advsearch=1";
  }

  function buildHdoujinUrl(title) {
    return "https://hdoujin.org/browse?s=" + encodeURIComponent(`^${title}$`);
  }

  // ====== 添加按钮 ======
  function processContainer(container) {
    if (!container || container._wn_eh_processed) return;
    const readBtn = container.querySelector('a.btn[href*="/photos-slide-aid-"]');
    if (!readBtn) return;
    if (container.querySelector("a.wn-eh-search-btn")) {
      container._wn_eh_processed = true;
      return;
    }

    const img = container.querySelector("img[alt]");
    const rawTitle = img?.alt?.trim() || "";
    if (!rawTitle) return;

    const cleaned = cleanTitle(rawTitle);
    if (!cleaned) return;

    const ehBtn = readBtn.cloneNode(true);
    ehBtn.classList.add("wn-eh-search-btn");
    ehBtn.href = buildEHUrl(cleaned);
    ehBtn.target = "_blank";
    ehBtn.removeAttribute("onclick");
    ehBtn.textContent = "E-Hentai 搜索";
    readBtn.insertAdjacentElement("afterend", ehBtn);

    const hdBtn = readBtn.cloneNode(true);
    hdBtn.classList.add("wn-hd-search-btn");
    hdBtn.href = buildHdoujinUrl(cleaned);
    hdBtn.target = "_blank";
    hdBtn.removeAttribute("onclick");
    hdBtn.textContent = "HDoujin 搜索";
    ehBtn.insertAdjacentElement("afterend", hdBtn);

    container._wn_eh_processed = true;
  }

  function initialScan() {
    document
      .querySelectorAll(".asTBcell.uwthumb")
      .forEach((c) => processContainer(c));
  }

  const observer = new MutationObserver((muts) => {
    muts.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches(".asTBcell.uwthumb")) {
          processContainer(node);
        } else if (node.querySelectorAll) {
          node
            .querySelectorAll(".asTBcell.uwthumb")
            .forEach((sub) => processContainer(sub));
        }
      });
    });
  });

  initialScan();
  observer.observe(document.body, { childList: true, subtree: true });

  // ====== 自动抓全分页 ======
  async function loadAllGalleryPages() {
    const paginator = document.querySelector(".paginator");
    if (!paginator) return;
    const ul = document.querySelector(".gallary_wrap ul.cc");
    if (!ul) return;

    // 1️⃣ 自动探测总页数
    // 分页器最后一个数字即最大页
    const maxPage = Math.max(
      ...[...paginator.querySelectorAll("a")]
        .map(a => parseInt(a.textContent.trim(), 10))
        .filter(n => !isNaN(n)),
      1
    );

    // 2️⃣ 获取当前 aid
    const aidMatch = window.location.href.match(/aid-(\d+)/);
    const aid = aidMatch ? aidMatch[1] : "";
    if (!aid) return;

    // 3️⃣ 构造所有页的 URL
    const basePrefix = `https://www.wnacg.com/photos-index-page-`;
    const baseSuffix = `-aid-${aid}.html`;
    const pageUrls = Array.from({ length: maxPage }, (_, i) => ({
      page: i + 1,
      url: `${basePrefix}${i + 1}${baseSuffix}`
    }));

    // 4️⃣ 抓取并重试
    async function fetchPage(p, retries = 2) {
      try {
        const resp = await fetch(p.url);
        if (!resp.ok) throw new Error("状态码错误");
        const text = await resp.text();
        const doc = new DOMParser().parseFromString(text, "text/html");
        const lis = [...doc.querySelectorAll(".gallary_wrap ul.cc li.gallary_item")];
        return { page: p.page, lis };
      } catch (err) {
        console.warn(`抓取第 ${p.page} 页失败（剩余${retries}次）`, err);
        return retries > 0 ? fetchPage(p, retries - 1) : { page: p.page, lis: [] };
      }
    }

    const results = await Promise.all(pageUrls.map(p => fetchPage(p)));

    // 5️⃣ 按页码顺序插入
    const frag = document.createDocumentFragment();
    results
      .sort((a, b) => a.page - b.page)
      .forEach(r => r.lis.forEach(li => frag.appendChild(document.importNode(li, true))));

    ul.innerHTML = "";
    ul.appendChild(frag);

    paginator.style.display = "none";
  }

  loadAllGalleryPages();
})();
