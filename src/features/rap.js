(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var OVERLAY_ID = 'nx-rap-overlay';
    var MODAL_ID = 'nx-rap-modal';
    var MSG_OPEN = 'nx-rap-open-modal';
    var THUMB_BATCH = 'https://octane.wtf/apisite/thumbnails/v1/assets?assetIds=';
    var DETAILS_URL = 'https://octomons.wtf/api/items/v3/itemdetails';
    var STYLE_ID = 'nx-rap-style';

    var isTop = window.top === window.self;

    var items = [];
    var thumbs = {};
    var detailsCache = null;
    var whoami = 'user';
    var rowScanner = null;

    var ASSET_TYPES = {
        1: 'Image', 2: 'T-Shirt', 3: 'Audio', 4: 'Mesh', 5: 'Lua',
        8: 'Hat', 9: 'Place', 10: 'Model', 11: 'Shirt', 12: 'Pants',
        13: 'Decal', 17: 'Head', 18: 'Face', 19: 'Gear', 21: 'Badge',
        24: 'Animation', 27: 'Torso', 28: 'Right Arm', 29: 'Left Arm',
        30: 'Right Leg', 31: 'Left Leg', 32: 'Package',
        37: 'Pose Animation', 38: 'Climb Animation', 40: 'Fall Animation',
        41: 'Idle Animation', 42: 'Run Animation', 43: 'Swim Animation',
        44: 'Walk Animation', 45: 'Emote Animation', 46: 'Mesh Part',
        47: 'Solid Model', 48: 'Shatterbox', 56: 'Emote Animation',
        61: 'Plugin', 62: 'Font Family'
    };

    function shortNum(n) {
        n = Number(n) || 0;
        if (n < 1000) return String(n);
        if (n < 1000000) {
            var k = n / 1000;
            return (k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')) + 'K';
        }
        var m = n / 1000000;
        return (m >= 100 ? Math.round(m) : m.toFixed(2).replace(/\.?0+$/, '')) + 'M';
    }

    function pickNum(v) {
        if (v === null || v === undefined) return null;
        var n = Number(v);
        if (!isFinite(n) || n <= 0) return null;
        return n;
    }

    function displayNum(v) {
        return v === null ? '--' : shortNum(v);
    }

    function darkMode() {
        try {
            if (localStorage.getItem('rbx_theme_v1') === 'dark') return true;
        } catch (e) {}
        return document.documentElement.classList.contains('octane-dark');
    }

    function currentUserId() {
        var m = location.pathname.match(/\/users\/(\d+)\/profile/);
        if (m) return m[1];
        m = location.pathname.match(/\/theme2020\/users\/(\d+)\/profile/);
        if (m) return m[1];
        var q = new URLSearchParams(location.search);
        return q.get('userId') || q.get('viewerId');
    }

    function currentUsername() {
        var q = new URLSearchParams(location.search);
        return q.get('username') || q.get('viewerName') || '';
    }

    function loadDetails() {
        if (detailsCache) return Promise.resolve(detailsCache);
        return new Promise(function (resolve) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: DETAILS_URL,
                onload: function (r) {
                    try {
                        var d = JSON.parse(r.responseText);
                        detailsCache = (d && d.success && d.assets) ? d.assets : {};
                    } catch (e) {
                        detailsCache = {};
                    }
                    resolve(detailsCache);
                },
                onerror: function () {
                    detailsCache = {};
                    resolve({});
                }
            });
        });
    }

    function loadLimiteds(userId) {
        return Promise.all([
            fetch('/apisite/inventory/v1/users/' + userId + '/assets/collectibles',
                  { credentials: 'include' })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (d) { return (d && d.data) ? d.data : []; })
                .catch(function () { return []; }),
            loadDetails()
        ]).then(function (results) {
            var list = results[0];
            var details = results[1];
            var out = [];
            var rap = 0;
            var value = 0;

            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                var id = String(item.assetId || item.id || '');
                var d = details[id] || null;

                var name = d ? d[0] : (item.name || '');
                var rawRap = d ? pickNum(d[2]) : pickNum(item.recentAveragePrice);
                var rawValue = d ? pickNum(d[4]) : pickNum(item.originalPrice);

                var itemRap = rawRap === null ? 0 : rawRap;
                var itemValue = rawValue === null ? itemRap : rawValue;

                out.push({
                    assetId: id,
                    id: id,
                    name: name,
                    recentAveragePrice: itemRap,
                    originalPrice: itemValue,
                    rapDisplay: displayNum(rawRap),
                    valueDisplay: displayNum(rawValue),
                    serialNumber: item.serialNumber,
                    assetTypeId: item.assetTypeId || item.assetType,
                    thumbnail: item.thumbnail
                });

                rap += itemRap;
                value += itemValue;
            }
            return { list: out, rap: rap, value: value };
        });
    }

    function loadThumbs(ids) {
        if (!ids.length) return Promise.resolve({});
        var url = THUMB_BATCH + ids.join(',') + '&size=420x420&format=Png';
        return fetch(url, { credentials: 'include' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                var out = {};
                var list = (d && d.data) ? d.data : [];
                for (var i = 0; i < list.length; i++) {
                    var e = list[i];
                    var id = e.targetId || e.assetId || e.id;
                    var img = e.imageUrl || e.url || '';
                    if (id && img) out[String(id)] = img;
                }
                return out;
            })
            .catch(function () { return {}; });
    }

    function imageFor(item) {
        var id = String(item.assetId || item.id || '');
        if (thumbs[id]) return thumbs[id];
        if (item.thumbnail) {
            if (item.thumbnail.url) return item.thumbnail.url;
            if (item.thumbnail.imageUrl) return item.thumbnail.imageUrl;
        }
        return 'https://tcdn.octane.wtf/' + id + '.png';
    }

    function assetTypeName(item) {
        var v = item.assetTypeId || item.assetType;
        if (v == null) return '';
        if (typeof v === 'string' && !/^\d+$/.test(v)) return v;
        var id = parseInt(v, 10);
        return ASSET_TYPES[id] || ('Type ' + id);
    }

    function serialNum(item) {
        var v = item.serialNumber;
        if (typeof v === 'number' && v > 0) return v;
        if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10);
        return null;
    }

    function arrange() {
        return items.slice().sort(function (a, b) {
            return (Number(b.recentAveragePrice) || 0) - (Number(a.recentAveragePrice) || 0);
        });
    }

    function asRow(item) {
        var id = item.assetId || item.id || '';
        var slug = (item.name || '').trim().replace(/\s+/g, '-');
        var sn = serialNum(item);
        return {
            name: item.name || '',
            assetId: id,
            assetType: assetTypeName(item),
            serial: sn,
            serialText: sn === null ? 'N/A' : '#' + sn,
            rap: item.rapDisplay,
            value: item.valueDisplay,
            link: 'https://octane.wtf/catalog/' + id + (slug ? '/' + slug : '')
        };
    }

    function csvSafe(v) {
        v = String(v == null ? '' : v);
        if (v.indexOf(',') !== -1 || v.indexOf('"') !== -1 || v.indexOf('\n') !== -1) {
            return '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
    }

    function saveFile(name, content, mime) {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function saveCsv() {
        if (!items.length) return;
        var rows = [['Name', 'Asset ID', 'Type', 'Serial', 'RAP', 'Value', 'Link']];
        arrange().forEach(function (item) {
            var r = asRow(item);
            rows.push([r.name, r.assetId, r.assetType, r.serialText, r.rap, r.value, r.link]);
        });
        var text = rows.map(function (row) {
            return row.map(csvSafe).join(',');
        }).join('\r\n');
        saveFile(whoami + '-limiteds.csv', text, 'text/csv;charset=utf-8;');
    }

    function saveJson() {
        if (!items.length) return;
        var list = arrange().map(asRow);
        var payload = {
            username: whoami,
            exportedAt: new Date().toISOString(),
            totalItems: list.length,
            totalRap: list.reduce(function (s, r) { return s + (Number(r.rap) || 0); }, 0),
            totalValue: list.reduce(function (s, r) { return s + (Number(r.value) || 0); }, 0),
            items: list
        };
        saveFile(whoami + '-limiteds.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8;');
    }

    function saveTxt() {
        if (!items.length) return;
        var list = arrange();
        var totalRap = list.reduce(function (s, i) { return s + (Number(i.recentAveragePrice) || 0); }, 0);
        var totalValue = list.reduce(function (s, i) { return s + (Number(i.originalPrice) || 0); }, 0);

        var lines = [];
        lines.push(whoami + "'s Limiteds");
        lines.push('Exported: ' + new Date().toLocaleString());
        lines.push('Items: ' + list.length);
        lines.push('Total RAP: ' + totalRap);
        lines.push('Total Value: ' + totalValue);
        lines.push('');
        lines.push('----------------------------------------');

        list.forEach(function (item) {
            var r = asRow(item);
            lines.push(r.name);
            lines.push('  Type: ' + r.assetType +
                       '  |  Serial: ' + r.serialText +
                       '  |  RAP: ' + r.rap +
                       '  |  Value: ' + r.value);
            lines.push('  ' + r.link);
            lines.push('');
        });

        saveFile(whoami + '-limiteds.txt', lines.join('\n'), 'text/plain;charset=utf-8;');
    }

    function applyStyle() {
        var old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        var dark = darkMode();

        var panelBg = dark ? '#121212' : '#ffffff';
        var panelText = dark ? '#bdbebe' : '#3d3d3d';
        var heading = dark ? '#ffffff' : '#202124';
        var panelEdge = dark ? '#262626' : '#e4e4e4';
        var headEdge = dark ? '#1c1c1c' : '#efefef';
        var faded = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
        var thumbBg = dark ? '#1c1c1c' : '#f4f4f4';
        var skeleton1 = dark ? '#1e1e1e' : '#eeeeee';
        var skeleton2 = dark ? '#2c2c2c' : '#f8f8f8';
        var pillBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        var pillText = dark ? '#bdbebe' : '#606162';
        var serialBg = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
        var serialText = dark ? '#e0e0e0' : '#3d3d3d';
        var btnBg = dark ? '#1c1c1c' : '#f2f2f2';
        var btnEdge = dark ? '#2c2c2c' : '#e4e4e4';
        var btnText = dark ? '#d0d0d0' : '#3d3d3d';
        var btnHover = dark ? '#262626' : '#e8e8e8';
        var menuBg = dark ? '#181818' : '#ffffff';
        var menuEdge = dark ? '#2c2c2c' : '#e4e4e4';
        var menuHover = dark ? '#222222' : '#f2f2f2';
        var scrollTrack = dark ? '#141414' : '#f0f0f0';
        var scrollThumb = dark ? '#2e2e2e' : '#c8c8c8';
        var scrollThumbHover = dark ? '#3a3a3a' : '#b0b0b0';
        var spinner = dark ? '#e0e0e0' : '#3d3d3d';
        var spinnerTrack = dark ? '#262626' : '#e4e4e4';

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '#' + OVERLAY_ID + '{',
            'position:fixed;inset:0;z-index:2147483645;',
            'background:rgba(0,0,0,0);',
            'display:flex;align-items:center;justify-content:center;',
            'opacity:0;transition:opacity 0.15s ease;pointer-events:none;',
            '}',
            '#' + OVERLAY_ID + '.nx-open{opacity:1;pointer-events:auto;background:rgba(0,0,0,0.4);}',

            '#' + MODAL_ID + '{',
            'background:' + panelBg + ';color:' + panelText + ';',
            'border:1px solid ' + panelEdge + ';border-radius:10px;',
            'width:min(92vw,1000px);height:min(85vh,720px);',
            'display:flex;flex-direction:column;overflow:hidden;',
            'box-shadow:0 12px 40px rgba(0,0,0,0.55);',
            'font-family:"HCo Gotham SSm","Helvetica Neue",Helvetica,Arial,sans-serif;',
            'transform:scale(0.98);transition:transform 0.15s ease;',
            '}',
            '#' + OVERLAY_ID + '.nx-open #' + MODAL_ID + '{transform:scale(1);}',

            '#' + MODAL_ID + ' .nx-rap-head{',
            'display:flex;align-items:flex-start;justify-content:space-between;',
            'padding:14px 18px;border-bottom:1px solid ' + headEdge + ';',
            'flex:none;gap:10px;background:' + (dark ? '#141414' : '#fafafa') + ';',
            '}',

            '#' + MODAL_ID + ' .nx-rap-head-left{',
            'flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-title{',
            'font-weight:700;font-size:15px;color:' + heading + ';',
            'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-subtitle{',
            'font-size:12px;font-weight:500;color:' + faded + ';',
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-head-right{',
            'display:flex;align-items:center;gap:10px;flex:none;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-export{position:relative;}',

            '#' + MODAL_ID + ' .nx-rap-export-btn{',
            'background:' + btnBg + ';color:' + btnText + ';',
            'border:1px solid ' + btnEdge + ';border-radius:6px;',
            'padding:5px 10px;font-size:12px;font-weight:500;',
            'font-family:inherit;cursor:pointer;outline:none;',
            'transition:background 0.12s ease;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-export-btn:hover{background:' + btnHover + ';}',

            '#' + MODAL_ID + ' .nx-rap-export-menu{',
            'position:absolute;top:calc(100% + 4px);right:0;',
            'min-width:120px;background:' + menuBg + ';',
            'border:1px solid ' + menuEdge + ';border-radius:6px;',
            'box-shadow:0 8px 24px rgba(0,0,0,0.55);',
            'padding:4px;display:none;z-index:10;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-export-menu.open{display:block;}',

            '#' + MODAL_ID + ' .nx-rap-export-item{',
            'display:block;width:100%;text-align:left;',
            'background:none;border:0;color:' + panelText + ';',
            'padding:7px 10px;font-size:12px;font-weight:500;',
            'font-family:inherit;cursor:pointer;border-radius:4px;',
            'transition:background 0.12s ease;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-export-item:hover{background:' + menuHover + ';}',

            '#' + MODAL_ID + ' .nx-rap-close{',
            'background:none;border:0;color:' + faded + ';',
            'cursor:pointer;font-size:22px;line-height:1;padding:0 6px;',
            'font-weight:400;transition:color 0.12s ease;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-close:hover{color:#e5484d;}',

            '#' + MODAL_ID + ' .nx-rap-body{',
            'padding:16px 18px 20px;overflow-y:auto;flex:1;',
            'scrollbar-width:thin;',
            'scrollbar-color:' + scrollThumb + ' ' + scrollTrack + ';',
            '}',
            '#' + MODAL_ID + ' .nx-rap-body::-webkit-scrollbar{width:10px;height:10px;}',
            '#' + MODAL_ID + ' .nx-rap-body::-webkit-scrollbar-track{background:' + scrollTrack + ';border-radius:5px;}',
            '#' + MODAL_ID + ' .nx-rap-body::-webkit-scrollbar-thumb{background:' + scrollThumb + ';border-radius:5px;border:2px solid ' + scrollTrack + ';}',
            '#' + MODAL_ID + ' .nx-rap-body::-webkit-scrollbar-thumb:hover{background:' + scrollThumbHover + ';}',

            '#' + MODAL_ID + ' ul.hlist.item-cards{',
            'display:grid;grid-template-columns:repeat(auto-fill,minmax(115px,1fr));',
            'gap:8px;padding:0;margin:0;list-style:none;',
            '}',

            '#' + MODAL_ID + ' li.list-item.item-card{list-style:none;margin:0;padding:0;}',

            '#' + MODAL_ID + ' .item-card-container{',
            'background:transparent;border-radius:6px;padding:6px;',
            'text-align:center;',
            '}',

            '#' + MODAL_ID + ' .item-card-link{color:inherit;text-decoration:none;display:block;position:relative;z-index:1;}',
            '#' + MODAL_ID + ' .item-card-link:hover{text-decoration:none;color:inherit;}',

            '#' + MODAL_ID + ' .item-card-thumb-container{',
            'display:flex;width:100%;aspect-ratio:1/1;',
            'background:' + thumbBg + ';border-radius:6px;',
            'overflow:hidden;margin-bottom:8px;',
            'align-items:center;justify-content:center;',
            'position:relative;',
            'pointer-events:none;',
            '}',

            '#' + MODAL_ID + ' .item-card-thumb-container img{',
            'width:100%;height:100%;object-fit:contain;',
            'pointer-events:none;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-serial{',
            'position:absolute;top:5px;left:5px;',
            'font-size:10px;font-weight:700;line-height:1;',
            'padding:3px 7px;border-radius:10px;',
            'background:' + serialBg + ';color:' + serialText + ';',
            '}',

            '#' + MODAL_ID + ' .item-card-name{',
            'font-size:12px;font-weight:500;line-height:1.3;',
            'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
            'color:' + (dark ? '#d0d0d0' : '#3d3d3d') + ';',
            'text-align:center;margin-bottom:4px;padding:0 2px;',
            'pointer-events:none;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-type{',
            'display:inline-block;background:' + pillBg + ';color:' + pillText + ';',
            'font-size:10px;font-weight:600;line-height:1;',
            'padding:2px 6px;border-radius:8px;margin-bottom:5px;',
            'pointer-events:none;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-card-stats{',
            'display:flex;align-items:center;justify-content:center;',
            'gap:5px;font-size:11px;font-weight:700;',
            'white-space:nowrap;',
            'pointer-events:none;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-card-stats .nx-rap-green{color:#00b06f;}',
            '#' + MODAL_ID + ' .nx-rap-card-stats .nx-rap-blue{color:#0a84ff;}',
            '#' + MODAL_ID + ' .nx-rap-card-stats .nx-rap-dot{',
            'color:' + faded + ';font-weight:400;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-empty{',
            'padding:40px 0;text-align:center;color:' + faded + ';font-size:14px;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-spinner{',
            'width:34px;height:34px;margin:0 auto;',
            'border:3px solid ' + spinnerTrack + ';',
            'border-top-color:' + spinner + ';',
            'border-radius:50%;',
            'animation:nx-rap-spin 0.8s linear infinite;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-loading{',
            'padding:60px 0;text-align:center;',
            '}',

            '@keyframes nx-rap-spin{to{transform:rotate(360deg);}}',
            '@keyframes nx-rap-shimmer{',
            '0%{background-position:-200% 0;}',
            '100%{background-position:200% 0;}',
            '}',

            '#' + MODAL_ID + ' .nx-rap-skel-card{',
            'border-radius:6px;padding:6px;text-align:center;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-skel-thumb{',
            'width:100%;aspect-ratio:1/1;border-radius:6px;',
            'background:linear-gradient(90deg,',
            skeleton1 + ' 0%,',
            skeleton2 + ' 50%,',
            skeleton1 + ' 100%);',
            'background-size:200% 100%;',
            'animation:nx-rap-shimmer 1.4s infinite;',
            'margin-bottom:8px;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-skel-line{',
            'height:11px;border-radius:5px;margin:0 auto 5px;',
            'background:linear-gradient(90deg,',
            skeleton1 + ' 0%,',
            skeleton2 + ' 50%,',
            skeleton1 + ' 100%);',
            'background-size:200% 100%;',
            'animation:nx-rap-shimmer 1.4s infinite;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-skel-line.l1{width:80%;}',
            '#' + MODAL_ID + ' .nx-rap-skel-line.l2{width:55%;}'
        ].join('');
        document.head.appendChild(style);
    }

    function shutExportMenu() {
        var menu = document.querySelector('#' + MODAL_ID + ' .nx-rap-export-menu');
        if (menu) menu.classList.remove('open');
    }

    function buildModal() {
        var existing = document.getElementById(OVERLAY_ID);
        if (existing) return existing;
        applyStyle();

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        var modal = document.createElement('div');
        modal.id = MODAL_ID;

        var head = document.createElement('div');
        head.className = 'nx-rap-head';

        var left = document.createElement('div');
        left.className = 'nx-rap-head-left';

        var title = document.createElement('span');
        title.className = 'nx-rap-title';
        title.textContent = 'Limiteds';

        var subtitle = document.createElement('span');
        subtitle.className = 'nx-rap-subtitle';
        subtitle.textContent = '-- RAP \u2022 -- Value';

        left.appendChild(title);
        left.appendChild(subtitle);

        var right = document.createElement('div');
        right.className = 'nx-rap-head-right';

        var exportWrap = document.createElement('div');
        exportWrap.className = 'nx-rap-export';

        var exportBtn = document.createElement('button');
        exportBtn.className = 'nx-rap-export-btn';
        exportBtn.textContent = 'Export \u25be';

        var exportMenu = document.createElement('div');
        exportMenu.className = 'nx-rap-export-menu';

        [
            ['CSV', saveCsv],
            ['JSON', saveJson],
            ['TXT', saveTxt]
        ].forEach(function (opt) {
            var item = document.createElement('button');
            item.className = 'nx-rap-export-item';
            item.textContent = opt[0];
            item.onclick = function (e) {
                e.stopPropagation();
                shutExportMenu();
                opt[1]();
            };
            exportMenu.appendChild(item);
        });

        exportBtn.onclick = function (e) {
            e.stopPropagation();
            exportMenu.classList.toggle('open');
        };

        exportWrap.appendChild(exportBtn);
        exportWrap.appendChild(exportMenu);

        var close = document.createElement('button');
        close.className = 'nx-rap-close';
        close.textContent = '\u00d7';
        close.onclick = closeModal;

        right.appendChild(exportWrap);
        right.appendChild(close);

        head.appendChild(left);
        head.appendChild(right);

        var body = document.createElement('div');
        body.className = 'nx-rap-body';

        modal.appendChild(head);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        document.addEventListener('click', shutExportMenu);

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' || !overlay.classList.contains('nx-open')) return;
            if (document.querySelector('#' + MODAL_ID + ' .nx-rap-export-menu.open')) {
                shutExportMenu();
            } else {
                closeModal();
            }
        });

        return overlay;
    }

    function paintSkeleton(n) {
        var overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;
        var body = overlay.querySelector('.nx-rap-body');

        var ul = document.createElement('ul');
        ul.className = 'hlist item-cards';

        for (var i = 0; i < n; i++) {
            var li = document.createElement('li');
            li.className = 'list-item item-card';

            var card = document.createElement('div');
            card.className = 'nx-rap-skel-card';

            var thumb = document.createElement('div');
            thumb.className = 'nx-rap-skel-thumb';

            var line1 = document.createElement('div');
            line1.className = 'nx-rap-skel-line l1';

            var line2 = document.createElement('div');
            line2.className = 'nx-rap-skel-line l2';

            card.appendChild(thumb);
            card.appendChild(line1);
            card.appendChild(line2);
            li.appendChild(card);
            ul.appendChild(li);
        }

        body.innerHTML = '';
        body.appendChild(ul);
    }

    function paintSpinner() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;
        var body = overlay.querySelector('.nx-rap-body');
        body.innerHTML = '<div class="nx-rap-loading"><div class="nx-rap-spinner"></div></div>';
    }

    function makeCard(item) {
        var li = document.createElement('li');
        li.className = 'list-item item-card';

        var box = document.createElement('div');
        box.className = 'item-card-container';

        var id = item.assetId || item.id || '';
        var slug = (item.name || '').trim().replace(/\s+/g, '-');
        var href = '/catalog/' + id + (slug ? '/' + slug : '');

        var link = document.createElement('a');
        link.className = 'item-card-link';
        link.href = href;
        link.addEventListener('click', function (e) {
            e.preventDefault();
            closeModal();
            location.href = href;
        });

        var thumb = document.createElement('span');
        thumb.className = 'item-card-thumb-container';

        var sn = serialNum(item);
        var serialEl = document.createElement('span');
        serialEl.className = 'nx-rap-serial';
        serialEl.textContent = sn === null ? 'N/A' : '#' + sn;
        serialEl.title = 'Serial Number';
        thumb.appendChild(serialEl);

        var img = document.createElement('img');
        img.src = imageFor(item);
        img.alt = item.name || '';
        img.loading = 'lazy';
        img.onerror = function () { this.src = '/img/pending.png'; };
        thumb.appendChild(img);

        var name = document.createElement('div');
        name.className = 'item-card-name';
        name.title = item.name || '';
        name.textContent = item.name || '(unnamed)';

        link.appendChild(thumb);
        link.appendChild(name);
        box.appendChild(link);

        var type = assetTypeName(item);
        if (type) {
            var typeEl = document.createElement('div');
            typeEl.className = 'nx-rap-type';
            typeEl.textContent = type;
            box.appendChild(typeEl);
        }

        var stats = document.createElement('div');
        stats.className = 'nx-rap-card-stats';

        var rapEl = document.createElement('span');
        rapEl.className = 'nx-rap-green';
        rapEl.textContent = item.rapDisplay + ' RAP';

        var dot = document.createElement('span');
        dot.className = 'nx-rap-dot';
        dot.textContent = '\u2022';

        var valEl = document.createElement('span');
        valEl.className = 'nx-rap-blue';
        valEl.textContent = item.valueDisplay + ' Value';

        stats.appendChild(rapEl);
        stats.appendChild(dot);
        stats.appendChild(valEl);
        box.appendChild(stats);

        li.appendChild(box);
        return li;
    }

    function paintGrid() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;
        var body = overlay.querySelector('.nx-rap-body');
        var subtitle = overlay.querySelector('.nx-rap-subtitle');

        if (!items.length) {
            body.innerHTML = '<div class="nx-rap-empty">No limiteds found.</div>';
            if (subtitle) subtitle.textContent = '-- RAP \u2022 -- Value';
            return;
        }

        var list = arrange();

        var totalRap = 0;
        var totalValue = 0;
        var rapUnknown = false;
        var valueUnknown = false;

        for (var k = 0; k < list.length; k++) {
            totalRap += Number(list[k].recentAveragePrice) || 0;
            totalValue += Number(list[k].originalPrice) || 0;
            if (list[k].rapDisplay === '--') rapUnknown = true;
            if (list[k].valueDisplay === '--') valueUnknown = true;
        }

        if (subtitle) {
            subtitle.textContent =
                (rapUnknown ? '--' : shortNum(totalRap)) + ' RAP \u2022 ' +
                (valueUnknown ? '--' : shortNum(totalValue)) + ' Value';
        }

        body.innerHTML = '';

        var ul = document.createElement('ul');
        ul.className = 'hlist item-cards';
        list.forEach(function (item) {
            ul.appendChild(makeCard(item));
        });
        body.appendChild(ul);
    }

    function openModal(userId, username) {
        var overlay = buildModal();
        var title = overlay.querySelector('.nx-rap-title');
        var subtitle = overlay.querySelector('.nx-rap-subtitle');

        applyStyle();

        whoami = username || 'user';
        title.textContent = whoami + "'s Limiteds (0)";
        if (subtitle) subtitle.textContent = '-- RAP \u2022 -- Value';
        overlay.classList.add('nx-open');

        items = [];
        thumbs = {};

        paintSpinner();

        loadLimiteds(userId).then(function (data) {
            items = data.list;

            if (!data.list.length) {
                title.textContent = whoami + "'s Limiteds (0)";
                overlay.querySelector('.nx-rap-body').innerHTML =
                    '<div class="nx-rap-empty">No limiteds found.</div>';
                if (subtitle) subtitle.textContent = '-- RAP \u2022 -- Value';
                return;
            }

            title.textContent = whoami + "'s Limiteds (" + data.list.length + ')';

            var ids = data.list.map(function (it) {
                return it.assetId || it.id;
            }).filter(Boolean);

            loadThumbs(ids).then(function (map) {
                thumbs = map;
                paintGrid();
            });
        });
    }

    function closeModal() {
        shutExportMenu();
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay) overlay.classList.remove('nx-open');
    }

    function injectRow() {
        var userId = currentUserId();
        if (!userId) return true;

        var list = document.querySelector('.details-info');
        if (!list) return false;
        if (list.querySelector('.nx-rap-row')) return true;

        var rows = list.querySelectorAll('li');
        var anchor = null;
        for (var i = 0; i < rows.length; i++) {
            var lbl = rows[i].querySelector('.text-label');
            if (lbl && (lbl.textContent || '').trim() === 'Following') {
                anchor = rows[i];
                break;
            }
        }
        if (!anchor) return false;

        var li = anchor.cloneNode(true);
        li.classList.add('nx-rap-row');

        var label = li.querySelector('.text-label');
        if (label) {
            label.textContent = 'RAP';
            label.removeAttribute('ng-bind');
            label.removeAttribute('data-ng-bind');
            label.classList.remove('ng-binding');
        }

        var name = currentUsername() || 'user';
        var tip = 'Click to view ' + name + "'s limiteds";

        var span = li.querySelector('.font-header-2');
        if (span) {
            span.textContent = '\u2026';
            span.removeAttribute('ng-bind');
            span.removeAttribute('data-ng-bind');
            span.classList.remove('ng-binding');

            span.style.cursor = 'pointer';
            span.title = tip;
            span.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.top.postMessage({ type: MSG_OPEN, userId: userId, username: name }, '*');
            });
        }

        var link = li.querySelector('a.text-name');
        if (link) {
            link.removeAttribute('href');
            link.removeAttribute('ng-href');
            link.style.cursor = 'pointer';
            link.title = tip;
            link.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.top.postMessage({ type: MSG_OPEN, userId: userId, username: name }, '*');
            });
        }

        list.appendChild(li);

        loadLimiteds(userId).then(function (data) {
            if (!span) return;
            span.textContent = shortNum(data.rap);
            span.setAttribute('title', tip);
        });

        return true;
    }

    function startRowScanner() {
        stopRowScanner();
        var tries = 0;
        rowScanner = setInterval(function () {
            if (injectRow() || ++tries > 120) stopRowScanner();
        }, 250);
        injectRow();
    }

    function stopRowScanner() {
        if (rowScanner) {
            clearInterval(rowScanner);
            rowScanner = null;
        }
    }

    function onMessage(e) {
        if (!e.data || e.data.type !== MSG_OPEN) return;
        if (!e.data.userId) return;
        openModal(e.data.userId, e.data.username);
    }

    function onThemeChange() {
        applyStyle();
    }

    function onStorage(e) {
        if (e.key === 'rbx_theme_v1') applyStyle();
    }

    var styleWatchBound = false;

    window.NX.features.rap = {
        apply: function () {
            if (isTop) {
                window.addEventListener('message', onMessage);

                if (!styleWatchBound) {
                    styleWatchBound = true;
                    window.addEventListener('octane-theme-change', onThemeChange);
                    window.addEventListener('storage', onStorage);
                }
            } else {
                startRowScanner();
            }
        },
        teardown: function () {
            stopRowScanner();

            if (isTop) {
                window.removeEventListener('message', onMessage);
                if (styleWatchBound) {
                    window.removeEventListener('octane-theme-change', onThemeChange);
                    window.removeEventListener('storage', onStorage);
                    styleWatchBound = false;
                }
                closeModal();
                var overlay = document.getElementById(OVERLAY_ID);
                if (overlay) overlay.remove();
                var style = document.getElementById(STYLE_ID);
                if (style) style.remove();
            } else {
                var row = document.querySelector('.nx-rap-row');
                if (row) row.remove();
            }
        }
    };
})();

// boom
