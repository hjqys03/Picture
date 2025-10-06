// ==UserScript==
// @name         Ex Hybrid
// @namespace    https://e-hentai.org/?f_cats=0
// @version      6.6.6
// @author       究极缝合怪
// @description  搜索相似画廊 & 导入标签 & 非阻塞提示(标签) & 删除 “Load comic”、“多页查看器” 侧边栏按钮
// @match        https://exhentai.org/g/*
// @match        https://e-hentai.org/g/*
// @icon         https://exhentai.org/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  // ========== Toast 样式 ==========
  (function addToastStyles() {
    if (document.getElementById("eh-toast-style")) return;
    const style = document.createElement("style");
    style.id = "eh-toast-style";
    style.textContent = `
      .eh-toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        z-index: 2147483647; /* 最大 z-index，确保永远在最上面 */
        pointer-events: none;
      }
      .eh-toast {
        background: rgba(0,0,0,0.85);
        color: #fff;
        padding: 10px 18px;
        border-radius: 6px;
        font-size: 14px;
        opacity: 0;
        transform: translateY(20px);
        animation: fadeInOut 3.5s ease forwards;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); /* 加阴影，提高可见度 */
      }
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(20px); }
        10% { opacity: 1; transform: translateY(0); }
        90% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
  })();

  // ========== Toast 函数 ==========
  function showToast(msg) {
    // 找或建容器
    let container = document.querySelector(".eh-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "eh-toast-container";
      document.body.appendChild(container);
    }

    // 建一个 toast
    const toast = document.createElement("div");
    toast.className = "eh-toast";
    toast.textContent = msg;

    container.appendChild(toast);

    // 3.5 秒后移除
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) container.remove(); // 清空容器
    }, 3600);
  }

  // 拦截 alert 弹窗，替换为非阻塞 toast
  (function() {
    const originalAlert = window.alert;
    window.alert = function(msg) {
      if (typeof msg === "string" && msg.includes("Could not vote for tag")) {
        // 🚫 针对 tag 投票锁定提示 → 用 toast
        showToast(msg);
      } else {
        // 其他 alert 保持原样（避免误伤）
        originalAlert(msg);
      }
    };
  })();

  // =============== 脚本一核心函数 ===============
  var exclude_namespaces = ["language", "reclass"]; // 跳过复制的标签类别
  var prompt_map = {
    "zh-CN": "请输入要导入tag的画廊地址",
    "en-US": "please input the link of the gallery you want to import tags from",
    default: "please input the link of the gallery you want to import tags from",
  };

  function get_text_in_local_language(map) {
    var user_language = navigator.language || navigator.userLanguage;
    var text = map[user_language];
    if (text == undefined) {
      text = map.default;
    }
    return text;
  }

  function get_source_async(url, call_back) {
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.onreadystatechange = function () {
      if (req.readyState === XMLHttpRequest.DONE && req.status === 200) {
        call_back(req.response);
      }
    };
    req.send();
  }

  function get_source_async_gt(url, call_back) {
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.onreadystatechange = function () {
      if (req.readyState === XMLHttpRequest.DONE && req.status === 200) {
        var responseText = req.response;
        var parser = new DOMParser();
        var doc = parser.parseFromString(responseText, "text/html");
        var gtElements = doc.querySelectorAll(".gt");
        var filteredHTML = "";
        gtElements.forEach((el) => {
          filteredHTML += el.outerHTML + "\n";
        });
        call_back(filteredHTML);
      }
    };
    req.send();
  }

  function parse_tags(source_text) {
    var ret = {};
    var regexp = /(?<=return toggle_tagmenu\(\d+,')(.+?)(?=',.+\))/g;
    var result;
    while ((result = regexp.exec(source_text))) {
      var namespace_tag = result[1].split(":");
      if (namespace_tag.length == 1) {
        namespace_tag = ["misc", namespace_tag[0]];
      }
      if (exclude_namespaces.includes(namespace_tag[0])) {
        continue;
      }
      if (ret[namespace_tag[0]] == undefined) {
        ret[namespace_tag[0]] = [];
      }
      ret[namespace_tag[0]].push(namespace_tag[1]);
    }
    return ret;
  }

  function fill_tag_field(tags) {
    var field = document.getElementById("newtagfield");
    var text = "";
    let count = 0; // 计数器

    for (let namespace in tags) {
      for (let tag of tags[namespace]) {
        text += namespace + ":" + tag + ",";
        count++;
      }
    }
    field.value = text;

    if (count === 0) {
      const msg = get_text_in_local_language({
        "zh-CN": "没有可添加的标签…",
        "en-US": "no tags to add...",
        default: "no tags to add...",
      });
      showToast(msg);
    } else {
      showToast("已填充 " + count + " 个标签"); // ✅ 直接用 count
    }
  }

  // 标签黑名单（输入链接时使用）
  function subtract_tags(current_tags, tags_to_add) {
    const blacklist = [
      "original",
      "uncensored",
      "extraneous ads",
      "full censorship",
      "mosaic censorship",
      "scanmark",
      "sample",
      "rough translation",
      "already uploaded",
      "watermarked"
    ];
    var ret = {};
    for (let namespace in tags_to_add) {
      ret[namespace] = [];
      if (current_tags[namespace] == undefined) {
        ret[namespace] = tags_to_add[namespace].filter(
          (tag) => !blacklist.includes(tag)
        );
        continue;
      }
      for (let tag of tags_to_add[namespace]) {
        if (!blacklist.includes(tag)) {
          ret[namespace].push(tag);
        }
      }
    }
    return ret;
  }

  // 空链接时的简化过滤（只屏蔽 original 和 rough translation）
  function subtract_tags_minimal(tags_to_add) {
    const blacklist_minimal = [
      "original",
      "sample",
      "rough translation"
    ];
    var ret = {};
    for (let namespace in tags_to_add) {
      ret[namespace] = [];
      for (let tag of tags_to_add[namespace]) {
        if (!blacklist_minimal.includes(tag)) {
          ret[namespace].push(tag);
        }
      }
    }
    return ret;
  }

  function make_callbacks(parse, subtract, fill) {
    var current_finished_getting = false;
    var current_source = "";
    var target_finished_getting = false;
    var target_source = "";

    var action = function () {
      if (current_finished_getting && target_finished_getting) {
        var tags_current = parse(current_source);
        var tags_target = parse(target_source);
        var tags_to_add = subtract(tags_current, tags_target);
        fill(tags_to_add);
      }
    };

    return {
      current_callback: function (text) {
        current_finished_getting = true;
        current_source = text;
        action();
      },
      target_callback: function (text) {
        target_finished_getting = true;
        target_source = text;
        action();
      },
    };
  }

    // ================== 域名互换函数（改进版） ==================
    function toggle_domain(url) {
        try {
            let u = new URL(url, window.location.href);
            const currentHost = window.location.hostname;

            if (currentHost.includes("exhentai.org") && u.hostname.includes("e-hentai.org")) {
                // 当前在 ex → 输入 e 链接 → 转成 ex
                u.hostname = "exhentai.org";
            } else if (currentHost.includes("e-hentai.org") && u.hostname.includes("exhentai.org")) {
                // 当前在 e → 输入 ex 链接 → 转成 e
                u.hostname = "e-hentai.org";
            }
            // 同域名情况：保持不变
            return u.toString();
        } catch (e) {
            return url; // 非法链接 → 原样返回
        }
    }

  function start() {
    var prompt_text = get_text_in_local_language(prompt_map);
    var url = prompt(prompt_text);

    // 🚫 如果点了取消 → 不执行
    if (url === null) return;

    // 空字符串 → 只过滤 original 和 rough translation
    if (url.trim() === "") {
      get_source_async(window.location.href, function (text) {
        var tags_current = parse_tags(text);
        var tags_filtered = subtract_tags_minimal(tags_current);
        fill_tag_field(tags_filtered);
      });
      return;
    }
    // 🔄 自动转换域名
    url = toggle_domain(url);

    // ✅ 输入了有效链接 → 正常流程（过滤黑名单）
    var callbacks = make_callbacks(parse_tags, subtract_tags, fill_tag_field);
    get_source_async(window.location.href, callbacks.current_callback);
    get_source_async(url, callbacks.target_callback);
  }

  function start_gt() {
    var prompt_text = get_text_in_local_language(prompt_map);
    var url = prompt(prompt_text);

    // 🚫 如果点了取消 → 不执行
    if (url === null) return;

    // 空字符串 → 只过滤 original 和 rough translation
    if (url.trim() === "") {
      get_source_async_gt(window.location.href, function (text) {
        var tags_current = parse_tags(text);
        var tags_filtered = subtract_tags_minimal(tags_current);
        fill_tag_field(tags_filtered);
      });
      return;
    }
    // 🔄 自动转换域名
    url = toggle_domain(url);

    // ✅ 输入了有效链接 → 正常流程（过滤黑名单）
    var callbacks = make_callbacks(parse_tags, subtract_tags, fill_tag_field);
    get_source_async_gt(window.location.href, callbacks.current_callback);
    get_source_async_gt(url, callbacks.target_callback);
  }

    // =============== 脚本二配置 ===============
    const galleryTitleEN = document.querySelector("#gn")?.textContent || "";
    const galleryTitleJP = document.querySelector("#gj")?.textContent || "";
    const sideBar = document.querySelector("#gd5");
    if ((!galleryTitleEN && !galleryTitleJP) || !sideBar) return;

    const PATTERN_TITLE_PREFIX =
          /^(?:(?:\([^)]*\))|(?:\[[^\]]*\])|(?:\{[^}]*\})|\s+)*/g;
    const PATTERN_TITLE_SUFFIX =
          /(?:\s+ch.[\s\d-]+)?(?:(?:\([^)]*\))|(?:\[[^\]]*\])|(?:\{[^}]*\})|\s+)*$/gi;

    let extractTitle;
    let isJapanese = false;

    if (galleryTitleJP) {
        // ✅ 优先日语，不截断
        isJapanese = true;
        extractTitle = galleryTitleJP;
    } else {
        // ❌ 没有日语 → fallback 英文（罗马音）
        extractTitle = galleryTitleEN;
    }

    extractTitle = extractTitle
        .replaceAll(PATTERN_TITLE_PREFIX, "")
        .replaceAll(PATTERN_TITLE_SUFFIX, "");

    // ✅ 日语 / 罗马音 → 遇到 | ｜ ︱ + 才截断
    const separateIndex = extractTitle.search(/\||｜|︱|\+/);
    if (separateIndex >= 0) {
        extractTitle = extractTitle.slice(0, separateIndex).trim();
    }

    const searchHref = `/?f_search="${encodeURIComponent(
        extractTitle
    )}"&advsearch=1`;

  // =============== 按钮分两行 ===============
  function addLink({ text, href = "#", onClick = null, title = "" }) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    if (title) a.title = title;
    if (onClick) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        onClick(e);
      });
    }
    return a;
  }
  // 第一行：相似画廊 + 悬浮窗
  const row1 = document.createElement("p");
  row1.className = "g2 gsp";
  const img1 = document.createElement("img");
  img1.src =
    window.location.hostname.indexOf("exhentai") >= 0
      ? "https://exhentai.org/img/mr.gif"
      : "https://ehgt.org/g/mr.gif";
  row1.appendChild(img1);
  row1.appendChild(document.createTextNode(" "));
  const similarLink = addLink({
      text: "相似画廊",
      href: searchHref,
      title: `标题搜索：${extractTitle}`,
  });
  row1.appendChild(similarLink);
  sideBar.appendChild(row1);

