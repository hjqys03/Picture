// ==UserScript==
// @name         Ex CommentFilter
// @namespace    http://tampermonkey.net/
// @icon         https://exhentai.org/favicon.ico
// @version      2.16
// @match        https://e-hentai.org/g/*
// @match        https://exhentai.org/g/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    const config = GM_getValue("filterConfigV2", {
        line1_enable: false,
        line1_keywords: [],
        line1_minScore: 6,
        line2_enable: false,
        line2_keywords: [],
        line3_enable: false,
        line3_minScore: 6,
        line4_enable: false,
        line4_usernames: []
    });

    // ----------------- Toast 样式 -----------------
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
            z-index: 2147483647;
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
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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

    function showToast(msg) {
        let container = document.querySelector(".eh-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.className = "eh-toast-container";
            document.body.appendChild(container);
        }
        const toast = document.createElement("div");
        toast.className = "eh-toast";
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) container.remove();
        }, 3600);
    }

    // ----------------- 设置面板 -----------------
    function createSettings() {
        const overlay = document.createElement("div");
        overlay.id = "filter-setting-overlay";
        Object.assign(overlay.style, {
            position: "fixed", top: 0, left: 0,
            width: "100%", height: "100%",
            background: "rgba(0,0,0,0.6)",
            zIndex: 999998,
            display: "none"
        });
        overlay.addEventListener("click", e => {
            if (e.target === overlay) overlay.style.display = "none";
        });

        const box = document.createElement("div");
        box.id = "filter-setting-box";
        const bodyStyle = window.getComputedStyle(document.body);
        const bgColor = bodyStyle.backgroundColor || "#E3E0D1";
        const fontColor = bodyStyle.color || "#5C0D11";
        const gm = document.querySelector(".gm");
        const gmStyle = gm ? window.getComputedStyle(gm) : null;
        const borderColor = gmStyle ? gmStyle.borderColor : "#5C0D12";

        Object.assign(box.style, {
            position: "fixed",
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            background: bgColor,
            color: fontColor,
            border: `1px solid ${borderColor}`,
            padding: "16px",
            borderRadius: "8px",
            width: "650px",
            fontSize: "14px",
            maxHeight: "90vh",
            overflowY: "auto",
            textAlign: "left",
            zIndex: 999999
        });

        box.innerHTML = `
            <h3 style="text-align:center;">隐藏画廊评论设置</h3><br>

            <div style="display:flex;align-items:center;margin-bottom:8px;color:inherit;">
                <label style="margin-right:6px;"><input type="checkbox" id="line1_enable" ${config.line1_enable?'checked':''}></label>
                <span style="margin-right:4px;">隐藏包含以下任意关键词</span>
                <input type="text" id="line1_keywords" value="${config.line1_keywords.join(',')}" placeholder="使用英文逗号分隔关键词" style="flex:1;margin-right:4px;color:inherit;">
                <span style="margin-right:4px;">并且分数低于</span>
                <input type="number" id="line1_minScore" value="${config.line1_minScore}" style="width:50px;margin-right:4px;color:inherit;">
                <span>的画廊评论</span>
            </div>

            <div style="display:flex;align-items:center;margin-bottom:8px;color:inherit;">
                <label style="margin-right:6px;"><input type="checkbox" id="line2_enable" ${config.line2_enable?'checked':''}></label>
                <span style="margin-right:4px;">隐藏包含以下任意关键词的画廊评论</span>
                <input type="text" id="line2_keywords" value="${config.line2_keywords.join(',')}" placeholder="使用英文逗号分隔关键词" style="flex:1;color:inherit;">
            </div>

            <div style="display:flex;align-items:center;margin-bottom:8px;color:inherit;">
                <label style="margin-right:6px;"><input type="checkbox" id="line3_enable" ${config.line3_enable?'checked':''}></label>
                <span style="margin-right:4px;">隐藏分数低于</span>
                <input type="number" id="line3_minScore" value="${config.line3_minScore}" style="width:50px;margin-right:4px;color:inherit;">
                <span>的画廊评论</span>
            </div>

            <div style="display:flex;align-items:center;margin-bottom:8px;color:inherit;">
                <label style="margin-right:6px;"><input type="checkbox" id="line4_enable" ${config.line4_enable?'checked':''}></label>
                <span style="margin-right:4px;">隐藏以下用户的评论</span>
                <input type="text" id="line4_usernames" value="${config.line4_usernames.join(',')}" placeholder="使用英文逗号分隔关键词" style="flex:1;color:inherit;">
            </div>

            <div style="text-align:center;margin-top:10px;">
                <button id="saveFilterConfig" style="margin-right:8px;">保存</button>
                <button id="closeFilterConfig">关闭</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const saveBtn = box.querySelector("#saveFilterConfig");
        const closeBtn = box.querySelector("#closeFilterConfig");

        [saveBtn, closeBtn].forEach(btn => {
            btn.style.border = `1px dashed ${fontColor}`;
            btn.style.background = bgColor;
            btn.style.color = fontColor;
            btn.style.padding = "4px 12px";
            btn.style.borderRadius = "4px";
            btn.style.cursor = "pointer";

            btn.addEventListener("mouseenter", () => btn.style.border = `1px solid ${fontColor}`);
            btn.addEventListener("mouseleave", () => btn.style.border = `1px dashed ${fontColor}`);
        });

        saveBtn.onclick = () => {
            config.line1_enable = document.getElementById("line1_enable").checked;
            config.line1_keywords = document.getElementById("line1_keywords").value.split(',').map(s=>s.trim()).filter(Boolean);
            config.line1_minScore = parseInt(document.getElementById("line1_minScore").value) || 0;

            config.line2_enable = document.getElementById("line2_enable").checked;
            config.line2_keywords = document.getElementById("line2_keywords").value.split(',').map(s=>s.trim()).filter(Boolean);

            config.line3_enable = document.getElementById("line3_enable").checked;
            config.line3_minScore = parseInt(document.getElementById("line3_minScore").value) || 0;

            config.line4_enable = document.getElementById("line4_enable").checked;
            config.line4_usernames = document.getElementById("line4_usernames").value.split(',').map(s=>s.trim()).filter(Boolean);

            GM_setValue("filterConfigV2", config);
            showToast("✅ 设置已保存，屏蔽规则立即生效");
            overlay.style.display = "none";
        };

        closeBtn.onclick = () => overlay.style.display = "none";
    }

    GM_registerMenuCommand("评论屏蔽设置", () => {
        const overlay = document.getElementById("filter-setting-overlay");
        if (!overlay) createSettings();
        document.getElementById("filter-setting-overlay").style.display = "block";
    });

    // ----------------- 屏蔽功能 -----------------
    function filterComments() {
        document.querySelectorAll(".c1").forEach(comment => {
            const username = comment.querySelector(".c3 a")?.innerText || "";
            const userid = comment.querySelector(".c3 a")?.href?.match(/showuser=(\d+)/)?.[1] || "";
            const text = comment.querySelector(".c6")?.innerText || "";
            const scoreSpan = comment.querySelector(".c5 span");
            const score = scoreSpan ? parseInt(scoreSpan.innerText.replace(/\+/,'') || 0) : null;

            if (config.line1_enable &&
                config.line1_keywords.some(k=>text.includes(k)) &&
                score !== null && score < config.line1_minScore) { comment.style.display = "none"; return; }

            if (config.line2_enable &&
                config.line2_keywords.some(k=>text.includes(k))) { comment.style.display = "none"; return; }

            if (config.line3_enable && score !== null && score < config.line3_minScore) { comment.style.display = "none"; return; }

            if (config.line4_enable && (config.line4_usernames.includes(username) || config.line4_usernames.includes(userid))) {
                comment.style.display = "none"; return;
            }
        });
    }

    const observer = new MutationObserver(filterComments);
    observer.observe(document.body, { childList:true, subtree:true });

})();
