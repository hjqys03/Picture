// ==UserScript==
// @name         ExResurrect Plus
// @namespace    https://sleazyfork.org/en/users/285675-hauffen
// @version      9.9.9
// @description  Resurrect E/Ex gallery listings
// @author       Hauffen (Original Author) + HeartThrob
// @license      MIT
// @runat        document-start
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @include      /https?:\/\/(e-|ex)hentai\.org\/.*/
// @downloadURL  https://raw.githubusercontent.com/hjqys03/Picture/refs/heads/main/ExResurrect%20Plus.js
// @updateURL    https://raw.githubusercontent.com/hjqys03/Picture/refs/heads/main/ExResurrect%20Plus.js
// ==/UserScript==

(function() {
    let $ = window.jQuery;
    var spl = document.URL.split('/');
	var dead, claim, language, translated;
    const category = {doujinshi: 'ct2', manga: 'ct3', artistcg: 'ct4', gamecg: 'ct5', western: 'cta', nonh: 'ct9', imageset: 'ct6', cosplay: 'ct7', asianporn: 'ct8', misc: 'ct1'};
    const fileSizeLabels = [ "B", "KB", "MB", "GB" ];
    const defaultNamespace = "misc";
    const tags = {};

    if (spl[3] != 'g') return;

    // E-Hentai 分类颜色
    const categoryColorsEH = {
        "misc":       "#707070",
        "doujinshi":  "#fc4e4e",
        "manga":      "#e78c1a",
        "artist cg":  "#c7bf07",
        "game cg":    "#1a9317",
        "image set":  "#2756aa",
        "cosplay":    "#8800c3",
        "asian porn": "#b452a5",
        "non-h":      "#0f9ebd",
        "western":    "#5dc13b"
    };

    // ExHentai 分类颜色
    const categoryColorsEX = {
        "misc":       "#777777",
        "doujinshi":  "#9E2720",
        "manga":      "#DB6C24",
        "artist cg":  "#D38F1D",
        "game cg":    "#6A936D",
        "image set":  "#325CA2",
        "cosplay":    "#6A32A2",
        "asian porn": "#A23282",
        "non-h":      "#5FA9CF",
        "western":    "#AB9F60"
    };

    // 根据站点选择颜色表
    const categoryColors = location.host.includes("exhentai.org")
    ? categoryColorsEX
    : categoryColorsEH;

    // 获取分类对应的颜色
    function getCategoryColor(glisting) {
        let cat = (glisting.category || "").toLowerCase().trim();
        cat = cat.replace(/\s+/g, " "); // 去掉多余空格
        return categoryColors[cat] || "#ccc";
    }

    function gotonext() {};

        // Override the default function to prevent redirect

   addJS_Node (gotonext); // Inject the override function before doing anything to avoid the timeout redirect

    function addJS_Node(text, s_URL, funcToRun, runOnLoad) {
        var scriptNode = document.createElement('script');
        if (runOnLoad) {
            scriptNode.addEventListener("load", runOnLoad, false);
        }
        scriptNode.type = "text/javascript";
        if (text) scriptNode.textContent = text;
        if (s_URL) scriptNode.src = s_URL;
        if (funcToRun) scriptNode.textContent = '(' + funcToRun.toString() + ')()';

        var targ = document.getElementsByTagName('head')[0] || document.body || document.documentElement;
        targ.appendChild(scriptNode);
    }

    // There's a better critera for this probably
    if ($('.d').length && !spl[3].match('upload')) {
        dead = true;
        if ($('.d').text().indexOf("copyright") > 0) claim = $('.d').text().split('by')[1].split('.')[0].trim();
        $('.d').remove(); // Leave us with an entirely blank page to build up
    }
    generateRequest();

    /**
     * Generate the JSON request for the E-H API
     */
    function generateRequest(retry = 0) {
        var reqList = [[spl[4], spl[5]]];
        var request = {"method": "gdata", "gidlist": reqList, "namespace": 1};

        var req = new XMLHttpRequest();
        req.onreadystatechange = e => {
            if (req.readyState == 4) {
                if (req.status == 200) {
                    var apirsp = JSON.parse(req.responseText);
                    for (var i = 0; i < apirsp.gmetadata.length; i++) {
                        if (dead) generateListing(apirsp.gmetadata[i]);
                        else generateLiveListing(apirsp.gmetadata[i]);
                    }
                } else {
                    if (retry < 3) {
                        console.warn("API 请求失败，重试中...", retry + 1);
                        setTimeout(() => generateRequest(retry + 1), 1000 * (retry + 1));
                    } else {
                        console.error("API 请求多次失败，放弃。");
                    }
                }
            }
        };
        req.open("POST", document.location.origin + "/api.php", true);
        req.send(JSON.stringify(request));
    }

    function generateListing(glisting) {
        let categoryColor = getCategoryColor(glisting);
        var d = new Date(glisting.posted * 1000);
        document.title = glisting.title;
        generateTags(glisting);
        // There's a better way to do this, but I suck
        var listing = $(`
        <div id="nb" class="nose1">
            <div><a href="` + document.location.origin + `">Front<span class="nbw1"> Page</span></a></div>
            <div><a href="` + document.location.origin + `/watched">Watched</a></div>
            <div><a href="` + document.location.origin + `/popular">Popular</a></div>
            <div><a href="` + document.location.origin + `/torrents.php">Torrents</a></div>
            <div><a href="` + document.location.origin + `/favorites.php">Fav<span class="nbw1">orite</span>s</a></div>
            <div><a href="` + document.location.origin + `/uconfig.php">Settings</a></div>
            <div><a href="` + document.location.origin + `/upload/manage.php"><span class="nbw2">My </span>Uploads</a></div>
            <div><a href="` + document.location.origin + `/mytags">My Tags</a></div>
        </div>
        <div class="gm">
            <div id="gleft">
            <div id="gd1" style="display:flex; justify-content:center; align-items:center; width:250px; height:354px;">
                <img src="${glisting.thumb}"
                     style="max-width:100%; max-height:95%; object-fit:contain;
                     border:2px solid ${categoryColor}; border-radius:6px;
                     box-shadow:0 0 8px ${categoryColor};">
            </div>
            </div>
            <div id="gd2">
                <h1 id="gn">` + glisting.title + `</h1>
                <h1 id="gj">` + glisting.title_jpn + `</h1>
            </div>
            <div id="gmid">
                <div id="gd3">
                    <div id="gdc">
                        <div class="cs ` + category[glisting.category.toLowerCase().replace(/ /g, '').replace(/-/g, '')] + `" onclick="document.location='` + document.location.origin + '/' + glisting.category.toLowerCase().replace(/ /g, '') + `'">` + glisting.category + `</div>
                    </div>
                    <div id="gdn">
                        <a href="` + document.location.origin + '/uploader/' + glisting.uploader + '">' + glisting.uploader + `</a>
                    </div>
                    <div id="gdd">
                        <table>
                            <tbody>
                                <tr><td class="gdt1">Posted:</td><td class="gdt2">` + d.getUTCFullYear().toString() + '-' + (d.getUTCMonth() + 1).toString().padStart(2, '0') + '-' + d.getUTCDate().toString().padStart(2, '0') + ' ' + d.getUTCHours().toString().padStart(2, '0') + ':' + d.getUTCMinutes().toString().padStart(2, '0') + `</td></tr>
                                <tr><td class="gdt1">Visible:</td><td class="gdt2">` + (glisting.expunged ? 'No' : 'Yes') + `</td></tr>
                                <tr><td class="gdt1">Language:</td><td class="gdt2">` + (translated ? language + `&nbsp <span class="halp" title="This gallery has been translated from the original language text.">TR</span>` : language) + `</td></tr>
                                <tr><td class="gdt1">File Size:</td><td class="gdt2">` + getPrettyFileSize(glisting.filesize) + `</td></tr>
                                <tr><td class="gdt1">Length:</td><td class="gdt2">` + glisting.filecount + ` pages</td></tr>
                                <tr><td class="gdt1">Removal:</td><td class="gdt2">` + claim + `</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div id="gdr">
                        <table>
                            <tbody>
                                <tr>
                                    <td class="grt1">Rating:</td>
                                    <td class="grt2">
                                        <div id="rating_image" class="ir" style="background-position:` + getStarNumber(glisting.rating, true) + `"></div>
                                    </td>
                                </tr>
                                <tr><td id="rating_label" colspan="2">Average: ` + glisting.rating + `</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div id="gdf">
                        <div style="float:left; cursor:pointer;" id="fav"></div>
                        &nbsp;
                        <a id="favoritelink" href="#" onclick="window.open('` + document.location.origin + '/gallerypopups.php?gid=' + glisting.gid + '&t=' + glisting.token + `&act=addfav','Add to Favorites','width=675,height=415')">
                            <img src="` + (window.location.hostname.indexOf("exhentai") >= 0 ? "https://exhentai.org/img/mr.gif" : "https://ehgt.org/g/mr.gif") + `" />
                            Add to Favorites
                        </a>
                    </div>
                </div>
                <div id="gd4">
                    <div id="taglist">
                    </div>
                </div>
                <div id="gd5">
                    <p class="g3 gsp">
                        <img src="` + (window.location.hostname.indexOf("exhentai") >= 0 ? "https://exhentai.org/img/mr.gif" : "https://ehgt.org/g/mr.gif") + `" />
                        <a href="">画廊不可用</a>
                    </p>
                    <p class="g2 gsp">
                        <img src="` + (window.location.hostname.indexOf("exhentai") >= 0 ? "https://exhentai.org/img/mr.gif" : "https://ehgt.org/g/mr.gif") + `" />
                        <a id="dl_eze" href="#">EZE JSON</a>
                    </p>
                    <p class="g2">
                        <img src="` + (window.location.hostname.indexOf("exhentai") >= 0 ? "https://exhentai.org/img/mr.gif" : "https://ehgt.org/g/mr.gif") + `" />
                        <a id="dl_ehdl">E-HDL JSON</a>
                    </p>
                    <p class="g2">
                        <img src="` + (window.location.hostname.indexOf("exhentai") >= 0 ? "https://exhentai.org/img/mr.gif" : "https://ehgt.org/g/mr.gif") + `" />
                        <a id="dl_gdl">Gallery-DL JSON</a>
                    </p>
                </div>
                <div class="c"></div>
            </div>
            <div class="c"></div>
        </div>
        `);
        $('body').append(listing);
        // Generate taglist table
        var taglist = "<table><tbody>";
        for (const namespace in tags) {
            taglist += `<tr><td class="tc">${namespace}:</td><td>`;
            for (var i = 0; i < tags[namespace].length; i++) {
                taglist += `<div id="td_${namespace}:${tags[namespace][i]}" class="gt" style="opacity:1.0"><a id="ta_${namespace}:${tags[namespace][i]}" href="${document.location.origin}/tag/${namespace}:${tags[namespace][i]}">${tags[namespace][i]}</a></div>`;
            }
            taglist += "</td></tr>";
        }
        taglist += "</tbody></table>";
        $('#taglist').append(taglist);
        // I want to make these smaller, but the 'this' call prevents me from doing so
        $('#dl_eze').on('click', function() {
            var json = JSON.stringify(toEze(glisting), null, "  "),
                blob = new Blob([json], {type: "octet/stream"}),
                url = window.URL.createObjectURL(blob);
            this.href = url;
            this.target = '_blank';
            this.download = 'info.json';
        });
        $('#dl_ehdl').on('click', function() {
            var blob = new Blob([toEhDl(glisting)], {type: "text/plain"}),
                url = window.URL.createObjectURL(blob);
            this.href = url;
            this.target = '_blank';
            this.download = 'info.json';
        });
        $('#dl_gdl').on('click', function() {
            var json = JSON.stringify(toGalleryDl(glisting), null, "  "),
                blob = new Blob([json], {type: "octet/stream"}),
                url = window.URL.createObjectURL(blob);
            this.href = url;
            this.target = '_blank';
            this.download = 'info.json';
        });
        // Try to generate torrent links
        if (glisting.torrentcount > 0) {
            $(`<div id="torrents" style="border-top:1px solid #000; padding: 5px 10px 5px 10px;">
                <p><span class="halp" title="如果种子链接无效，请尝试磁力链接">可能有效的种子：</span></p>
            </div>`).appendTo('.gm');

            for (var j = 0; j < glisting.torrentcount; j++) {
                let torrent = glisting.torrents[j];
                let icon = (window.location.hostname.indexOf("exhentai") >= 0
                    ? "https://exhentai.org/img/mr.gif"
                    : "https://ehgt.org/g/mr.gif");

                // 先注入 CSS 样式
                $('<style>')
                    .prop('type', 'text/css')
                    .html(`
                        .torrent-box {
                            border: 1px dashed currentColor;
                            border-radius: 5px;
                            padding: 5px;
                            margin: 3px 0;
                        }
                        .torrent-box:hover {
                            border-style: solid;
                        }

                        .torrent-name {
                            display: flex;
                            align-items: center;
                            flex: 1;
                            min-width: 0;
                        }
                        .torrent-name img {
                            width: 6px;
                            height: 7px;
                            flex-shrink: 0;
                        }
                        .torrent-name a {
                            padding-left: 3px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            display: block;
                            max-width: 100%;
                            line-height: 1.2;
                            align-self: center;
                        }
                    `)
                    .appendTo('head');

                // 然后生成内容
                $(`<div class="torrent-box">
                        <!-- 第一行：文件名（左） | 文件大小（右固定布局） -->
                        <div style="display:flex; justify-content:space-between; font-size:inherit;">
                            <div class="torrent-name">
                                <img src="${icon}" />
                                <a href="${generateTorrentLink(glisting, j)}">${torrent.name}</a>
                            </div>
                            <div style="display:flex; align-items:baseline; min-width:220px; margin-left:5px;">
                                <div style="flex:1; text-align:right; font-weight:bold;">文件大小：</div>
                                <div style="flex:1; text-align:center;">${getPrettyFileSize(torrent.fsize)}</div>
                            </div>
                        </div>

                        <!-- 第二行：磁力链接（左） | 发布时间（右固定布局） -->
                        <div style="display:flex; justify-content:space-between; font-size:inherit; margin-top:2px;">
                            <div class="torrent-name">
                                <img src="${icon}" style="visibility:hidden;" />
                                <a href="magnet:?xt=urn:btih:${torrent.hash}">磁力链接</a>
                            </div>
                            <div style="display:flex; align-items:baseline; min-width:220px; margin-left:5px;">
                                <div style="flex:1; text-align:right; font-weight:bold;">发布时间：</div>
                                <div style="flex:1; text-align:center;">${getTimestampDateString(torrent.added * 1000)}</div>
                            </div>
                        </div>
                    </div>`
                 ).appendTo('#torrents');

            }
        }

        generateSearchLink(glisting);
    }

    function generateLiveListing(glisting) {
        let categoryColor = getCategoryColor(glisting);

        $('#gd1 > div').css({
            "border": "2px solid " + categoryColor,
            "border-radius": "6px",
            "box-shadow": "0 0 8px " + categoryColor
        });
        generateTags(glisting);
        var listing = $(`
            <p class="g2">
                <img src="` + (window.location.hostname.indexOf("exhentai") >= 0 ? "https://exhentai.org/img/mr.gif" : "https://ehgt.org/g/mr.gif") + `" />
                <a id="dl_eze" href="#">EZE</a> / <a id="dl_ehdl" href="#">E-HDL</a> / <a id="dl_gdl" href="#">G-DL</a>
            </p>`);
        $('#gd5').append(listing);
        $('#gmid').css('height', 'unset');
        $('#dl_eze').on('click', function() {
            var json = JSON.stringify(toEze(glisting), null, "  "),
                blob = new Blob([json], {type: "octet/stream"}),
                url = window.URL.createObjectURL(blob);
            this.href = url;
            this.target = '_blank';
            this.download = 'info.json';
        });
        $('#dl_ehdl').on('click', function() {
            var blob = new Blob([toEhDl(glisting)], {type: "text/plain"}),
                url = window.URL.createObjectURL(blob);
            this.href = url;
            this.target = '_blank';
            this.download = 'info.json';
        });
        $('#dl_gdl').on('click', function() {
            var json = JSON.stringify(toGalleryDl(glisting), null, "  "),
                blob = new Blob([json], {type: "octet/stream"}),
                url = window.URL.createObjectURL(blob);
            this.href = url;
            this.target = '_blank';
            this.download = 'info.json';
        });
        generateSearchLink(glisting);
    }

    function generateSearchLink(glisting) {
        $('#menu').remove(); // 防止重复

        var isEx = window.location.hostname.indexOf("exhentai") >= 0;
        var icon = isEx ? "https://exhentai.org/img/mr.gif" : "https://ehgt.org/g/mr.gif";

        // ===== 提取短标题 / 完整标题 =====
        var shortTitle = glisting.title_jpn ? getShortTitle(glisting.title_jpn) : getShortTitle(glisting.title);
        var fullTitle = glisting.title_jpn ? glisting.title_jpn : glisting.title;

        // 站内搜索加引号
        var shortEncodedEH = encodeURIComponent('"' + shortTitle + '"');

        // 外站搜索保持原样
        var shortEncoded = encodeURIComponent(shortTitle);

        // 给 DLsite 专用：空格改成 +
        var shortEncodedDLsite = encodeURIComponent(shortTitle).replace(/%20/g, "+");

        // ===== 从 taglist 提取 E-Hentai 专用艺术家 =====
        function getEhArtists() {
            let artists = [];
            $('#gd4 #taglist .tc').each(function () {
                if ($(this).text().includes("艺术家:")) {
                    $(this).next("td").find("a[title^='a:']").each(function () {
                        let tag = $(this).attr("title"); // 例如 "a:sunaba_yuu"
                        if (tag && tag.startsWith("a:")) {
                            let id = tag.substring(2); // sunaba_yuu
                            let displayName = $(this).attr("lang") === "zh-hans"
                            ? $(this).text().trim() // 优先中文翻译
                            : id; // 否则用 id
                            artists.push({ id, name: displayName });
                        }
                    });
                }
            });
            return artists.length > 0 ? artists : null;
        }
        var ehAuthors = getEhArtists();

        // ===== 从标题提取作者（备用逻辑） =====
        function extractAuthor(title) {
            if (!title) return null;
            title = title.replace(/^\([^)]*\)\s*/, ""); // 去掉开头展会名

            // 匹配 [社团名(作者1×作者2)] 或 [作者1×作者2]
            let circleAuthorsMatch = title.match(/^\s*\[[^\]]*?\(([^)]+)\)\]/);
            if (circleAuthorsMatch) {
                return circleAuthorsMatch[1]
                    .split(/[、,，&＆×]/) // 艺术家分割符号
                    .map(a => a.trim())
                    .filter(a => a.length > 0);
            }

            let authorMatch = title.match(/^\s*\[([^\]]+)\]/);
            if (authorMatch) {
                return authorMatch[1]
                    .split(/[、,，&＆×]/) // 艺术家分割符号
                    .map(a => a.trim())
                    .filter(a => a.length > 0);
            }
            return null;
        }

        var backupAuthors = extractAuthor(glisting.title_jpn) || extractAuthor(glisting.title);

        // ===== 屏蔽特定作者来源 =====
        const blockedAuthors = ["fanbox", "patreon", "pixiv"];

        let validEhAuthors = (ehAuthors || []).filter(a =>
                                                      !blockedAuthors.some(b => a.id.toLowerCase().includes(b))
                                                     );
        let validBackupAuthors = (backupAuthors || []).filter(a =>
                                                              !blockedAuthors.some(b => a.toLowerCase().includes(b))
                                                             );

        // ===== 最终作者来源选择逻辑 =====
        let useEhAuthors = false;

        if (validEhAuthors.length > 0 && validBackupAuthors.length > 0) {
            if (validEhAuthors.length < validBackupAuthors.length) {
                // 标签作者数少于标题解析作者数 → 用标题作者
                useEhAuthors = false;
            } else {
                // 标签作者数大于或等于标题解析作者数 → 用标签作者
                useEhAuthors = true;
            }
        } else if (validEhAuthors.length > 0) {
            useEhAuthors = true;
        } else if (validBackupAuthors.length > 0) {
            useEhAuthors = false;
        }

        // ===== 主菜单容器 =====
        var menu = $(`<div id="menu" style="font-weight:bold; font-size:10pt; display:flex; flex-wrap:wrap; gap:6px; justify-content:center;"></div>`);

        // ==== E-Hentai 搜索 ====
        menu.append(`
            <span class="search-btn"><img src="${icon}">
                <a href="/?f_search=${shortEncodedEH}" target="_blank" title="标题搜索：${shortTitle}">标题搜索 (E-Hentai)</a>
            </span>
        `);

        // E-Hentai 作者搜索
        if (useEhAuthors && validEhAuthors.length > 0) {
            let authorTitle = validEhAuthors.length > 1
                ? "艺术家标签搜索：" + validEhAuthors.map(a => a.name).join(" / ")
                : "艺术家标签搜索：" + validEhAuthors[0].name;

            menu.append(`
                <span class="search-btn author-btn-eh"><img src="${icon}">
                    <a href="javascript:void(0)" title="${authorTitle}">艺术家搜索 (E-Hentai)</a>
                </span>
            `);
        } else if (!useEhAuthors && validBackupAuthors.length > 0) {
            let authorTitle = validBackupAuthors.length > 1
                ? "艺术家搜索：" + validBackupAuthors.join(" / ")
                : "艺术家搜索：" + validBackupAuthors[0];

            menu.append(`
                <span class="search-btn author-btn-eh-backup"><img src="${icon}">
                    <a href="javascript:void(0)" title="${authorTitle}">艺术家搜索 (E-Hentai)</a>
                </span>
            `);
        }

        // ==== HDoujin 搜索 ====
        menu.append(`
            <span class="search-btn"><img src="${icon}">
                <a href="https://hdoujin.org/browse?s=${shortEncoded}" target="_blank" title="标题搜索：${shortTitle}">标题搜索 (HDoujin)</a>
            </span>
        `);

        // HDoujin 作者搜索
        if (useEhAuthors && validEhAuthors.length > 0) {
            let authorTitle = validEhAuthors.length > 1
                ? "艺术家标签搜索：" + validEhAuthors.map(a => a.name).join(" / ")
                : "艺术家标签搜索：" + validEhAuthors[0].name;

            menu.append(`
                <span class="search-btn author-btn-hdoujin"><img src="${icon}">
                    <a href="javascript:void(0)" title="${authorTitle}">艺术家搜索 (HDoujin)</a>
                </span>
            `);
        } else if (!useEhAuthors && validBackupAuthors.length > 0) {
            let authorTitle = validBackupAuthors.length > 1
                ? "艺术家搜索：" + validBackupAuthors.join(" / ")
                : "艺术家搜索：" + validBackupAuthors[0];

            menu.append(`
                <span class="search-btn author-btn-hdoujin-backup"><img src="${icon}">
                    <a href="javascript:void(0)" title="${authorTitle}">艺术家搜索 (HDoujin)</a>
                </span>
            `);
        }

        // ==== 绅士漫画 搜索 ====
        menu.append(`
            <span class="search-btn"><img src="${icon}">
                <a href="https://www.wnacg.com/search/?q=${shortEncoded}&f=_all&s=create_time_DESC&syn=yes" target="_blank" title="标题搜索：${shortTitle}">标题搜索 (绅士漫画)</a>
            </span>
        `);
        if (validBackupAuthors.length > 0) {
            let authorTitle = validBackupAuthors.length > 1
                ? "艺术家搜索：" + validBackupAuthors.join(" / ")
                : "艺术家搜索：" + validBackupAuthors[0];
            menu.append(`
                <span class="search-btn author-btn-wnacg"><img src="${icon}">
                    <a href="javascript:void(0)" title="${authorTitle}">艺术家搜索 (绅士漫画)</a>
                </span>
            `);
        }

        // ==== DLsite 搜索 ====
        menu.append(`
            <span class="search-btn"><img src="${icon}">
                <a href="https://www.dlsite.com/maniax/fsr/=/language/jp/sex_category%5B0%5D/male/keyword/${shortEncodedDLsite}/" target="_blank" title="标题搜索：${shortTitle}">标题搜索 (DLsite)</a>
            </span>
        `);

        // ==== FANZA 搜索 ====
        menu.append(`
            <span class="search-btn fanza-btn"><img src="${icon}">
                <a href="javascript:void(0)" title="标题搜索：${shortTitle} (同时搜索 FANZA同人 和 FANZAブックス)">标题搜索 (FANZA)</a>
            </span>
        `);

        // 插入菜单
        $('.gm').first().append(menu);

        // ===== 点击事件绑定 =====
        // FANZA
        $('#menu').on('click', '.fanza-btn a', function () {
            const keyword = encodeURIComponent(getShortTitle(glisting.title_jpn || glisting.title));
            window.open("https://www.dmm.co.jp/dc/doujin/-/search/=/searchstr=" + keyword + "/", "_blank");
            window.open("https://book.dmm.co.jp/search/?searchstr=" + keyword, "_blank");
        });

        // E-Hentai → 标签作者
        $('#menu').on('click', '.author-btn-eh a', function () {
            validEhAuthors.forEach(author => {
                window.open("/?f_search=" + encodeURIComponent('"artist:' + author.id + '"'), "_blank");
            });
        });

        // E-Hentai → 标题作者
        $('#menu').on('click', '.author-btn-eh-backup a', function () {
            validBackupAuthors.forEach(author => {
                window.open("/?f_search=" + encodeURIComponent('"' + author + '"'), "_blank");
            });
        });

        // 绅士漫画
        $('#menu').on('click', '.author-btn-wnacg a', function () {
            validBackupAuthors.forEach(author => {
                window.open("https://www.wnacg.com/search/?q=" + encodeURIComponent(author) + "&f=_all&s=create_time_DESC&syn=yes", "_blank");
            });
        });

        // HDoujin → 标签作者（artist:xxx，无引号）
        $('#menu').on('click', '.author-btn-hdoujin a', function () {
            validEhAuthors.forEach(author => {
                window.open("https://hdoujin.org/browse?s=" + encodeURIComponent("artist:" + author.id), "_blank");
            });
        });

        // HDoujin → 标题作者（直接名字，无引号）
        $('#menu').on('click', '.author-btn-hdoujin-backup a', function () {
            validBackupAuthors.forEach(author => {
                window.open("https://hdoujin.org/browse?s=" + encodeURIComponent(author), "_blank");
            });
        });

        // ===== 样式美化 =====
        $('.search-btn').css({
            "border": "1px dashed currentColor",
            "padding": "2px 6px",
            "border-radius": "4px",
            "display": "inline-flex",
            "align-items": "center",
            "gap": "4px",
            "cursor": "pointer",
            "transition": "all 0.2s"
        }).hover(function () {
            $(this).css("border", "1px solid currentColor");
        }, function () {
            $(this).css("border", "1px dashed currentColor");
        });

        $('#menu a').css({
            "text-decoration": "none"
        });
    }

    function generateTorrentLink(glisting, index) {
        if (window.location.hostname.indexOf("exhentai") > 0) return window.location.origin + "/torrent/" + glisting.gid + "/" + glisting.torrents[index].hash + ".torrent";
        else return "https://ehtracker.org/get/" + glisting.gid + "/" + glisting.torrents[index].hash + ".torrent";
    }

	function generateTags(glisting) {
		if (Array.isArray(glisting.tags)) {
		    for (const jsonTag of glisting.tags) {
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

	    // Tag-based info
	    if (tags.hasOwnProperty("language")) {
		    const languageTags = tags.language;
		    const translatedIndex = languageTags.indexOf("translated");
		    translated = (translatedIndex >= 0);
		    if (translatedIndex !== 0) {
			    language = toProperCase(languageTags[0]);
		    }
	    } else {
		    language = "Japanese";
		    translated = false;
	    }
	}

    function toEhDl(info) { // EH-DL
        var d = new Date(info.posted * 1000);
        var d2 = new Date();
        var output = info.title + "\r\n" + info.title_jpn + "\r\n" + document.URL + "\r\n\r\nCategory: " + info.category + "\r\nUploader: " + info.uploader + "\r\nPosted: " + d.getUTCFullYear().toString() + '-' + (d.getUTCMonth() + 1).toString().padStart(2, '0') + '-' + d.getUTCDate().toString().padStart(2, '0') + ' ' + d.getUTCHours().toString().padStart(2, '0') + ':' + d.getUTCMinutes().toString().padStart(2, '0') +
            "\r\nParent: " + (spl[3] == 'g' ? $('.gdt2 > a').text() : "None" ) + "\r\nVisible: " + (info.expunged ? 'No' : 'Yes') + "\r\nLanguage: " + language + "\r\nFile Size: " + getPrettyFileSize(info.filesize) + "\r\nLength: " + info.filecount + " pages\r\nFavorited: " + (spl[3] == 'g' ? $('#rating_count').text() : "Null" ) + "\r\nRating: " + info.rating + "\r\n\r\nTags:\r\n";
        for (const namespace in tags) {
            output += `> ${namespace}: `;
            for (var i = 0; i < tags[namespace].length; i++) {
                output += `${tags[namespace][i]}`;
                if (i < tags[namespace].length - 1) output += ", ";
            }
            output += "\r\n";
        }
        output += `\r\n\r\n\r\nDownloaded on ${d2.toUTCString()}`;
        return output;
    }

    function toEze(info) { // EZE
	    const date = new Date(toNumberOrDefault(info.posted * 1000, 0));
	    return {
			gallery_info: {
				title: toStringOrDefault(info.title, ""),
				title_original: toStringOrDefault(info.title_jpn, ""),
				uploader: toStringOrDefault(info.uploader, ""),
				filecount: toNumberOrDefault(info.filecount, 0),
				category: toStringOrDefault(info.category, ""),
				tags: tagsToCommonJson(tags),

				language: toStringOrDefault(language, ""),
				translated: !!translated,

				upload_date: [
					date.getUTCFullYear(),
					date.getUTCMonth() + 1,
					date.getUTCDate(),
					date.getUTCHours(),
					date.getUTCMinutes(),
					date.getUTCSeconds()
				],

				source: {
					site: toStringOrDefault(document.location.host.substr(0, document.location.host.length - 4), ""),
					gid: (info.identifier !== null ? toNumberOrDefault(info.gid, 0) : 0),
					token: (info.identifier !== null ? toStringOrDefault(info.token, 0) : 0),
					parent_gallery: toParentOrDefault(),
					newer_version: []
				}
            }
	    };
    }

    function toGalleryDl(info) { // Gallery-DL
	    const date = new Date(toNumberOrDefault(info.posted * 1000, 0));
	    return {
            category: toStringOrDefault(document.location.host.substr(0, document.location.host.length - 4), ""),
            cost: null,
            count: info.filecount,
		    date: toStringOrDefault(getTimestampDateString(date), ""),
            extension: null,
            filename: null,
		    gallery_id: toNumberOrDefault(info.gid, 0),
            gallery_size: toNumberOrDefault(info.filesize, 0),
            gallery_token: toStringOrDefault(info.token, 0),
            height: null,
            image_token: null,
            lang: null,
            language: toStringOrDefault(language, ""),
            num: 1,
            parent: toParentOrDefault(),
            size: toNumberOrDefault(info.filesize, 0),
		    subcategory: 'gallery',
		    tags: info.tags,
            title: toStringOrDefault(info.title, ""),
		    title_jp: toStringOrDefault(info.title_jpn, ""),
            uploader: toStringOrDefault(info.uploader, ""),
		    visible: info.expunged ? 'No' : 'Yes',
            width: null
	    };
    }

	/**
     * Convert the star count of a specified element to a double
	 * @param {Object} el - A specific element within the DOM, or a double
     * @param {Boolean} transpose - Whether we're converting background position to double, or double to background position
	 */
    function getStarNumber(el, transpose) {
		var starCount = {5: '0px -1px', 4.5: '0px -21px', 4: '-16px -1px', 3.5: '-16px -21px', 3: '-32px -1px', 2.5: '-32px -21px', 2: '-48px -1px', 1.5: '-48px -21px', 1: '-64px -1px', 0.5: '-64px -21px'};
		if (!transpose) {
			var stars = $(el).find('.ir').css('background-position');
			return Object.keys(starCount).find(key => starCount[key] === stars);
		} else return starCount[(Math.round(el * 2) / 2).toFixed(1)]; // Ratings are given in x.xx numbers, but we need either whole integers, or half integers
    }

    /** ------ Helper functions cannibalized from the dnsev's script ------ */
    function getTagAndNamespace(tag) {
	const pattern = /^(?:([^:]*):)?([\w\W]*)$/;
	const match = pattern.exec(tag);
	return (match !== null) ?
		({ tag: match[2], namespace: match[1] || defaultNamespace }) :
		({ tag: tag, namespace: defaultNamespace });
    }

    function getJsonString(value) {
	    if (typeof(value) === "string") { return value; }
	    if (typeof(value) === "undefined" || value === null) { return value; }
	    return `${value}`;
    }

    function toProperCase(text) {
	    return text.replace(/(^|\W)(\w)/g, (m0, m1, m2) => `${m1}${m2.toUpperCase()}`);
    }

    function getPrettyFileSize(bytes) {
	    const ii = fileSizeLabels.length - 1;
	    let i = 0;
	    while (i < ii && bytes >= 1024) {
		    bytes /= 1024;
		    ++i;
	    }
	    return `${bytes.toFixed(i === 0 ? 0 : 2)} ${fileSizeLabels[i]}`;
    }

    function getTimestampDateString(timestamp) {
	    const date = new Date(timestamp);
	    const year = date.getUTCFullYear().toString();
	    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
	    const day = date.getUTCDate().toString().padStart(2, "0");
	    const hour = date.getUTCHours().toString().padStart(2, "0");
	    const minute = date.getUTCMinutes().toString().padStart(2, "0");
        const seconds = date.getUTCSeconds().toString().padStart(2, "0");
	    return `${year}-${month}-${day} ${hour}:${minute}:${seconds}`;
    }

    function toStringOrDefault(value, defaultValue) {
	    return typeof(value) === "string" ? value : defaultValue;
    }

    function toNumberOrDefault(value, defaultValue) {
	    return Number.isNaN(value) ? defaultValue : value;
    }

	function toParentOrDefault() {
		if (dead) return null;
		if ($('.gdt2 > a').length) return {gid: $('.gdt2 > a').attr('href').split('/')[4], token: $('.gdt2 > a').attr('href').split('/')[5]};
    else return null
	}

    function tagsToCommonJson(tags) {
	    const result = {};
		    for (const namespace in tags) {
			    if (!Object.prototype.hasOwnProperty.call(tags, namespace)) { continue; }
			    const tagList = tags[namespace];
			    result[namespace] = [...tagList];
		    }
	    return result;
    }

    function getShortTitle(title) {
        const prefixTags = /^\s*(\(([^\)]*?)\)|\[([^\]]*?)\]|\{([^\}]*?)\})\s*/i;
        const suffixTags = /\s*(\(([^\)]*?)(?:\)|$)|\[([^\]]*?)(?:\]|$)|\{([^\}]*?)(?:\}|$))\s*$/i;

        let m;
        while ((m = prefixTags.exec(title))) {
            title = title.substr(m.index + m[0].length);
        }
        while ((m = suffixTags.exec(title))) {
            title = title.substr(0, m.index);
        }

        // 🚩 新增：处理罗马音分隔符 | 或 ｜，只取前半段
        title = title.split(/[\|｜]/)[0].trim();

        return title;
    }

    function getGalleryUrl(id) {
	    const loc = window.location;
	    return `${loc。protocol}//${loc。host}/g/${id。gid}/${id。token}/`;
    }
	/** ------------ */

    $(`<style data-jqstyle="exressurect">
    #menu {
        font-size: 10pt;
        padding: 0.5em 0 0 0;
        margin: 3px 5px 5px 0px;
        position: relative;
        display: inline-block;
        width: 100%;
        border-top: 1px solid #000;
    }
    .menuControl {
        border: none;
        background: rgba(0,0,0,0);
        cursor: pointer;
        color: #DDD;
    }
    .menuControl:hover {
        color: #EEE;
    }
    .menuContent {
        display: none;
        flex-direction: column;
        position: absolute;
        font-size: 10pt;
        border: 1px solid #000;
        text-align: left;
        overflow: auto;
        z-index: 999;
        background: rgb(79, 83, 91);
    }
    .menuContent a {
        padding: .25em 1em;
        line-height: 1.375em;
        text-decoration: none;
    }
    .menuContent a:hover {
        background: rgba(0,0,0,0.4);
    }
    </style>`).appendTo('head');
})();
