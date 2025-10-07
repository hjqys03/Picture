// ==UserScript==
// @name         Ex Hybrid
// @namespace    https://e-hentai.org/?f_cats=0
// @version      6.6.6
// @author       究极缝合怪
// @description  搜索相似画廊 & 导入标签 & 非阻塞提示(标签) & 删除 “Load comic”、“多页查看器” 侧边栏按钮
// @match        https://exhentai.org/g/*
// @match        https://e-hentai.org/g/*
// @icon         https://exhentai.org/favicon.ico
// @grant        GM_getValue
// @grant        GM_setValue
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

  // 拦截页面的原生 alert 弹窗，替换为非阻塞 toast
  (function() {
    const script = document.createElement("script");
    script.textContent = `
      (function() {
        const originalAlert = window.alert;
        window.alert = function(msg) {
          if (typeof msg === "string" && msg.includes("Could not vote for tag")) {
            window.postMessage({ type: "EH_SHOW_TOAST", message: msg }, "*");
          } else {
            originalAlert(msg);
          }
        };
      })();
    `;
    document.documentElement.appendChild(script);
    script.remove();

    // 监听来自页面环境的 toast 请求
    window.addEventListener("message", (e) => {
      if (e.data?.type === "EH_SHOW_TOAST") {
        showToast(e.data.message);
      }
    });
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
        background: ${bodyBgColor.replace('rgb', 'rgba').replace(')', ', 0.75)')};
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

      /* ✅ 所有表头列、除标题外的内容列：水平居中 + 垂直居中 */
      .popup-table th,
      .popup-table td {
        text-align: center;
        padding: 6px 8px;
        vertical-align: middle;
        white-space: nowrap;
      }

      /* ✅ “标题”列（内容）水平左对齐 */
      .popup-table tbody td:first-child {
        text-align: left;
        padding-left: 14px;
      }

      /* ✅ 确保内部元素（链接/按钮）也垂直居中 */
      .popup-table th > *,
      .popup-table td > * {
        vertical-align: middle !important;
        line-height: 1.3;
      }

      /* ✅ 特别确保链接和按钮在视觉上完美对齐 */
      .popup-link,
      .exhy-helper-one-click {
        display: inline-flex;
        align-items: center;
        justify-content: center;
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

  (function addExactAria2ButtonStyle() {
    if (document.getElementById("exhy-aria2-btn-style")) return;
    const style = document.createElement("style");
    style.id = "exhy-aria2-btn-style";
    style.textContent = `
      /* === 完全照搬 Aria2 按钮样式 === */
      .exhy-helper-one-click {
          width: 15px;
          height: 15px;
          background: radial-gradient(#ffc36b,#c56a00);
          border-radius: 15px;
          border: 1px #666 solid;
          box-sizing: border-box;
          color: #ebeae9;
          text-align: center;
          line-height: 15px;
          cursor: pointer;
          user-select: none;
      }
      .exhy-helper-one-click:hover {
          background: radial-gradient(#bf893b,#985200);
      }
      .exhy-helper-one-click.bt {
          background: radial-gradient(#a2d04f,#5fb213);
      }
      .exhy-helper-one-click.bt:hover {
          background: radial-gradient(#95cf2b,#427711);
      }
      .exhy-helper-one-click i {
          font-style: initial;
          transform: scale(0.7);
          margin-left: -1.5px;
      }
      .exhy-helper-one-click svg circle {
          stroke: #fff !important;
          stroke-width: 15px !important;
      }
      .exhy-helper-one-click svg {
          width: 10px;
          display: inline-block;
          height: 10px;
          padding-top: 1.3px;
      }
    `;
    document.head.appendChild(style);
  })();

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
        .replace(/background: rgba?\([^)]*\)/g, `background: ${bodyBg.replace('rgb', 'rgba').replace(')', ', 0.75)')}`)
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
            <th>发布时间</th>
            <th>链接</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector("tbody");
      popup.appendChild(table);

      // --- 排序相关 ---
      const keyMap = ["title", "language", "pages", "fileSize", "posted"];
      const originalList = list.slice(); // 不变的原始基准
      let currentList = originalList.slice(); // 当前显示的数据
      let currentSort = { key: null, dir: null }; // 三态默认

    // ✅ 从 GM_getValue 读取（支持 e-hentai / exhentai 共享）
    let lastSort = {};
    try {
      const saved = typeof GM_getValue === "function"
        ? GM_getValue("exhy_sort_pref", null)
        : localStorage.getItem("exhy_sort_pref");
      lastSort = saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn("读取排序偏好失败：", e);
    }

    if (lastSort.key && lastSort.dir) {
      currentSort = { key: lastSort.key, dir: lastSort.dir };
    }

      function toMB(v) {
        if (typeof v !== "string") return 0;
        const n = parseFloat(v) || 0;
        if (/GB/i.test(v)) return n * 1024;
        if (/MB/i.test(v)) return n;
        if (/KB/i.test(v)) return n / 1024;
        return n || 0;
      }

      function sortListBy(arr, key, isAsc) {
        return [...arr].sort((a, b) => {
          const av = a[key] || "";
          const bv = b[key] || "";

          if (key === "pages") {
            return (isAsc ? 1 : -1) * ((parseInt(av) || 0) - (parseInt(bv) || 0));
          }
          if (key === "fileSize") {
            return (isAsc ? 1 : -1) * (toMB(av) - toMB(bv));
          }
          if (key === "posted") {
            const da = new Date(av).getTime() || 0;
            const db = new Date(bv).getTime() || 0;
            return (isAsc ? 1 : -1) * (da - db);
          }
          return (isAsc ? 1 : -1) * av.localeCompare(bv, "zh");
        });
      }

      // 渲染行并绑定预览/复制事件（每次重绘都要调用）
      function renderRows(listToRender) {
        tbody.innerHTML = "";
        listToRender.forEach((g) => {
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
            <td><div class="exhy-helper-one-click bt bt-copy-button" data-url="${g.url}">✂</div></td>
          `;
          tbody.appendChild(tr);
        });

        // 绑定复制按钮事件
        popup.querySelectorAll(".bt-copy-button").forEach(btn => {
          btn.onclick = (e) => {
            const link = btn.dataset.url;
            navigator.clipboard.writeText(link).then(() => showToast("✅ 已复制链接"));
          };
        });

        // 替换原来 link 的 mouseenter / mouseleave 处理
        popup.querySelectorAll(".popup-link").forEach(link => {
          const url = link.href;
          const item = list.find(g => g.url === url);
          if (!item?.cover) return;

          let preview = null;
          let img = null;
          let moveHandler = null;
          let isMounted = false; // 标记 preview 是否仍然存在（是否已离开）

          link.addEventListener("mouseenter", function onEnter(e) {
            if (preview) return;
            isMounted = true;

            preview = document.createElement("div");
            Object.assign(preview.style, {
              position: "fixed",
              zIndex: "999999",
              pointerEvents: "none",
              borderRadius: "10px",
              overflow: "hidden",
              background: "none",
              padding: "4px",
              display: "none",
              willChange: "transform, left, top",
              transform: "translateZ(0)",
            });

            img = document.createElement("img");
            img.src = item.cover;
            Object.assign(img.style, {
              display: "block",
              maxWidth: "250px",
              maxHeight: "348px",
              borderRadius: "8px",
              userSelect: "none",
              border: "1px solid black",
            });

            // 图片加载完成后再注册 moveHandler（并且先检查 isMounted）
            img.onload = () => {
              if (!isMounted) return; // 已经离开，不再注册或调用
              const w = img.width;
              const h = img.height;

              // moveHandler 内先检查 preview，防止 race
              moveHandler = (e2) => {
                if (!preview) return; // 额外保护
                let left = e2.clientX - w - 10;
                let top = e2.clientY - h - 10;

                if (left < 0) left = e2.clientX + 20;
                if (top < 0) top = e2.clientY + 20;
                if (left + w > window.innerWidth) left = window.innerWidth - w - 10;
                if (top + h > window.innerHeight) top = window.innerHeight - h - 10;

                // 再次保护（preview 可能在短时间内被移除）
                if (preview) {
                  preview.style.left = `${left}px`;
                  preview.style.top = `${top}px`;
                }
              };

              document.addEventListener("mousemove", moveHandler);
              // 立即移动一次（使用 mouseenter 事件）
              moveHandler(e);
              preview.style.display = "block";
            };

            preview.appendChild(img);
            document.body.appendChild(preview);
          });

          link.addEventListener("mouseleave", function onLeave() {
            // 标记为已卸载，避免后续 onload 注册监听
            isMounted = false;

            if (moveHandler) {
              document.removeEventListener("mousemove", moveHandler);
              moveHandler = null;
            }
            if (preview) {
              preview.remove();
              preview = null;
            }
          });
        });
      }

    // 更新表头箭头指示（不占字位）
    function updateHeaderIndicators() {
      const ths = table.querySelectorAll("th");
      ths.forEach((th, idx) => {
        const raw = ["标题","语言","页数","文件大小","发布时间","链接"][idx];
        const span = th.querySelector("span");
        if (!span) return;

        // 清除旧箭头
        const oldArrow = span.querySelector(".sort-arrow");
        if (oldArrow) oldArrow.remove();

        // “链接”列不参与排序
        if (idx === 5) {
          span.textContent = raw;
          return;
        }

        // 当前列是否正在被排序
        const isActive = currentSort.key === keyMap[idx];
        const dir = isActive ? currentSort.dir : "none";

        // 创建箭头容器（绝对定位）
        const arrow = document.createElement("span");
        arrow.className = "sort-arrow";
        arrow.textContent =
          dir === "asc" ? "▴" :
          dir === "desc" ? "▾" :
          ""; // ✅ 默认状态时不显示箭头

        Object.assign(arrow.style, {
          position: "absolute",
          right: "-0.85em",      // 不占位显示
          top: "50%",
          transform: "translateY(-50%)",
          opacity: "0.7",
          pointerEvents: "none",
          userSelect: "none"
        });

        // 确保容器相对定位
        span.style.position = "relative";
        span.textContent = raw;
        span.appendChild(arrow);
      });
    }

      // --- 创建可点击的表头并绑定排序逻辑 ---
      const ths = table.querySelectorAll("th");
      ths.forEach((th, index) => {
        const label = th.textContent.trim();
        th.textContent = "";
        const span = document.createElement("span");
        span.textContent = label;
        span.dataset.label = label;
        th.appendChild(span);

        if (index === 5) { // 链接列不参与排序
          span.style.cursor = "default";
          return;
        }
        span.style.cursor = "pointer";

    span.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = keyMap[index];

      // 🔄 三态切换：none → desc → asc → none
      let newDir = "none";
      if (currentSort.key !== key) {
        newDir = "desc"; // 新列默认从降序开始
      } else {
        if (currentSort.dir === "none") newDir = "desc";
        else if (currentSort.dir === "desc") newDir = "asc";
        else newDir = "none";
      }

      currentSort = { key, dir: newDir };
    try {
      if (typeof GM_setValue === "function") {
        GM_setValue("exhy_sort_pref", JSON.stringify(currentSort));
      } else {
        localStorage.setItem("exhy_sort_pref", JSON.stringify(currentSort));
      }
    } catch (e) {
      console.warn("保存排序偏好失败：", e);
    }


      // ⚙️ 应用排序逻辑
      if (newDir === "none") {
        // 默认状态 = 恢复发布时间顺序
        currentList = sortListBy(originalList, "posted", false);
      } else {
        currentList = sortListBy(originalList, key, newDir === "asc");
      }

      renderRows(currentList);
      updateHeaderIndicators();
    });

      });

      // 初次根据 localStorage 应用
      if (currentSort.key && currentSort.dir) {
        currentList = sortListBy(currentList, currentSort.key, currentSort.dir === "asc");
      }

      // 最开始渲染并显示箭头
      renderRows(currentList);
      updateHeaderIndicators();

      document.body.appendChild(popup);
      return popup;
    }

    let popup = null;
    let cachedList = null;

    // ========== 改进版：访问详情页抓取语言 + 封面图 ==========
    async function fetchSimilarList() {
      if (cachedList) return cachedList;

      try {
        const res = await fetch(`${searchHref}&advsearch=1&f_sfl=on&f_sfu=on&f_sft=on`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const blocks = [...doc.querySelectorAll(".gl1t, .gl3t, .gl2t")];
        const list = [];

        const currentPath = window.location.pathname.replace(/\/$/, "");
        const MAX_RESULTS = 999;

        for (const b of blocks.slice(0, MAX_RESULTS)) {
          const a = b.querySelector("a");
          if (!a) continue;
          const title = a.textContent.trim();
          const url = a.href;
          if (!title) continue;
          const linkPath = new URL(url).pathname.replace(/\/$/, "");
          if (linkPath === currentPath) continue;

          list.push({ title, url, language: "⏳ 加载中…" });
        }

        const promises = list.map(async (item) => {
          try {
            const detailRes = await fetch(item.url);
            const detailHtml = await detailRes.text();
            const detailDoc = new DOMParser().parseFromString(detailHtml, "text/html");

            // 英文标题
            const engTitle = detailDoc.querySelector("#gn")?.textContent?.trim() || "";
            if (engTitle) item.engTitle = engTitle;

            // ✅ 获取封面图（#gd1 > div 背景图）
            const gd1Div = detailDoc.querySelector("#gd1 > div");
            if (gd1Div) {
              const bg = gd1Div.style.backgroundImage || "";
              const match = bg.match(/url\(["']?(.*?)["']?\)/);
              if (match) item.cover = match[1];
            }

            // ✅ 语言
            const langRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find((td) =>
              /语言|Language/i.test(td.textContent)
            );
            if (langRow) {
              const valueTd = langRow.nextElementSibling;
              let rawLang = valueTd?.textContent?.trim() || "";
              rawLang = rawLang.replace(/\bTR\b/gi, "").replace(/\s+/g, " ").trim();
              item.language = rawLang || "—";
            } else {
              item.language = "—";
            }

            // 文件大小
            const sizeRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find(td =>
              /File Size|文件大小/i.test(td.textContent)
            );
            item.fileSize = sizeRow?.nextElementSibling?.textContent?.trim() || "—";

            // 页数
            const lenRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find(td =>
              /Length|页数/i.test(td.textContent)
            );
            const match = lenRow?.nextElementSibling?.textContent.match(/\d+/);
            item.pages = match ? parseInt(match[0]) : "—";

            // 发布时间
            const dateRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find((td) =>
              /Posted|发布于/i.test(td.textContent)
            );
            // ✅ 发布时间：只取日期部分（YYYY-MM-DD）
            const rawDate = dateRow?.nextElementSibling?.textContent?.trim() || "—";
            item.posted = rawDate.match(/\d{4}-\d{2}-\d{2}/)?.[0] || rawDate;

          } catch (e) {
            console.warn("获取详情失败：", item.url);
            item.language = "未知";
          }
          return item;
        });

        cachedList = await Promise.all(promises);

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

      // ✅ 恢复被隐藏的收藏备注按钮
      document.querySelectorAll(".favnote[data-_exhy_hidden='1'], .editor[data-_exhy_hidden='1']").forEach(e => {
        e.style.display = "";
        delete e.dataset._exhy_hidden;
      });
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

      // ✅ 仅隐藏被悬浮窗实际遮挡的收藏按钮
      requestAnimationFrame(() => {
        popup.style.opacity = "1";

        const popupRect = popup.getBoundingClientRect();

        document.querySelectorAll(".favnote, .editor").forEach(e => {
          const rect = e.getBoundingClientRect();
          const overlap = !(
            rect.right < popupRect.left ||
            rect.left > popupRect.right ||
            rect.bottom < popupRect.top ||
            rect.top > popupRect.bottom
          );

          if (overlap) {
            e.dataset._exhy_hidden = "1";
            e.style.display = "none";
          }
        });
      });

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
