// ==UserScript==
// @name         EH 标签预览 + 移除标题
// @namespace    http://tampermonkey.net/
// @icon         https://e-hentai.org/favicon.ico
// @version      1.0
// @description  在 E-Hentai/ExHentai 缩略图悬停时显示标签，同时移除原生图片/元素的标题提示
// @author       合并版
// @match        *://exhentai.org/*
// @match        *://e-hentai.org/*
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const $ = window.jQuery;
    let cache = {};
    let tags = {};

    // ====== 功能1：移除原生的图片和 DIV 的 title 属性（去掉默认提示文字） ======
    document.body.addEventListener('mouseover', function() {
        document.querySelectorAll('img[title], div[title]').forEach(function(el) {
            el.setAttribute('title', '');
        });
    }, true);

    // ====== 功能2：悬停显示标签预览 ======

    // 判断当前是否为扩展模式，如果是则不启用预览功能
    function isExtendedMode() {
        return $('select[onchange*="inline_set=dm_"] option[value="e"]').is(':selected');
    }

    if (isExtendedMode()) {
        return;
    }

    // 创建标签预览容器
    const $tagP = $('<div id="tagPreview">');
    $tagP.css({
        position: 'absolute',
        zIndex: '2',
        visibility: 'hidden!important',
        maxWidth: '400px',
        background: window.getComputedStyle(document.getElementsByClassName('ido')[0]).backgroundColor,
        border: '1px solid #000',
        padding: '10px',
        borderRadius: '8px', // 圆角
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)' // 阴影
    });
    $tagP.appendTo("body");
    $('#tagPreview').css('visibility', 'hidden');

    // 根据当前浏览模式选择缩略图选择器
    const element = getElementSelector();

    // 计算预览框显示位置
    function calculatePosition(e) {
        let posX, posY;
        const padding = 10;
        const windowHeight = $(window).height();
        const windowWidth = $(window).width();
        const previewHeight = $('#tagPreview').outerHeight();
        const previewWidth = $('#tagPreview').outerWidth();

        // X 方向
        if (e.pageX + previewWidth + padding > windowWidth) {
            posX = e.pageX - previewWidth - padding;
        } else {
            posX = e.pageX + padding;
        }

        // Y 方向
        if (e.pageY + previewHeight + padding > $(window).scrollTop() + windowHeight) {
            posY = e.pageY - previewHeight - padding;
        } else {
            posY = e.pageY + padding;
        }

        // 防止超出屏幕顶部
        if (posY < $(window).scrollTop()) {
            posY = $(window).scrollTop() + padding;
        }

        return { posX, posY };
    }

    // 绑定缩略图事件
    $('.itg').on('mouseover', element, async function(e) {
        let split = this.href.split('/');
        let gid = split[4] + '.' + split[5];

        if(!cache[gid]) {
            let data = await requestAPI([[split[4], split[5]]]);
            if(data) cache[gid] = data;
        }

        generateTagPreview(cache[gid]);

        const position = calculatePosition(e);
        $tagP.css({
            left: position.posX,
            top: position.posY,
            border: '1px solid ' + window.getComputedStyle(document.getElementsByTagName("a")[0]).getPropertyValue("color"),
            visibility: 'visible'
        });
    })
    .on('mousemove', element, function(e) {
        const position = calculatePosition(e);
        $tagP.css({
            visibility:'visible',
            top: position.posY,
            left: position.posX
        });
    })
    .on('mouseout', element, function() {
        $tagP.css('visibility', 'hidden');
        $tagP.empty();
    });

    // 滚动时隐藏预览框
    $(document).on('scroll', function() {
        $('#tagPreview').css('visibility', 'hidden');
    });

    // 根据不同显示模式选择缩略图元素
    function getElementSelector() {
        if($('.gl3m').length) return '.gl3m a';
        if($('.gl1t').length) return '.gl3t a';
        if($('.gl1e').length) return '.gl1e a';
        if($('.gl1c').length) return '.gl3c a';
        return '.gl3t a';
    }

    // 调用 API 获取标签信息
    async function requestAPI(gidlist) {
        try {
            const response = await fetch(document.location.origin + "/api.php", {
                method: 'POST',
                body: JSON.stringify({
                    "method": "gdata",
                    "gidlist": gidlist,
                    "namespace": 1
                })
            });
            const data = await response.json();
            return data.gmetadata[0];
        } catch(e) {
            console.error(e);
            return null;
        }
    }

    // 生成标签预览内容
    function generateTagPreview(data) {
        if(!data) return;

        generateTags(data);

        let html = `<h1 id="gn">${data.title}</h1>`;
        if(data.title_jpn) {
            html += `<h1 id="gj">${data.title_jpn}</h1>`;
        }

        html += `<div id='taglist' style='height:fit-content;'><table><tbody>`;
        for(let namespace in tags) {
            html += `<tr><td class="tc">${namespace}:</td><td>`;
            tags[namespace].forEach(tag => {
                html += `<div id="td_${namespace}:${tag}" class="gt" style="opacity:1.0"><a id="ta_${namespace}:${tag}" href="${document.location.origin}/tag/${namespace}:${tag}">${tag}</a></div>`;
            });
            html += `</td></tr>`;
        }
        html += `</tbody></table></div>`;

        $('#tagPreview').html(html);
    }

    // 处理标签数据
    function generateTags(data) {
        tags = {};
        if (Array.isArray(data.tags)) {
            for (const jsonTag of data.tags) {
                const stringTag = getJsonString(jsonTag);
                if (stringTag === null) { continue; }

                const {tag, namespace} = getTagAndNamespace(stringTag);

                let namespaceTags;
                if (tags.hasOwnProperty(namespace)) {
                    namespaceTags = tags[namespace];
                } else {
                    namespaceTags = [];
                    tags[namespace] = namespaceTags;
                }
                namespaceTags.push(tag);
            }
        }
    }

    // 拆分命名空间和标签
    function getTagAndNamespace(tag) {
        const pattern = /^(?:([^:]*):)?([\w\W]*)$/;
        const match = pattern.exec(tag);
        return (match !== null) ?
            ({ tag: match[2], namespace: match[1] || "杂项" }) :
            ({ tag: tag, namespace: "杂项" });
    }

    // 处理 API 返回的数据格式
    function getJsonString(value) {
        if (typeof(value) === "string") { return value; }
        if (typeof(value) === "undefined" || value === null) { return value; }
        return `${value}`;
    }

})();