// =============== 相似画廊悬浮窗 ===============
(function () {
  // 🎨 直接读取网页颜色（不区分深浅模式）
  const bodyStyle = getComputedStyle(document.body);
  const bodyBgColor = bodyStyle.backgroundColor || "#E3E0D1";
  const bodyTextColor = bodyStyle.color || "#5C0D11";

  // 🎨 获取 .gm 背景色（不再调整亮度）
  let gmBg = "#EDEBDF";
  const gmEl = document.querySelector(".gm");
  if (gmEl) {
    gmBg = getComputedStyle(gmEl).backgroundColor || gmBg;
  }

  // 写入 CSS 变量（供样式中使用）
  document.documentElement.style.setProperty("--gm-hover-bg", gmBg);

  // 🎨 动态生成样式
  const styleId = "similar-hover-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .similar-hover-popup {
        position: absolute;
        background: ${bodyBgColor.replace('rgb', 'rgba').replace(')', ', 0.8)')};
        backdrop-filter: blur(6px);
        color: ${bodyTextColor};
        border: 1px solid ${bodyTextColor};
        border-radius: 8px;
        padding: 0;
        font-size: 12px;
        z-index: 9999;
        box-shadow: 0 4px 18px rgba(0,0,0,0.3);
        display: none;
        pointer-events: auto;
        transition: opacity 0.2s ease, border-color 0.2s ease;
        opacity: 0;
        max-width: 90vw;
        overflow-x: auto;
      }

      .similar-hover-popup.show { opacity: 1; }

      .popup-table {
        width: auto;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 4px;
        overflow: hidden;
        table-layout: auto;
      }

      .popup-table th,
      .popup-table td {
        text-align: center;
        padding: 6px 8px;
        vertical-align: middle;
        white-space: nowrap;
      }

      /* ✅ 悬停颜色完全跟随 .gm 背景，不做亮度调整 */
      .popup-table tbody tr:hover td {
        background: var(--gm-hover-bg);
        transition: background 0.15s ease;
        background-clip: padding-box;
      }

      .popup-table thead th {
        font-weight: bold;
        border-bottom: 1px solid rgba(0,0,0,0.15);
        background: rgba(0,0,0,0.04);
        text-align: center;
      }

      .popup-table tbody td:nth-child(1) {
        text-align: left;
        padding-left: 14px;
      }

      .popup-link {
        color: ${bodyTextColor};
        text-decoration: none;
        display: inline-block;
        max-width: 40vw;            /* ✅ 限制标题列最大宽度（不会撑出屏幕） */
        white-space: nowrap;        /* 不换行 */
        overflow: hidden;           /* 超出部分隐藏 */
        text-overflow: ellipsis;    /* 超出显示省略号 */
        vertical-align: middle;
        transition: color 0.15s ease;
      }

      .popup-link:hover {
        text-decoration: none;
      }

      .copy-btn {
        background: none !important;
        border: none !important;
        color: ${bodyTextColor} !important;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        margin: 0;
        line-height: 1;
        outline: none;
        transition: transform 0.15s ease;
      }

      .copy-btn:hover { transform: scale(1.2); }
      .copy-btn:active { transform: scale(0.95); }
    `;
    document.head.appendChild(style);
  }

  // ✅ 实时同步网页颜色变化（仅执行 2 次，只更新颜色）
  let colorCheckCount = 0;
  const colorSyncTimer = setInterval(() => {
    colorCheckCount++;
    const bodyStyle = getComputedStyle(document.body);
    const bodyBg = bodyStyle.backgroundColor;
    const bodyColor = bodyStyle.color;
    const gmEl = document.querySelector(".gm");
    const gmBg = gmEl ? getComputedStyle(gmEl).backgroundColor : "#EDEBDF";

    // 更新 CSS 变量
    document.documentElement.style.setProperty("--gm-hover-bg", gmBg);

    // 更新样式表颜色（只改颜色部分）
    const styleEl = document.getElementById("similar-hover-style");
    if (styleEl) {
      styleEl.textContent = styleEl.textContent
        .replace(/background: rgba?\([^)]*\)/g, `background: ${bodyBg.replace('rgb', 'rgba').replace(')', ', 0.8)')}`)
        .replace(/color: [^;]*;/g, `color: ${bodyColor};`)
        .replace(/border: 1px solid [^;]*;/g, `border: 1px solid ${bodyColor};`)
        .replace(/--gm-hover-bg:[^;]*;/g, `--gm-hover-bg:${gmBg};`);
    }

    if (colorCheckCount >= 2) {
      clearInterval(colorSyncTimer);
      console.log("🎨 悬浮窗颜色同步已完成（共 2 次）");
    }
  }, 1000);

    // 创建悬浮窗表格
    function createPopup(list) {
      const popup = document.createElement("div");
      popup.className = "similar-hover-popup";
      const table = document.createElement("table");
      table.className = "popup-table";
      table.innerHTML = `
        <thead>
          <tr>
            <th>标题</th>
            <th>语言</th>
            <th>页数</th>
            <th>文件大小</th>
            <th>时间</th>
            <th>链接</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector("tbody");

      list.forEach((g) => {
        if (!g.title) return;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>
            <a href="${g.url}"
               target="_blank"
               class="popup-link"
               title="${(g.engTitle || g.title).replace(/"/g, '&quot;')}">
               ${g.title}
            </a>
          </td>
          <td>${g.language}</td>
          <td>${g.pages || "—"}</td>
          <td>${g.fileSize || "—"}</td>
          <td>${g.posted || "—"}</td>
          <td><button class="copy-btn" data-url="${g.url}">♾️</button></td>
        `;
        tbody.appendChild(tr);
      });

      popup.appendChild(table);
      document.body.appendChild(popup);

      popup.addEventListener("click", (e) => {
        if (e.target.classList.contains("copy-btn")) {
          const link = e.target.dataset.url;
          navigator.clipboard.writeText(link).then(() => showToast("✅ 已复制链接"));
        }
      });
      return popup;
    }

    let popup = null;
    let cachedList = null;

    // ========== 改进版：访问详情页抓取语言 ==========
    async function fetchSimilarList() {
      if (cachedList) return cachedList;

      try {
        const res = await fetch(`${searchHref}&advsearch=1&f_sfl=on&f_sfu=on&f_sft=on`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const blocks = [...doc.querySelectorAll(".gl1t, .gl3t, .gl2t")];
        const list = [];

        // 当前画廊路径（例如 /g/123456/abcdef/）
        const currentPath = window.location.pathname.replace(/\/$/, "");

        // 先收集相似画廊的标题 + 链接
        const MAX_RESULTS = 999;
        for (const b of blocks.slice(0, MAX_RESULTS)) {
          const a = b.querySelector("a");
          if (!a) continue;
          const title = a.textContent.trim();
          const url = a.href;
          if (!title) continue;

          const linkPath = new URL(url).pathname.replace(/\/$/, "");
          if (linkPath === currentPath) continue; // 🚫 排除当前画廊

          list.push({ title, url, language: "⏳ 加载中…" });
        }

        // ⚙️ 并行请求每个画廊详情页，提取语言
        const promises = list.map(async (item) => {
          try {
            const detailRes = await fetch(item.url);
            const detailHtml = await detailRes.text();
            const detailDoc = new DOMParser().parseFromString(detailHtml, "text/html");

            // ✅ 额外提取英文（罗马音）标题
            const engTitle = detailDoc.querySelector("#gn")?.textContent?.trim() || "";
            if (engTitle) item.engTitle = engTitle;

            // 查找语言行
            const langRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find((td) =>
              /语言|Language/i.test(td.textContent)
            );
            if (langRow) {
              const valueTd = langRow.nextElementSibling;
            if (valueTd) {
              // ✅ 获取原始语言文字，去掉 TR 或类似翻译标记
              let rawLang = valueTd.textContent.trim();

              // 去掉 "TR" 或翻译提示（中英日都有）
              rawLang = rawLang
                .replace(/\bTR\b/gi, "")            // 去掉英文 TR
                .replace(/\s+/g, " ")               // 合并多余空格
                .trim();

              item.language = rawLang;
            } else {
              item.language = "—";
            }

            } else {
              item.language = "—";
            }

            // 查找文件大小
            const sizeRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find(td =>
              /File Size|文件大小/i.test(td.textContent)
            );
            if (sizeRow) {
              const sizeTd = sizeRow.nextElementSibling;
              item.fileSize = sizeTd ? sizeTd.textContent.trim() : "—";
            } else {
              item.fileSize = "—";
            }

            // 查找页数
            const lenRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find(td =>
              /Length|页数/i.test(td.textContent)
            );
            if (lenRow) {
              const lenTd = lenRow.nextElementSibling;
              if (lenTd) {
                const match = lenTd.textContent.match(/\d+/);
                item.pages = match ? parseInt(match[0], 10) : "—";
              } else {
                item.pages = "—";
              }
            } else {
              item.pages = "—";
            }

            // 查找发布时间
            const dateRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find((td) =>
              /Posted|发布于/i.test(td.textContent)
            );
            if (dateRow) {
              const dateTd = dateRow.nextElementSibling;
              if (dateTd) {
                let rawDate = dateTd.textContent.trim();
                let match = rawDate.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
                if (match) {
                  item.posted = match[0].replace(/\//g, "-");
                } else {
                  let m = rawDate.match(/(\d{1,2})\/(\d{1,2})/);
                  if (m) {
                    const year = new Date().getFullYear();
                    const mm = m[1].padStart(2, "0");
                    const dd = m[2].padStart(2, "0");
                    item.posted = `${year}-${mm}-${dd}`;
                  } else {
                    item.posted = rawDate;
                  }
                }
              } else {
                item.posted = "—";
              }
            } else {
              item.posted = "—";
            }

          } catch (e) {
            console.warn("获取语言失败：", item.url);
            item.language = "未知";
          }
          return item;
        });

    cachedList = await Promise.all(promises);

    // ✅ 只显示指定语言
    const allowedLangs = ["chinese", "japanese", "english", "korean"];
    cachedList = cachedList.filter(item =>
      allowedLangs.some(lang => item.language?.toLowerCase().includes(lang))
    );

    return cachedList;

      } catch (err) {
        console.error("相似画廊搜索失败：", err);
        showToast("❌ 无法搜索相似画廊");
        return [];
      }
    }

    // ========== ✅ 新版：进入页面自动加载 + 加载完成后才允许显示悬浮窗 ==========
    let hideTimer = null;
    let isLoaded = false; // ✅ 标记是否已加载完相似画廊

    function removePopup() {
      if (popup && popup.parentNode) {
        popup.remove();
        popup = null;
      }
      clearTimeout(hideTimer);
    }

    function scheduleClosePopup(delay = 200) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(removePopup, delay);
    }

    function cancelClosePopup() {
      clearTimeout(hideTimer);
    }

    // ✅ 进入页面时立即加载相似画廊（只执行一次）
    (async function preloadSimilarList() {
      showToast("⏳ 正在搜索相似画廊…");

      const list = await fetchSimilarList();

      if (list.length) {
        cachedList = list;
        isLoaded = true;
        showToast(`✅ 搜索完成，共找到 ${list.length} 个似画廊`);
      } else {
        showToast("⚠️ 未找到相似画廊");
      }
    })();

    // ✅ 鼠标悬浮时（仅加载完成后才显示）
    similarLink.addEventListener("mouseenter", async () => {
      cancelClosePopup();

      if (!isLoaded || !cachedList) return;

      removePopup(); // 防叠加

      popup = createPopup(cachedList);

      // ✅ 仿照脚本二 (#btList) 的定位方式 —— 靠左展开
      const parentBox = similarLink.closest(".g2") || similarLink.parentElement || document.body;
      parentBox.style.position = "relative"; // 作为定位参考
      parentBox.style.overflow = "visible";

      popup.style.position = "absolute";
      popup.style.top = "70%";
      popup.style.right = "10%";
      popup.style.marginRight = "8px"; // 按钮与浮窗间距
      popup.style.zIndex = "9999";
      popup.style.display = "block";
      popup.style.opacity = "0";
      popup.style.pointerEvents = "auto";
      popup.style.maxWidth = "90vw";
      popup.style.minWidth = "300px";
      popup.style.boxSizing = "border-box";

      parentBox.appendChild(popup);

      requestAnimationFrame(() => {
        popup.style.opacity = "1";
      });

      // ✅ 悬浮保持
      popup.addEventListener("mouseenter", cancelClosePopup);
      popup.addEventListener("mouseleave", () => scheduleClosePopup(150));
    });

    // 鼠标离开相似画廊按钮 → 延迟关闭
    similarLink.addEventListener("mouseleave", () => scheduleClosePopup(250));

    // 点击空白处关闭
    document.addEventListener("click", (e) => {
      if (popup && !popup.contains(e.target) && e.target !== similarLink) {
        removePopup();
      }
    });

    // 滚动或页面卸载时关闭
    // ["scroll", "beforeunload"].forEach((ev) =>
    //   window.addEventListener(ev, removePopup)
    // );
    window.addEventListener("beforeunload", removePopup);

  })();

  // 第二行：TAG-ALL / TAG-PAS
  const row2 = document.createElement("p");
  row2.className = "g2";
  const img2 = document.createElement("img");
  img2.src = img1.src;
  row2.appendChild(img2);
  row2.appendChild(document.createTextNode(" "));

  row2.appendChild(
    addLink({ text: "TAG-PAS", onClick: () => start_gt(), title: "导入确定标签" })
  );
  row2.append(" / ");
  row2.appendChild(
    addLink({ text: "TAG-ALL", onClick: () => start(), title: "导入所有标签" })
  );

  // 添加到侧边栏
  sideBar.appendChild(row1);
  sideBar.appendChild(row2);

  // ================== 删除按钮（多页查看器） ==================
  const mpvBtn = sideBar.querySelector('p.g2.gsp a[href*="/mpv/"]');
  if (mpvBtn) mpvBtn.closest("p")?.remove();

  // ================== 删除按钮（Load comic，含动态监听） ==================
  function removeLoadComicNodes(root) {
    const anchors = (root || document).querySelectorAll('p.g2.gsp a, p.g2 a');
    anchors.forEach((a) => {
      const text = (a.textContent || "").trim().toLowerCase();
      const href = (a.getAttribute('href') || "").trim().toLowerCase();

      const isLoadComicText = text.includes('load comic') || text.includes('loadcomic');
      const isJsHref = href === 'javascript:;';

      if (!(isLoadComicText || isJsHref)) return;

      const p = a.closest('p');
      if (!p) return;

      const pText = (p.textContent || "").toLowerCase();
      const safeMarkers = ['tag-all', 'tag-pas', '相似画廊', '相似'];
      if (safeMarkers.some(s => pText.includes(s.toLowerCase()))) return;

      p.remove();
    });
  }

  // 先清理一次
  removeLoadComicNodes(sideBar);

  // 监听后续动态插入
  const observer = new MutationObserver(() => removeLoadComicNodes(sideBar));
  observer.observe(sideBar, { childList: true, subtree: true });

  // 可选：5秒后断开
  setTimeout(() => observer.disconnect(), 5000);

  // ================== 移除 newtagfield 的 maxlength 限制 ==================
  const tagField = document.getElementById("newtagfield");
  if (tagField) {
    tagField.removeAttribute("maxlength"); // 移除 maxlength
  }

})();
