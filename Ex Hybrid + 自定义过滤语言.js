// ==UserScript==
// @name         Ex Hybrid
// @namespace    https://e-hentai.org/?f_cats=0
// @version      6.6.6
// @author       究极缝合怪
// @description  搜索相似画廊 & 导入标签 & 非阻塞提示(标签) & 删除 “Load comic”、“多页查看器(MPV)” 侧边栏按钮 & 删除画廊顶部的广告
// @match        https://exhentai.org/g/*
// @match        https://e-hentai.org/g/*
// @icon         https://exhentai.org/favicon.ico
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  // =====================================================
  // ✅ 菜单注册系统（统一管理多个功能开关）
  // =====================================================
  let menuIds = [];

  function registerMenuCommands() {
    // 清理旧菜单
    if (menuIds.length && typeof GM_unregisterMenuCommand === "function") {
      for (const id of menuIds) {
        try { GM_unregisterMenuCommand(id); } catch {}
      }
      menuIds = [];
    }

    // 📙 Manga 附加搜索
    const extraEnabled = GM_getValue("enableExtraSearch", true);
    const id1 = GM_registerMenuCommand(`${extraEnabled ? "关闭" : "启用"} Manga 附加搜索`, () => {
      const next = !extraEnabled;
      GM_setValue("enableExtraSearch", next);
      showToast(`📙 Manga 附加搜索已${next ? "启用" : "关闭"}`);
      registerMenuCommands();
    });
    menuIds.push(id1);

    // 📚 系列作品搜索
    const seriesEnabled = GM_getValue("enableSeriesSearch", true);
    const id2 = GM_registerMenuCommand(`${seriesEnabled ? "关闭" : "启用"} 尝试搜索系列作品`, () => {
      const next = !seriesEnabled;
      GM_setValue("enableSeriesSearch", next);
      showToast(`📚 系列作品搜索已${next ? "启用" : "关闭"}`);
      registerMenuCommands();
    });
    menuIds.push(id2);

    // 🧹 删除多余按钮（Load Comic + 多页查看器）
    const delBtnsEnabled = GM_getValue("enableDelExtraBtns", true);
    const id3 = GM_registerMenuCommand(`${delBtnsEnabled ? "关闭" : "启用"} 删除多余按钮`, () => {
      const next = !delBtnsEnabled;
      GM_setValue("enableDelExtraBtns", next);
      showToast(`🧹 删除多余按钮功能已${next ? "启用" : "关闭"}`);
      registerMenuCommands();
    });
    menuIds.push(id3);

    // 🚫 去广告
    const adBlockEnabled = GM_getValue("enableAdBlock", true);
    const id4 = GM_registerMenuCommand(`${adBlockEnabled ? "关闭" : "启用"} 去广告`, () => {
      const next = !adBlockEnabled;
      GM_setValue("enableAdBlock", next);
      showToast(`🚫 去广告功能已${next ? "启用" : "关闭"}`);
      registerMenuCommands();
    });
    menuIds.push(id4);
  }

  // ✅ 初始化菜单注册
  if (
    typeof GM_registerMenuCommand === "function" &&
    typeof GM_getValue === "function" &&
    typeof GM_setValue === "function"
  ) {
    registerMenuCommands();
  }

  // ✅ spa 检测处理（最终版，带去广告开关）
  const adBlockEnabled = (typeof GM_getValue === "function")
    ? GM_getValue("enableAdBlock", true)
    : true;

  if (adBlockEnabled) {
  const spa = document.querySelector("#spa");
  if (spa) {
    // 删除 spa 元素（顶部广告）
    spa.remove();
    console.log("🚫 已移除顶部广告（#spa）");

    // 删除 taglist 的 height 样式
    const taglist = document.querySelector("#taglist");
    if (taglist && taglist.hasAttribute("style")) {
      const styleValue = taglist.getAttribute("style");
      const newStyle = styleValue.replace(/height\s*:\s*\d+px;?/i, "").trim();
      if (newStyle) taglist.setAttribute("style", newStyle);
      else taglist.removeAttribute("style");
    }

    // 精确识别目标按钮并加上 gsp（原逻辑保留）
    document.querySelectorAll("p.g2, p.g3").forEach((p) => {
      const a = p.querySelector("a");
      if (!a) return;

      const href = a.getAttribute("href") || "";
      const onclick = a.getAttribute("onclick") || "";

      // 识别三种类型：举报图库 / 归档下载 / 申请删除
      if (
        href.includes("?report=select") ||
        onclick.includes("archiver.php") ||
        href.includes("?act=expunge")
      ) {
        p.classList.add("gsp");
      }
    });
  }
} else {
  console.log("🚫 去广告功能已关闭，保留 #spa 元素");
}

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

  // ====== fetch 重试函数 ======
  async function fetchWithRetry(url, retries = 3, delay = 200) {
      for (let i = 0; i <= retries; i++) {
          try {
              const res = await fetch(url);
              if (res.ok) return res; // 成功直接返回
              else throw new Error(`HTTP ${res.status}`);
          } catch (e) {
              if (i === retries) throw e; // 最后一次失败抛出
              console.warn(`请求失败 ${url}，重试中...(${i + 1}/${retries})`);
              await new Promise(r => setTimeout(r, delay));
          }
      }
  }

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
      showToast("✅ 已填充 " + count + " 个标签"); // ✅ 直接用 count
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

    // ✅ 日语 / 罗马音 → 遇到 | ｜ ︱ + ＋ 才截断
    const separateIndex = extractTitle.search(/\||｜|︱|\+|＋/);
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

  // 使用脚本顶部计算好的 adBlockEnabled（对应 GM key: "enableAdBlock"）
  // 逻辑：当 去广告【关闭】(!adBlockEnabled) 且页面存在 #spa 时 → 去掉 gsp
  if (!adBlockEnabled && document.querySelector("#spa")) {
    // 兼容之前脚本运行留下的 class：把侧边栏中已有的 gsp 一并移除
    document.querySelectorAll("#gd5 p.gsp, #gd5 p.g2.gsp, #gd5 p.g3.gsp").forEach(el => el.classList.remove("gsp"));

    row1.className = "g2";
  } else {
    row1.className = "g2 gsp";
  }

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
        border-radius: 6px;
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
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: middle;
        transition: color 0.15s ease;
        max-width: 40vw; /* 默认占 40% 屏宽 */
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

    if (lastSort.key && lastSort.dir && lastSort.dir !== "none") {
      currentSort = { key: lastSort.key, dir: lastSort.dir };
    } else {
      currentSort = { key: null, dir: null }; // ✅ 防止“默认”状态下仍触发排序
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
          let av = a[key] || "";
          let bv = b[key] || "";

          // ✅ 对语言字段进行预处理，忽略 TR/RW 后缀
          if (key === "language") {
            const clean = (s) =>
              s
                .replace(/<[^>]*>/g, "")  // 去除 HTML 标签
                .replace(/\b(TR|RW)\b/gi, "") // 去掉 TR / RW
                .trim()
                .toLowerCase();
            av = clean(av);
            bv = clean(bv);
          }

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

          // 默认：按中文或英文排序
          return (isAsc ? 1 : -1) * av.localeCompare(bv, "zh");
        });
      }

      // 渲染行并绑定预览/复制事件（每次重绘都要调用）
      function renderRows(listToRender) {
        // === 语言 → 国旗图标映射（取自 Eh漫画语言快捷按钮） ===
        const languageFlags = {
          albanian: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
          arabic: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
          bengali: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
          catalan: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
          cebuano: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
          chinese: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2QyMmYyNyIgZD0iTTUgMTdoNjJ2MzhINXoiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjM0IiByPSIxLjc1IiBmaWxsPSIjZjFiMzFjIi8+PGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMS43NSIgZmlsbD0iI2YxYjMxYyIvPjxjaXJjbGUgY3g9IjI4IiBjeT0iMzEiIHI9IjEuNzUiIGZpbGw9IiNmMWIzMWMiLz48Y2lyY2xlIGN4PSIyOCIgY3k9IjI2IiByPSIxLjc1IiBmaWxsPSIjZjFiMzFjIi8+PHBhdGggZmlsbD0iI2YxYjMxYyIgc3Ryb2tlPSIjZjFiMzFjIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xMy41MjggMzIuNDQ1bDIuNDcyLTggMi40NzMgOEwxMiAyNy41aDhsLTYuNDcyIDQuOTQ1eiIvPjxnPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik01IDE3aDYydjM4SDV6Ii8+PC9nPjwvc3ZnPg==",
          czech: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
          danish: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
          dutch: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
          english: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iIzFlNTBhMCIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNNDAgMjguODU2VjMyaDEwLjE4MUw2NyAyMS42OTFWMTdoLTcuNjU0TDQwIDI4Ljg1NnoiLz48cGF0aCBmaWxsPSIjZDIyZjI3IiBkPSJNNjcgMTdoLTMuODI3TDQwIDMxLjIwM1YzMmgzLjQ4Mkw2NyAxNy41ODZWMTd6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTU5LjM0NyA1NUg2N3YtNC42OTJMNTAuMTgyIDQwSDQwdjMuMTQzTDU5LjM0NyA1NXoiLz48cGF0aCBmaWxsPSIjZDIyZjI3IiBkPSJNNjcgNTV2LTIuMzQ3TDQ2LjM1NSA0MGgtNC43ODdsMjQuNDc0IDE1SDY3eiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0zMiA0My4xNDRWNDBIMjEuODE5TDUgNTAuMzA5VjU1aDcuNjU0TDMyIDQzLjE0NHoiLz48cGF0aCBmaWxsPSIjZDIyZjI3IiBkPSJNNSA1NWgzLjgyN0wzMiA0MC43OTdWNDBoLTMuNDgyTDUgNTQuNDE0VjU1eiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xMi42NTMgMTdINXY0LjY5MkwyMS44MTggMzJIMzJ2LTMuMTQzTDEyLjY1MyAxN3oiLz48cGF0aCBmaWxsPSIjZDIyZjI3IiBkPSJNNSAxN3YyLjM0N0wyNS42NDYgMzJoNC43ODZMNS45NTggMTdINXoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNNSAzMWg2MnYxMEg1eiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0zMSAxN2gxMHYzOEgzMXoiLz48cGF0aCBmaWxsPSIjZDIyZjI3IiBkPSJNNSAzM2g2MnY2SDV6Ii8+PHBhdGggZmlsbD0iI2QyMmYyNyIgZD0iTTMzIDE3aDZ2MzhoLTZ6Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          esperanto: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzYiIGN5PSIzNiIgcj0iMjgiIGZpbGw9IiM5MkQzRjUiLz48ZyBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjM2IiBjeT0iMzYiIHI9IjI4Ii8+PHBhdGggZD0iTTM2IDh2NTZjLTguNTYgMC0xNS41LTEyLjUzNi0xNS41LTI4UzI3LjQ0IDggMzYgOGM4LjU2IDAgMTUuNSAxMi41MzYgMTUuNSAyOFM0NC41NiA2NCAzNiA2NE02NCAzNkg4TTYwIDIySDEyTTYwIDUwSDEyIi8+PC9nPjwvc3ZnPg==",
          estonian: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBkPSJNNSAzMGg2MnYxMkg1eiIvPjxwYXRoIGZpbGw9IiMxZTUwYTAiIGQ9Ik01IDE3aDYydjEzSDV6Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          finnish: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjMWU1MGEwIiBzdHJva2U9IiMxZTUwYTAiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNjcgMzNIMzBWMTdoLTZ2MTZINXY2aDE5djE2aDZWMzloMzd2LTZ6Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          french: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjMWU1MGEwIiBkPSJNNSAxN2gyMXYzOEg1eiIvPjxwYXRoIGZpbGw9IiNkMjJmMjciIGQ9Ik00NiAxN2gyMXYzOEg0NnoiLz48Zz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvZz48L3N2Zz4=",
          german: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjMWU1MGEwIiBkPSJNNSAxN2gyMXYzOEg1eiIvPjxwYXRoIGZpbGw9IiNkMjJmMjciIGQ9Ik00NiAxN2gyMXYzOEg0NnoiLz48Zz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvZz48L3N2Zz4=",
          greek: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjMWU1MGEwIiBkPSJNNSAzNGg2MnY0SDV6TTUgMjUuNzVoNjJ2NEg1ek01IDQyLjI1aDYydjRINXpNNSA1MGg2MnY1SDV6TTUgMTdoNjJ2NUg1eiIvPjxwYXRoIGZpbGw9IiMxZTUwYTAiIGQ9Ik01IDE3aDIydjIxSDV6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTE0LjUgMTdoNHYyMmgtNHoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNNSAyNS43NWgyMnY0SDV6Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          hebrew: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
          hindi: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
          hungarian: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iIzVjOWUzMSIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZDIyZjI3IiBkPSJNNSAxN2g2MnYxM0g1eiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik01IDMwaDYydjEySDV6Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          indonesian: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2QyMmYyNyIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNNSAzNmg2MnYxOUg1eiIvPjxnPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik01IDE3aDYydjM4SDV6Ii8+PC9nPjwvc3ZnPg==",
          italian: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjNWM5ZTMxIiBkPSJNNSAxN2gyMXYzOEg1eiIvPjxwYXRoIGZpbGw9IiNkMjJmMjciIGQ9Ik00NiAxN2gyMXYzOEg0NnoiLz48Zz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvZz48L3N2Zz4=",
          japanese: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48Y2lyY2xlIGN4PSIzNiIgY3k9IjM2IiByPSI5IiBmaWxsPSIjZDIyZjI3Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          korean: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48Y2lyY2xlIGN4PSIzNiIgY3k9IjM2IiByPSI5IiBmaWxsPSIjZDIyZjI3Ii8+PGcgZmlsbD0iIzFlNTBhMCI+PHBhdGggZD0iTTI4LjEyNyAzMS42NzZBNC40OTIgNC40OTIgMCAwIDAgMzYgMzZjLjAyMy0uMDQuMDM0LS4wODMuMDU1LS4xMjNsLjAyNC4wMTRhNC40OTMgNC40OTMgMCAwIDEgNy43MjQgNC41OWwuMDAzLjAwMmE4Ljk5MiA4Ljk5MiAwIDAgMS0xNS42OC04LjgwN3pNMjguMzMxIDMxLjI4N2wuMDIuMDExYy0uMDMuMDQ2LS4wNjcuMDg1LS4wOTUuMTMzLjAyNy0uMDQ3LjA0Ny0uMDk4LjA3NS0uMTQ0eiIvPjwvZz48ZyBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTI0LjIzMiA0MS45MDJsMyA1LjE5Nk0yMC43NjggNDMuOTAybDMgNS4xOTZNMjIuNSA0Mi45MDJsMSAxLjczMk0yNC41IDQ2LjM2NmwxIDEuNzMyIi8+PGc+PHBhdGggZD0iTTQ1LjUgNDguMDk4bDEtMS43MzJNNDcuNSA0NC42MzRsMS0xLjczMk00Ny4yMzIgNDkuMDk4bDEtMS43MzJNNDkuMjMyIDQ1LjYzNGwxLTEuNzMyTTQzLjc2OCA0Ny4wOThsMS0xLjczMk00NS43NjggNDMuNjM0bDEtMS43MzIiLz48L2c+PGc+PHBhdGggZD0iTTIwLjc2OCAyOC4wOThsMy01LjE5Nk0yMi41IDI5LjA5OGwzLTUuMTk2TTI0LjIzMiAzMC4wOThsMy01LjE5NiIvPjwvZz48Zz48cGF0aCBkPSJNNDQuNzY4IDI0LjkwMmwxIDEuNzMyTTQ2Ljc2OCAyOC4zNjZsMSAxLjczMk00OC4yMzIgMjIuOTAybDEgMS43MzJNNTAuMjMyIDI2LjM2NmwxIDEuNzMyTTQ2LjUgMjMuOTAybDMgNS4xOTYiLz48L2c+PC9nPjxnPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik01IDE3aDYydjM4SDV6Ii8+PC9nPjwvc3ZnPg==",
          mongolian: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iIzFlNTBhMCIgZD0iTTUuMjI3IDE3aDYydjM4aC02MnoiLz48cGF0aCBmaWxsPSIjZDIyZjI3IiBkPSJNNS4yMjcgMTdoMjF2MzhoLTIxek00Ni4yMjcgMTdoMjF2MzhoLTIxeiIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMjkiIHI9IjEiIGZpbGw9IiNmY2VhMmIiIHN0cm9rZT0iI2ZjZWEyYiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjQxIiByPSIxIiBmaWxsPSIjZmNlYTJiIiBzdHJva2U9IiNmY2VhMmIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZmlsbD0iI2ZjZWEyYiIgc3Ryb2tlPSIjZmNlYTJiIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTE3IDI0YTEgMSAwIDAgMS0yIDBsMS0xek0xNSAzM2gybC0xIDEtMS0xek0xNSA0OGgybC0xIDEtMS0xek0xNSAzN2gyTTE1IDQ1aDJNMTEgMzNoMXYxNmgtMXpNMjAgMzNoMXYxNmgtMXoiLz48Zz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvZz48L3N2Zz4=",
          norwegian: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2QyMmYyNyIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjMWU1MGEwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNjcgMzNIMzBWMTdoLTZ2MTZINXY2aDE5djE2aDZWMzloMzd2LTZ6Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          polish: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZDIyZjI3IiBkPSJNNSAzNmg2MnYxOUg1eiIvPjxnPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik01IDE3aDYydjM4SDV6Ii8+PC9nPjwvc3ZnPg==",
          portuguese: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2QyMmYyNyIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjNWM5ZTMxIiBkPSJNNSAxN2gyMXYzOEg1eiIvPjxjaXJjbGUgY3g9IjI2IiBjeT0iMzYiIHI9IjEyIiBmaWxsPSJub25lIiBzdHJva2U9IiNmY2VhMmIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmNlYTJiIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0yNiAyNHYyNE0yNiAzOS41TDE3IDQ0aDE4bC05LTQuNXpNMjYgMzMuNWw5LTUuNS04LjUgMS41TDE3IDI4bDkgNS41eiIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZjZWEyYiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzggMzZsLTEyIDUtMTItNSAxMi01IDEyIDV6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjZDIyZjI3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTIwLjIgMjloMTEuNnYxMC4xYzAgMi41LTIuNiA0LjYtNS44IDQuNi0zLjIgMC01LjgtMi4xLTUuOC00LjZWMjl6Ii8+PGNpcmNsZSBjeD0iMjYiIGN5PSIzMi44IiByPSIuNyIgZmlsbD0iIzFlNTBhMCIgc3Ryb2tlPSIjMWU1MGEwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48Y2lyY2xlIGN4PSIyNiIgY3k9IjM4LjciIHI9Ii43IiBmaWxsPSIjMWU1MGEwIiBzdHJva2U9IiMxZTUwYTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjI2IiBjeT0iMzUuNyIgcj0iLjciIGZpbGw9IiMxZTUwYTAiIHN0cm9rZT0iIzFlNTBhMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGNpcmNsZSBjeD0iMjkiIGN5PSIzNS43IiByPSIuNyIgZmlsbD0iIzFlNTBhMCIgc3Ryb2tlPSIjMWU1MGEwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48Y2lyY2xlIGN4PSIyMyIgY3k9IjM1LjciIHI9Ii43IiBmaWxsPSIjMWU1MGEwIiBzdHJva2U9IiMxZTUwYTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxnPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik01IDE3aDYydjM4SDV6Ii8+PC9nPjwvc3ZnPg==",
          romanian: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2YxYjMxYyIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjMWU1MGEwIiBkPSJNNSAxN2gyMXYzOEg1eiIvPjxwYXRoIGZpbGw9IiNkMjJmMjciIGQ9Ik00NiAxN2gyMXYzOEg0NnoiLz48Zz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvZz48L3N2Zz4=",
          russian: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2QyMmYyNyIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNNSAxN2g2MnYxM0g1eiIvPjxwYXRoIGZpbGw9IiMxZTUwYTAiIGQ9Ik01IDMwaDYydjEySDV6Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          slovak: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2QyMmYyNyIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZDBjZmNlIiBkPSJNNSAxN2g2MnYxM0g1eiIvPjxwYXRoIGZpbGw9IiMxZTUwYTAiIGQ9Ik01IDMwaDYydjEySDV6Ii8+PHBhdGggZmlsbD0iI2QyMmYyNyIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0yMy44MzMgNDVzNi43NS0yLjI1IDYuNzUtOXYtOWgtMTMuNXY5YzAgNi43NSA2Ljc1IDkgNi43NSA5eiIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik0yMy44MzMgMjkuNXYxMk0yMS44MzMgMzEuNWg0TTIwLjMzMyAzNC41aDciLz48Y2lyY2xlIGN4PSIyMy44MzMiIGN5PSI0MS41IiByPSIzLjE2NyIgZmlsbD0iIzFlNTBhMCIvPjxwYXRoIGZpbGw9IiMxZTUwYTAiIGQ9Ik0xOS4yNSAzOS4zMzNhMi4xNDYgMi4xNDYgMCAwIDAtMS4zMjcuNDY1IDkuNTggOS41OCAwIDAgMCAyLjcwMyAzLjM2MyAyLjE1OCAyLjE1OCAwIDAgMC0xLjM3Ni0zLjgyOHpNMjguNDE3IDM5LjMzM2EyLjE1OCAyLjE1OCAwIDAgMC0xLjM3NiAzLjgyOCA5LjU4IDkuNTggMCAwIDAgMi43MDItMy4zNjMgMi4xNDYgMi4xNDYgMCAwIDAtMS4zMjYtLjQ2NXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTIzLjgzMyA0NXM2Ljc1LTIuMjUgNi43NS05di05aC0xMy41djljMCA2Ljc1IDYuNzUgOSA2Ljc1IDl6Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          slovenian: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2QyMmYyNyIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNNSAxN2g2MnYxM0g1eiIvPjxwYXRoIGZpbGw9IiMxZTUwYTAiIGQ9Ik01IDMwaDYydjEySDV6Ii8+PHBhdGggZmlsbD0iIzFlNTBhMCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0yMi41ODMgMjJ2OWMwIDYuNzUtNi43NSA5LTYuNzUgOXMtNi43NS0yLjI1LTYuNzUtOXYtOXM2Ljg5Ni0zLjQwNiAxMy41IDB6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGQ9Ik0xMS45NjMgMzMuMzUybDcuOTc1LjMzOUE2LjgxNiA2LjgxNiAwIDAgMSAxNiAzOGMtMyAxLTQuMDM3LTQuNjQ5LTQuMDM3LTQuNjQ5Ii8+PHBhdGggZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGQ9Ik0xNC41IDMzLjVsMS0yIDIuMjY1IDIuNTg0TDE0LjUgMzMuNSIvPjxjaXJjbGUgY3g9IjEzIiBjeT0iMjQiIHI9IjEiIGZpbGw9IiNmY2VhMmIiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMjEgMzVsLTEtMy0yIDMtMi01LTIgNS0yLTMtMSAzczQgOSAxMCAweiIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMjYiIHI9IjEiIGZpbGw9IiNmY2VhMmIiLz48Y2lyY2xlIGN4PSIxOSIgY3k9IjI0IiByPSIxIiBmaWxsPSIjZmNlYTJiIi8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDIyZjI3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0yMi41ODMgMjJ2OWMwIDYuNzUtNi43NSA5LTYuNzUgOXMtNi43NS0yLjI1LTYuNzUtOXYtOXM2Ljg5Ni0zLjQwNiAxMy41IDB6Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          spanish: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2YxYjMxYyIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZDIyZjI3IiBkPSJNMjMgMzN2N2EyLjAwNiAyLjAwNiAwIDAgMS0yIDJoLTRhMi4wMDYgMi4wMDYgMCAwIDEtMi0ydi03TTUgMTdoNjJ2OUg1ek01IDQ2aDYydjlINXoiLz48cGF0aCBmaWxsPSIjZjFiMzFjIiBkPSJNMTkgMzNoNHY0aC00eiIvPjxjaXJjbGUgY3g9IjE5IiBjeT0iMzciIHI9IjEuNSIgZmlsbD0iIzZhNDYyZiIvPjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzZhNDYyZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0yNyAzM3Y5TTExIDMzdjlNMTUgMzBhOC41NjggOC41NjggMCAwIDEgNC0xTTIzIDMwYTguNTY4IDguNTY4IDAgMCAwLTQtMU0xNSAzM2g4TTIzIDMzdjdhMi4wMDYgMi4wMDYgMCAwIDEtMiAyaC00YTIuMDA2IDIuMDA2IDAgMCAxLTItMnYtN00xMCA0MmgyTTI2IDQyaDIiLz48L2c+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          swedish: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iIzFlNTBhMCIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZmNlYTJiIiBzdHJva2U9IiNmY2VhMmIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNjcgMzNIMzBWMTdoLTZ2MTZINXY2aDE5djE2aDZWMzloMzd2LTZ6Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          tagalog: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
          thai: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjMWU1MGEwIiBkPSJNNSAzMGg2MnYxMkg1eiIvPjxwYXRoIGZpbGw9IiNkMjJmMjciIGQ9Ik01IDUwaDYydjVINXpNNSAxN2g2MnY1SDV6Ii8+PGc+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48L2c+PC9zdmc+",
          turkish: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2QyMmYyNyIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZmZmIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTQwLjY0IDMzLjA1bDMuMDUyIDQuMDE5LTQuOTM0LTEuNTMyIDQuOTMyLTEuNTQxLTMuMDQ2IDQuMDI1LS4wMDQtNC45NzJNMzEuMjkgNDQuNjRhOC42NDMgOC42NDMgMCAxIDEgMy45NTgtMTYuMzQgMTEgMTEgMCAxIDAgMCAxNS4zOCA4LjcxNSA4LjcxNSAwIDAgMS0zLjk1OC45NXoiLz48Zz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvZz48L3N2Zz4=",
          ukrainian: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iIzYxYjJlNCIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZmNlYTJiIiBkPSJNNSAzNmg2MnYxOUg1eiIvPjxnPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik01IDE3aDYydjM4SDV6Ii8+PC9nPjwvc3ZnPg==",
          vietnamese: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2QyMmYyNyIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSIjZjFiMzFjIiBzdHJva2U9IiNmMWIzMWMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTI4Ljg5IDQ3bDcuMzAzLTIyIDYuMjk1IDIxLjY2M0wyNSAzMy42MWwyMi0uNTQzTDI4Ljg5IDQ3eiIvPjxnPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik01IDE3aDYydjM4SDV6Ii8+PC9nPjwvc3ZnPg==",
          "N/A": "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzYiIGN5PSIzNS44IiByPSIyMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkNFQTJCIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHN0cm9rZS13aWR0aD0iMS44Ii8+PHBhdGggZmlsbD0iI0ZDRUEyQiIgZD0iTTQ2LjggNTYuM2MxMS4zLTYgMTUuNy0yMC4yIDkuNy0zMS41cy0yMC0xNS41LTMxLjMtOS41LTE1LjUgMjAtOS41IDMxLjNjMi4zIDQuMiA1LjggNy43IDEwLjEgOS44IDAgMS42LjcgMy4yIDEuOCA0LjQgMS40IDEuNiA4LjUgMy4zIDEyLjItLjIgMS4xLTEgNy4zLTQuMiA3LTQuM3oiLz48Zz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNTEuNSA1Mi44YzkuNC04LjYgMTAuMS0yMy4xIDEuNS0zMi41cy0yMy4xLTEwLjEtMzIuNS0xLjVTMTAuNCA0MS45IDE5IDUxLjNjLjkuOSAxLjggMS44IDIuOCAyLjYiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMjEuNCAyMy42Yy43LTEuNCAxLjktMi40IDMuMy0yLjkgMS4zLS43IDIuOS0uOCA0LjMtLjRNNTAuNyAyMy42Yy0xLjUtMi43LTQuNi00LTcuNi0zLjNNMzQgNDEuNWMtMS40LS4yLTIuOC0uNy00LTEuNU00Mi4xIDQwYy0xLjMuNy0yLjcgMS4yLTQuMiAxLjVNMzcuOCAzOC42YzAtMS0uOS0xLjktMS45LTEuOXMtMS45LjktMS45IDEuOU0zNCA0Ny40di04LjhNMzcuOCAzOC42djguOSIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik0zNy4yIDQ3LjRjMS43IDAgMyAxLjMgMyAzdjEuOGg0LjFjMS4zLS4xIDIuNS43IDIuOCAycy0uMyAyLjYtMS40IDMuMmMtLjUuMy0xLjEuNi0xLjYuOS0yIDEuMS00LjEgMi4yLTYuMiAzLjMtMS45IDEtNCAxLjQtNi4xIDEtMy42LS42LTYtNC01LjQtNy43LjItMS41LjUtMyAxLTQuNC42LTEuOCAyLjMtMy4xIDQuMi0zLjFoNS42eiIvPjxwYXRoIGQ9Ik0zMCAyNy44YzAgMS43LTEuMyAzLTMgM3MtMy0xLjMtMy0zIDEuMy0zIDMtM2MxLjYgMCAzIDEuMyAzIDIuOXYuMU00OCAyNy44YzAgMS43LTEuMyAzLTMgM3MtMy0xLjMtMy0zIDEuMy0zIDMtM2MxLjYgMCAzIDEuMyAzIDIuOXYuMSIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTM2LjIgNTEuOGMtMS4zIDAtMiAuNy0yLjUgMS41LS42LjkgMCAyLjIgMSAyLjJIMzljLjcgMCAxLjItLjYgMS4yLTEuNFY1Mi4yIi8+PC9nPjwvc3ZnPg==",
          unknown: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzIgNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUgMTdoNjJ2MzhINXoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSAxN2g2MnYzOEg1eiIvPjwvc3ZnPg==",
        };

        tbody.innerHTML = "";
        listToRender.forEach((g) => {
          const tr = document.createElement("tr");

          // === 根据语言名匹配国旗 ===
          const langName = (g.language || "").replace(/<[^>]*>/g, "").trim().toLowerCase();
          let flagKey = Object.keys(languageFlags).find(k => langName.includes(k));
          if (!flagKey) flagKey = "unknown";

          const langHTML = `
            <img src="${languageFlags[flagKey]}"
                 alt="${flagKey}"
                 title="${flagKey}"
                 style="
                   width:26px;
                   height:20px;
                   object-fit:contain;
                   display:block;
                   margin:0 auto;
                   vertical-align:middle;
                 ">
          `;

          tr.innerHTML = `
            <td>
              <a href="${g.url}"
                target="_blank"
                class="popup-link"
                title="${(g.engTitle || g.title).replace(/"/g, '&quot;')}">
                ${g.title}
              </a>
            </td>
            <td>${langHTML}</td>
            <td>${g.pages || "—"}</td>
            <td>${g.fileSize || "—"}</td>
            <td>${g.posted || "—"}</td>
            <td><div class="exhy-helper-one-click bt bt-copy-button" data-url="${g.url}">✂</div></td>
          `;
          tbody.appendChild(tr);
        });

        // === 绑定复制事件 ===
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
          let scrollHandler = null;
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

          // 在这里加上滚动关闭逻辑
          const scrollHandler = () => {
            if (preview) {
              preview.remove();
              preview = null;
            }
            if (moveHandler) {
              document.removeEventListener("mousemove", moveHandler);
              moveHandler = null;
            }
            window.removeEventListener("scroll", scrollHandler);
          };
          window.addEventListener("scroll", scrollHandler, { passive: true });

            // 图片加载完成后再注册 moveHandler（并且先检查 isMounted）
            img.onload = () => {
              if (!isMounted || !preview) return; // ✅ 避免 null 访问
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
              if (preview) preview.style.display = "block"; // ✅ 再次保护
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
          // ✅ 滚动时关闭预览的监听也要清理掉
          window.removeEventListener("scroll", scrollHandler);
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

      // 🔄 三态切换：none → asc → desc → none
      let newDir = "none";
      if (currentSort.key !== key) {
        newDir = "asc"; // 新列默认从升序开始
      } else {
        if (currentSort.dir === "none") newDir = "asc";
        else if (currentSort.dir === "asc") newDir = "desc";
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

    // ✅ 定义强制刷新函数（用于首次打开悬浮窗时自动刷新）
    popup.forceRefreshSort = function() {

      // ✅ 1️⃣ 打开悬浮窗时先强制按发布时间倒序刷新一次
      currentList = sortListBy(originalList, "posted", false);

      // ✅ 2️⃣ 如果有用户记忆的排序（非默认），再叠加应用一次
      if (currentSort.key && currentSort.dir && currentSort.dir !== "none") {
        currentList = sortListBy(currentList, currentSort.key, currentSort.dir === "asc");
      }

      renderRows(currentList);
      updateHeaderIndicators();
    };

    document.body.appendChild(popup);
    return popup;
    }

    let popup = null;
    let cachedList = null;
    let hasRefreshedOnce = false; // ✅ 全局标记：只刷新一次排序

    // ========== 改进版：访问详情页抓取语言 + 封面图 ==========
    async function fetchSimilarList() {
      if (cachedList) return cachedList;

      try {
        // 1️⃣ 从 taglist 获取所有艺术家名（最终版，仅用 id 提取）
        const artistTagNames = [];
        document.querySelectorAll('#taglist a[href*="artist:"]').forEach(a => {
          const idAttr = a.id || "";
          const idMatch = idAttr.match(/artist:([^"]+)/);
          if (idMatch) {
            const tagName = idMatch[1];
            if (!artistTagNames.includes(tagName)) {
              artistTagNames.push(tagName);
            }
          }
        });

        // 2️⃣ 从标题提取所有艺术家名
        const artistTitleNames = [];
        let titleFull = galleryTitleJP || galleryTitleEN || "";

        // ✅ 清除末尾的 [xxx] 内容（例如 [中国翻訳]）
        titleFull = titleFull.replace(/\[[^\]]*\]$/g, "").trim();

        // 支持 [团队名 (艺术家名1、艺术家名2)] 或 [艺术家名1、艺术家名2]
        let m = titleFull.match(/\[[^\]]*?\(([^)]+)\)\]/);
        if (m) {
          artistTitleNames.push(
            ...m[1]
              .replace(/\s+/g, "")
              .split(/[、,，&＆×x\+＋\/]/g)
              .map(s => s.trim())
              .filter(Boolean)
          );
        } else {
          const m2 = titleFull.match(/\[([^\]]+)\]/);
          if (m2) {
            artistTitleNames.push(
              ...m2[1]
                .replace(/\s+/g, "")
                .split(/[、,，&＆×x\+＋\/]/g)
                .map(s => s.trim())
                .filter(Boolean)
            );
          }
        }

        // 3️⃣ 判断是否为合辑类（other:anthology / other:goudoushi）——仅用 id 提取
        const otherTags = [];
        document.querySelectorAll('#taglist a[href*="other:"]').forEach(a => {
          const idAttr = a.id || "";
          const idMatch = idAttr.match(/other:([^"]+)/);
          if (idMatch) {
            const tagName = idMatch[1].toLowerCase();
            if (!otherTags.includes(tagName)) {
              otherTags.push(tagName);
            }
          }
        });

        const isAnthology = otherTags.includes("anthology") || otherTags.includes("goudoushi");

        // 4️⃣ 选择艺术家来源
        let finalArtists = [];
        console.log("🎨 获取的艺术家 (标签) =", artistTagNames);
        console.log("🎨 获取的艺术家 (标题) =", artistTitleNames);

        if (!isAnthology) {
          if (artistTagNames.length > 0) {
            // ✅ 有标签艺术家 → 优先使用标签（精确匹配）
            finalArtists = artistTagNames.map(a => `artist:"${a}$"`);
          } else if (artistTitleNames.length > 0) {
            // ✅ 否则使用标题艺术家（普通匹配）
            finalArtists = artistTitleNames.map(a => `"${a}"`);
          }
        } else {
          // ✅ 合辑标签 → 仅使用标题搜索（不清理标题）
          console.log("🔸 检测到合辑标签，仅使用标题搜索");
        }

        // ✅ 预处理标题（带系列搜索开关）
        const seriesSearchEnabled = (typeof GM_getValue === "function")
          ? GM_getValue("enableSeriesSearch", true)
          : true;

        let cleanTitle = "";
        if (extractTitle) {
          // ✅ 不论是否开启系列搜索
          // ✅ 去掉开头或结尾的【】、（）或()包裹内容
          extractTitle = extractTitle.replace(/^[（(【][^（）()【】]+[）)】]\s*|\s*[（(【][^（）()【】]+[）)】]$/g, "");
        }

        if (!seriesSearchEnabled) {
          // 🚫 关闭系列搜索 → 不做清理
          cleanTitle = extractTitle || galleryTitleJP || galleryTitleEN || "";
          console.log("📚 系列作品搜索已关闭，使用原始标题:", cleanTitle);
        } else if (extractTitle) {
          if (!isAnthology) {
            // ✅ 非合辑 → 清理标题
            cleanTitle = extractTitle
              // ✅ 删除开头或结尾的「」「『』『』＜＞<>《》 包裹内容
              .replace(/^[＜《<「『][^＜《<「『」』>》＞]+[」』>》＞]\s*|\s*[＜《<「『][^＜《<「『」』>》＞]+[」』>》＞]$/g, "")
              // ✅ 遇到【】、「」、『』、＜＞、<>、（）、()、《》 任意一种括号后，截断后面所有内容
              .replace(/[【「『＜《<(（(][^【】「」『』＜＞《》<>（）()]+[】」』＞》>)）)].*$/g, "")
              // ✅ 删除冒号（:、：、-、~、～、—、〜、―、﹣）及其后的内容，或删除出现成对连接符号（ー）及其中间内容
              .replace(/[:：\-~～—〜―﹣].*$|\s(ー).*?\1.*$/i, "")
              // ✅ 删除以 "#" 开头的章节编号或数字后紧跟空格的部分
              .replace(/#\d+(?:\.\d+)?\s*.*$|(?:\d+(?:\.\d+)?|[①-⑳IVXⅰⅴⅵⅶⅷⅸⅹ]+)(?:\s.*|$)/i, "")
              // ✅ 去掉带数字或罗马数字的卷号/章节号（含小数点版本）
              .replace(/\s*(?:第?[①-⑳\d]+(?:\.\d+)?[\-~～—〜―﹣+][①-⑳\d]+(?:\.\d+)?(?:話|巻|卷|篇|編|章)?|第[①-⑳\d]+(?:\.\d+)?(?:話|巻|卷|篇|編|章)?|Vol\.?\s*(?:[①-⑳\d]+(?:\.\d+)?(?:[\-~～—〜―﹣+][①-⑳\d]+(?:\.\d+)?)?|[IVXⅰⅴⅵⅶⅷⅸⅹ]+(?:[\-~～—〜―﹣+][IVXⅰⅴⅵⅶⅷⅸⅹ]+)?)|[①-⑳\d]+(?:\.\d+)?[\-~～—〜―﹣+][①-⑳\d]+(?:\.\d+)?(?:話|巻|卷|篇|編|章)?|第?[①-⑳\d]+(?:\.\d+)?\s*(?:巻|卷|話|篇|編|章)?|[IVXⅰⅴⅵⅶⅷⅸⅹ]+(?:[\-~～—〜―﹣+][IVXⅰⅴⅵⅶⅷⅸⅹ]+)?|\d+(?:st|nd|rd|th))\s*$/i, "")
              // ✅ 去掉末尾的各种章节/卷号标识
              .replace(/\s*(?:前編|中編|後編|前篇|中篇|後篇|前章|中章|後章|前日譚|後日譚|最終編|最終篇|最終話|最終章|最終巻|最終卷|完全版|上巻|中巻|下巻|上卷|中卷|下卷|総集編|総集篇|総集章|単行本版|After(?:[上下中前後]?(?:巻|卷|篇|編|章)?)?)\s*$/i, "")
              // ✅ 去掉开头或结尾的「続」「続・」「・続」「続編」「続章」
              .replace(/^(?:続(?:[・･·•])?|[・･·•]?続(?:話|巻|卷|篇|編|章)?)\s*|\s*(?:続(?:[・･·•])?|[・･·•]?続(?:話|巻|卷|篇|編|章)?)$/gi, "")
              // ✅ 修改：全局匹配第一話、第一章、第一巻、第一卷、第一篇、第一編，不限定末尾
              .replace(/第[一二三四五六七八九十]+(?:話|章|巻|卷|篇|編)/gi, "")
              // ✅ 删除空格到「篇 / 編 / 巻 / 卷 / 話 / 章 / 版」结尾的内容
              .replace(/\s+[^ ]*(?:篇|編|巻|卷|話|章|版)$/, "")
              // ✅ 去掉末尾单独的 上 中 下 前 中 後
              .replace(/\s*[上下中前後]\s*$/i, "")
              // ✅ 如果标题末尾有一个空格，后面是 1～3 个字符（任意文字），就把那部分删掉。
              .replace(/\s[\S]{1,3}$/i, "")
              // ✅ 去掉开头或结尾的中点符号
              .replace(/^[・･·•]+|[・･·•]+$/g, "")
              .trim();
          } else {
            // ✅ 合辑 → 不清理标题
            cleanTitle = extractTitle.trim();
          }
        }

        // ✅ 清理后若为空 → 回退原始标题
        if (!cleanTitle) cleanTitle = extractTitle || galleryTitleJP || galleryTitleEN || "";

        const allResults = [];
        const searchCombos = [];
        let totalPages = 0; // 累计所有搜索组合的页数

        // 🎨 生成搜索组合（多艺术家）
        if (finalArtists.length > 1) {
            for (const artist of finalArtists) {
                searchCombos.push(`${artist} "${cleanTitle}"`);
            }
        } else if (finalArtists.length === 1) {
            searchCombos.push(`${finalArtists[0]} "${cleanTitle}"`);
        } else {
            searchCombos.push(`"${cleanTitle}"`);
        }

        console.log("🧩 生成的搜索组合 =", searchCombos);

        // 🔍 多次请求搜索结果并合并
        for (const [index, searchQuery] of searchCombos.entries()) {
            const searchURL =
                `/?f_search=${encodeURIComponent(searchQuery).replace(/%20/g, '+')}&advsearch=1&f_sfl=on&f_sfu=on&f_sft=on`;
            console.log(`🔎 [${index + 1}/${searchCombos.length}] 搜索 URL =`, searchURL);

            let nextURL = searchURL;
            const MAX_PAGES = Infinity;
            let page = 0;

            while (nextURL && page < MAX_PAGES) {
                const res = await fetch(nextURL);
                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, "text/html");
                const blocks = [...doc.querySelectorAll(".gl1t, .gl2t, .gl3t")];
                if (!blocks.length) break;

                for (const b of blocks) {
                    const a = b.querySelector("a");
                    if (!a) continue;
                    const title = a.textContent.trim();
                    const url = a.href;
                    if (!title) continue;

                    // ✅ 排除当前画廊
                    const linkPath = new URL(url).pathname.replace(/\/$/, "");
                    const currentPath = window.location.pathname.replace(/\/$/, "");
                    if (linkPath === currentPath) continue;

                    // ✅ 排除重复
                    if (allResults.some(x => x.url === url)) continue;

                    allResults.push({ title, url, language: "⏳ 加载中…" });
                }

                const nextAnchor = doc.querySelector("#unext");
                if (nextAnchor && nextAnchor.tagName.toLowerCase() === "a") {
                    nextURL = nextAnchor.href;
                    console.log("➡ 翻页搜索 URL:", nextURL);
                } else {
                    nextURL = null;
                    console.log("➡ 已到最后一页，无下一页 URL");
                }

                page++;
                await new Promise(r => setTimeout(r, 0));
            }

            totalPages += page;
        }

        const list = allResults;

        const promises = list.map(async (item) => {
          try {
            const detailRes = await fetchWithRetry(item.url);
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
              // 直接删除 TR 和 RW
              const cleanLang = rawLang.replace(/\b(TR|RW)\b/gi, "").trim();
              item.language = cleanLang || "—";
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

        // ✅ 过滤语言
        const allowedLangs = ["chinese", "japanese", "english", "korean"];
        cachedList = cachedList.filter(item =>
          allowedLangs.some(lang => item.language?.toLowerCase().includes(lang))
        );

        // ✅ 在过滤完成后再统计最终显示条数
        console.log(`✅ 搜索抓取完毕：共 ${cachedList.length} 条（${totalPages} 页）`);

      // ========== ✅ 检查是否为漫画并追加标题末尾括号搜索 ==========
      try {
        // 如果没有 GM_getValue（比如运行环境不支持），默认视为启用
        const extraSearchEnabled = (typeof GM_getValue === "function")
          ? GM_getValue("enableExtraSearch", true)
          : true;

        if (!extraSearchEnabled) {
          console.log("📖 附加搜索已关闭，跳过漫画末尾括号搜索");
        } else {
          const isManga = !!document.querySelector("#gdc .ct3[onclick*='/manga']");
          const titleCombined = (galleryTitleJP || galleryTitleEN || "");
          const bracketMatch = titleCombined.match(/\(([^()]+)\)\s*(?:\[[^\]]*\]\s*)*$/);

          if (isManga && bracketMatch) {
            const extraKeyword = bracketMatch[1].trim();
            if (extraKeyword) {
              const quotedKeyword = `"${extraKeyword}"`;
              console.log("📖 附加搜索关键词 =", quotedKeyword);

              let page = 0;
              let nextURL = `/?f_search=${encodeURIComponent('"' + extraKeyword + '"')}&advsearch=1&f_sfl=on&f_sfu=on&f_sft=on`;
              const tempList = [];
              const MAX_PAGES = Infinity;

              while (nextURL && page < MAX_PAGES) {
                  const res = await fetch(nextURL);
                  const html = await res.text();
                  const doc = new DOMParser().parseFromString(html, "text/html");

                  const blocks = [...doc.querySelectorAll(".gl1t, .gl2t, .gl3t")];
                  if (!blocks.length) break;

                  for (const b of blocks) {
                      const a = b.querySelector("a");
                      if (!a) continue;
                      const title = a.textContent.trim();
                      const url = a.href;
                      const linkPath = new URL(url).pathname.replace(/\/$/, "");
                      if (linkPath === window.location.pathname.replace(/\/$/, "")) continue;
                      if (tempList.some(x => x.url === url)) continue;
                      tempList.push({ title, url, language: "⏳ 加载中…", from: `🔹 ${extraKeyword}` });
                  }

                  const nextAnchor = doc.querySelector("#unext");
                  if (nextAnchor && nextAnchor.tagName.toLowerCase() === "a") {
                      nextURL = nextAnchor.href;
                      console.log("➡ 附加搜索下一页 URL:", nextURL);
                  } else {
                      nextURL = null;
                      console.log("➡ 附加搜索已到最后一页");
                  }

                  page++;
                  await new Promise(r => setTimeout(r, 0));
              }

              if (!tempList.length) {
                showToast(`⚠ 未找到 ${extraKeyword} 相关画廊`);
              } else {
                // 静默抓取详情并合并
                const promises = tempList.map(async item => {
                  try {
                    const detailRes = await fetchWithRetry(item.url);
                    const detailHtml = await detailRes.text();
                    const detailDoc = new DOMParser().parseFromString(detailHtml, "text/html");

                    item.engTitle = detailDoc.querySelector("#gn")?.textContent?.trim() || "";
                    const gd1Div = detailDoc.querySelector("#gd1 > div");
                    if (gd1Div) {
                      const bg = gd1Div.style.backgroundImage || "";
                      const match = bg.match(/url\(["']?(.*?)["']?\)/);
                      if (match) item.cover = match[1];
                    }

                    const langRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find(td =>
                      /语言|Language/i.test(td.textContent)
                    );
                    if (langRow) {
                      const valueTd = langRow.nextElementSibling;
                      const rawLang = valueTd?.textContent?.trim() || "";
                      item.language = rawLang.replace(/\b(TR|RW)\b/gi, "").trim() || "—";
                    } else {
                      item.language = "—";
                    }

                    const sizeRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find(td =>
                      /File Size|文件大小/i.test(td.textContent)
                    );
                    item.fileSize = sizeRow?.nextElementSibling?.textContent?.trim() || "—";

                    const lenRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find(td =>
                      /Length|页数/i.test(td.textContent)
                    );
                    const m = lenRow?.nextElementSibling?.textContent?.match(/\d+/);
                    item.pages = m ? parseInt(m[0]) : "—";

                    const dateRow = [...detailDoc.querySelectorAll("#gdd .gdt1")].find(td =>
                      /Posted|发布于/i.test(td.textContent)
                    );
                    const rawDate = dateRow?.nextElementSibling?.textContent?.trim() || "—";
                    item.posted = rawDate.match(/\d{4}-\d{2}-\d{2}/)?.[0] || rawDate;
                  } catch (e) {
                    item.language = "—";
                  }
                  return item;
                });

                let extraList = await Promise.all(promises);
                const allowedLangs = ["chinese", "japanese", "english", "korean"];
                extraList = extraList.filter(item =>
                  allowedLangs.some(lang => item.language?.toLowerCase().includes(lang))
                );

                console.log(`✅ 附加搜索抓取完毕：共 ${extraList.length} 条（${page} 页）`);

                const allList = [...cachedList, ...extraList];
                const seen = new Set();
                cachedList = allList.filter(it => {
                  if (!it?.url) return false;
                  if (seen.has(it.url)) return false;
                  seen.add(it.url);
                  return true;
                });

                // ✅ 全局按发布时间统一排序（主搜索 + 附加搜索）
                cachedList.sort((a, b) => {
                  const da = new Date(a.posted).getTime() || 0;
                  const db = new Date(b.posted).getTime() || 0;
                  return db - da; // 最新的排最前
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("📖 附加搜索模块出错：", err);
      }

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

      // ✅ 新增：只在特定类别启用搜索
      const categoryDiv = document.querySelector("#gdc .cs");
      if (!categoryDiv) return; // 找不到类别 → 不执行
      const allowedCats = ["ct0", "ct2", "ct3", "ct9"]; // 私有 / 同人志 / 漫画 / 无H
      const isAllowed = allowedCats.some(c => categoryDiv.classList.contains(c));
      if (!isAllowed) return; // 不在允许类别 → 不执行

      showToast("⏳ 正在搜索相似画廊…");

      const list = await fetchSimilarList();

      if (list.length) {
        cachedList = list;
        isLoaded = true;
        showToast(`✅ 搜索完成，共找到 ${list.length} 个相似画廊`);
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

      // ✅ 首次打开悬浮窗时自动执行强制刷新排序（只执行一次）
      requestAnimationFrame(() => {
        if (popup && typeof popup.forceRefreshSort === "function") {
          popup.forceRefreshSort();
          // console.log("🔄 搜索完成后强制刷新排序完成");
        }
      });

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

  // ================== 删除多余按钮（Load Comic + 多页查看器） ==================
  if (GM_getValue("enableDelExtraBtns", true)) {
    // 删除 MPV 按钮
    const mpvBtn = sideBar.querySelector('p a[href*="/mpv/"]');
    mpvBtn?.closest('p')?.remove();

    // 删除 Load Comic 按钮
    function removeLoadComicNodes(root) {
      const anchors = (root || document).querySelectorAll('p.g2.gsp a, p.g2 a');
      anchors.forEach((a) => {
        const text = (a.textContent || "").trim().toLowerCase();
        const href = (a.getAttribute("href") || "").trim().toLowerCase();

        const isLoadComicText = text.includes("load comic") || text.includes("loadcomic");
        const isJsHref = href === "javascript:;";

        if (!(isLoadComicText || isJsHref)) return;

        const p = a.closest("p");
        if (!p) return;

        const pText = (p.textContent || "").toLowerCase();
        const safeMarkers = ["tag-all", "tag-pas", "相似画廊"];
        if (safeMarkers.some((s) => pText.includes(s.toLowerCase()))) return;

        p.remove();
      });
    }

    // 初次清理一次
    removeLoadComicNodes(sideBar);

    // 动态监听（5秒后自动断开）
    const observer = new MutationObserver(() => removeLoadComicNodes(sideBar));
    observer.observe(sideBar, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 5000);
  }

  // ================== 移除 newtagfield 的 maxlength 限制 ==================
  const tagField = document.getElementById("newtagfield");
  if (tagField) {
    tagField.removeAttribute("maxlength"); // 移除 maxlength
  }

})();
