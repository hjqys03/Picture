// ==UserScript==
// @name         Ehentai Similar Gallery + TagDuplicator (搜索相似画廊 & 复制标签)
// @namespace    https://greasyfork.org/zh-CN/users/51670-ruaruarua
// @version      0.3.2
// @author       ruaruarua + atashiyuki + you
// @description  Duplicate tags and search similar gallery (with unified button style and spacing fix)
// @description:zh-cn Ehentai 搜索相似画廊 & 复制标签
// @match        https://exhentai.org/g/*
// @match        https://e-hentai.org/g/*
// @icon         https://exhentai.org/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  // =============== 脚本一核心函数 ===============
  var exclude_namespaces = ["language", "reclass"];
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
    for (let namespace in tags) {
      for (let tag of tags[namespace]) {
        text += namespace + ":" + tag + ",";
      }
    }
    field.value = text;

    if (text.length == 0) {
      const originalPlaceholder = field.getAttribute("placeholder") || ""; // 保存原有 placeholder
      const msg = get_text_in_local_language({
        "zh-CN": "没有可添加的标签…",
        "en-US": "no tags to add...",
        default: "no tags to add...",
      });
      field.placeholder = msg;

      // 3 秒后恢复原始 placeholder
      setTimeout(() => {
        if (field.value === "" && field.placeholder === msg) {
          field.placeholder = originalPlaceholder;
        }
      }, 3000);
    }
  }

  function subtract_tags(current_tags, tags_to_add) {
    const blacklist = [
      "extraneous ads",
      "full censorship",
      "mosaic censorship",
      "scanmark",
      "rough translation",
      "watermarked",
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

    // ✅ 如果输入空字符串 → 导入当前画廊标签，不过滤黑名单
    if (url.trim() === "") {
      get_source_async(window.location.href, function (text) {
        var tags_current = parse_tags(text);
        fill_tag_field(tags_current);
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

    // ✅ 如果输入空字符串 → 导入当前画廊标签，不过滤黑名单
    if (url.trim() === "") {
      get_source_async_gt(window.location.href, function (text) {
        var tags_current = parse_tags(text);
        fill_tag_field(tags_current);
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
          /^(?:(?:\([^)]*\))|(?:\[[^\]]*\])|(?:\{[^}]*\})|(?:~[^~]*~)|\s+)*/g;
    const PATTERN_TITLE_SUFFIX =
          /(?:\s+ch.[\s\d-]+)?(?:(?:\([^)]*\))|(?:\[[^\]]*\])|(?:\{[^}]*\})|(?:~[^~]*~)|\s+)*$/gi;

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

    // ✅ 日语 / 罗马音 → 都遇到 | ｜ + 才截断
    const separateIndex = extractTitle.search(/\||｜|\+/);
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

  // 第二行：IMTG-ALL / IMTG-PAS
  const row2 = document.createElement("p");
  row2.className = "g2";
  const img2 = document.createElement("img");
  img2.src = img1.src;
  row2.appendChild(img2);
  row2.appendChild(document.createTextNode(" "));

  row2.appendChild(
    addLink({ text: "IMTG-ALL", onClick: () => start(), title: "导入所有标签" })
  );
  row2.append(" / ");
  row2.appendChild(
    addLink({ text: "IMTG-PAS", onClick: () => start_gt(), title: "导入确定标签" })
  );

  // 添加到侧边栏
  sideBar.appendChild(row1);
  sideBar.appendChild(row2);
})();
