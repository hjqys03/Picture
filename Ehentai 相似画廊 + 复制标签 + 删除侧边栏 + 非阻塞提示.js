// ==UserScript==
// @name         Ehentai 相似画廊 + 复制标签 + 删除侧边栏 + 非阻塞提示
// @namespace    https://e-hentai.org/?f_cats=0
// @version      0.3.3
// @author       ruaruarua + atashiyuki + ???
// @description  Ehentai 搜索相似画廊 & 复制标签 & 删除 “Load comic”、“多页查看器” 侧边栏按钮 & 非阻塞提示(标签)
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

  // 第一行：相似画廊
  const row1 = document.createElement("p");
  row1.className = "g2 gsp";
  const img1 = document.createElement("img");
  img1.src =
    window.location.hostname.indexOf("exhentai") >= 0
      ? "https://exhentai.org/img/mr.gif"
      : "https://ehgt.org/g/mr.gif";
  row1.appendChild(img1);
  row1.appendChild(document.createTextNode(" "));
  row1.appendChild(
    addLink({
      text: "相似画廊",
      href: searchHref,
      title: `标题搜索：${extractTitle}`,
    })
  );

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
