(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.ui = window.NX.ui || {};

    var VERSION = (function () {
        try {
            if (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) {
                return 'v' + GM_info.script.version;
            }
        } catch (e) {}
        return 'v1.0';
    })();

    var PANEL_ID = 'nx-panel';
    var STYLE_ID = 'nx-panel-style';
    var HIDE_STYLE_ID = 'nx-hide-style';

    var CATS = [
        { id: 'visual',   label: 'Visual' },
        { id: 'features', label: 'Features' }
    ];

    var OPTS = {
        snow:            { cat: 'features', label: 'Snowfall',                 desc: 'Makes snow fall across the site.' },
        background:      { cat: 'visual',   label: 'Custom Avatar Background', desc: 'Set custom backgrounds behind your avatar.' },
        hideAlert:       { cat: 'visual',   label: 'Hide Alert',               desc: 'Hides the alert banner.' },
        hideChat:        { cat: 'visual',   label: 'Hide Chat',                desc: 'Hides chat across the site.' },
        customLogo:      { cat: 'visual',   label: 'Custom Logo',              desc: 'Replace the navbar logo.' },
        customFont:      { cat: 'visual',   label: 'Custom Font',              desc: 'Apply a custom font.', type: 'select' },
        tradeValues:     { cat: 'features', label: 'Trade Compare',            desc: 'Compare your trade with RAP.' },
        itemOwners:      { cat: 'features', label: 'Item Owners',              desc: 'Show every owner on item pages.' },
        inventorySearch: { cat: 'features', label: 'Inventory Search',         desc: 'Adds a search bar to your inventory.' },
        quickSearch:     { cat: 'features', label: 'Quick Search',             desc: 'Search users and games.' },
        bulkUnfriend:    { cat: 'features', label: 'Bulk Unfriend',            desc: 'Select multiple friends to remove.' },
        rap:             { cat: 'features', label: 'RAP on Profile',           desc: 'Shows total RAP next to profile stats.' },
        removeAds:       { cat: 'features', label: 'Remove Ads',               desc: 'Hides all advertisement banners.' }
    };

    var DEFAULT_FONTS = [
        { id: 'default', label: 'Default' },
        { id: 'inter', label: 'Inter' },
        { id: 'roboto', label: 'Roboto' },
        { id: 'opensans', label: 'Open Sans' },
        { id: 'lato', label: 'Lato' },
        { id: 'montserrat', label: 'Montserrat' },
        { id: 'poppins', label: 'Poppins' },
        { id: 'source-sans', label: 'Source Sans Pro' },
        { id: 'nunito', label: 'Nunito' },
        { id: 'ubuntu', label: 'Ubuntu' },
        { id: 'comic-neue', label: 'Comic Neue' },
        { id: 'jetbrains-mono', label: 'JetBrains Mono' },
        { id: 'fira-code', label: 'Fira Code' },
        { id: 'courier-prime', label: 'Courier Prime' },
        { id: 'gotham', label: 'Gotham' }
    ];

    function readLS(k) { try { return localStorage.getItem('nx_' + k); } catch (e) { return null; } }
    function writeLS(k, v) { try { localStorage.setItem('nx_' + k, v); } catch (e) {} }

    function panelSettings() {
        var fallback = {
            get: function (k) { return readLS(k) === '1'; },
            set: function (k, v) { writeLS(k, v ? '1' : '0'); },
            getString: function (k, d) { var v = readLS(k); return v == null ? d : v; },
            setString: function (k, v) { writeLS(k, v); }
        };
        var s = window.NX.settings;
        if (!s) return fallback;
        return {
            get: function (k) { var v = s.get(k); return v === undefined || v === null ? fallback.get(k) : v; },
            set: function (k, v) { if (typeof s.set === 'function') s.set(k, v); fallback.set(k, v); },
            getString: function (k, d) { if (typeof s.getString === 'function') return s.getString(k, d); return fallback.getString(k, d); },
            setString: function (k, v) { if (typeof s.setString === 'function') s.setString(k, v); fallback.setString(k, v); }
        };
    }

    function injectStyles(root) {
        var target = root || document;
        
        // 1. Inject panel styles
        var hasPanelStyle = target.getElementById ? target.getElementById(STYLE_ID) : target.querySelector('#' + STYLE_ID);
        if (!hasPanelStyle) {
            var s1 = document.createElement('style');
            s1.id = STYLE_ID;
            s1.textContent = [
                '#' + PANEL_ID + '{display:none;overflow:visible}',
                '#' + PANEL_ID + '.active{display:block}',
                '#' + PANEL_ID + ' .section{margin-bottom:28px}',
                '#' + PANEL_ID + ' .section-header{border-bottom:1px solid #e1e4e8;padding-bottom:8px;margin-bottom:4px}',
                '#' + PANEL_ID + ' .section-header h3{margin:0;font-size:20px;font-weight:600;color:#232527}',
                'html.octane-dark #' + PANEL_ID + ' .section-header{border-bottom-color:#3a3d40}',
                'html.octane-dark #' + PANEL_ID + ' .section-header h3{color:#fff}',
                '#' + PANEL_ID + ' .row{display:flex;align-items:flex-start;justify-content:space-between;padding:14px 0;gap:24px;border-bottom:1px solid #eef0f2}',
                'html.octane-dark #' + PANEL_ID + ' .row{border-bottom-color:#2c2e30}',
                '#' + PANEL_ID + ' .row:last-child{border-bottom:none}',
                '#' + PANEL_ID + ' .row-text{flex:1;min-width:0}',
                '#' + PANEL_ID + ' .label{display:block;font-size:15px;font-weight:500;color:#232527;margin-bottom:3px}',
                'html.octane-dark #' + PANEL_ID + ' .label{color:#e8e8e8}',
                '#' + PANEL_ID + ' .desc{display:block;font-size:13px;color:#7a7d80;line-height:1.5}',
                'html.octane-dark #' + PANEL_ID + ' .desc{color:#9a9da0}',
                '#' + PANEL_ID + ' .toggle{position:relative;width:44px;height:24px;flex-shrink:0;cursor:pointer;margin-top:2px}',
                '#' + PANEL_ID + ' .toggle input{opacity:0;width:0;height:0;position:absolute}',
                '#' + PANEL_ID + ' .toggle .slider{position:absolute;inset:0;background:#c7cbce;border-radius:24px;transition:background .2s}',
                'html.octane-dark #' + PANEL_ID + ' .toggle .slider{background:#3d4043}',
                '#' + PANEL_ID + ' .toggle .slider::before{content:"";position:absolute;height:18px;width:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .2s}',
                '#' + PANEL_ID + ' .toggle input:checked + .slider{background:#22a24a}',
                '#' + PANEL_ID + ' .toggle input:checked + .slider::before{transform:translateX(20px)}',
                '#' + PANEL_ID + ' .dropdown{position:relative;flex-shrink:0}',
                '#' + PANEL_ID + ' .dropdown-btn{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;background:#fff;color:#232527;border:1px solid #c7cbce;border-radius:6px;font-family:inherit;font-size:14px;cursor:pointer;outline:none;min-width:160px;justify-content:space-between}',
                'html.octane-dark #' + PANEL_ID + ' .dropdown-btn{background:#2a2c2e;color:#e8e8e8;border-color:#3a3d40}',
                '#' + PANEL_ID + ' .dropdown-btn:hover{filter:brightness(1.03)}',
                '#' + PANEL_ID + ' .dropdown-arrow{flex:none;width:10px;height:10px;display:inline-block;transition:transform .15s ease}',
                '#' + PANEL_ID + ' .dropdown.open .dropdown-arrow{transform:rotate(180deg)}',
                '#' + PANEL_ID + ' .dropdown-arrow::before{content:"";display:block;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid currentColor}',
                '#' + PANEL_ID + ' .dropdown-menu{position:absolute;top:calc(100% + 4px);right:0;min-width:100%;max-height:260px;overflow-y:auto;background:#fff;border:1px solid #c7cbce;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.12);z-index:50;padding:4px;display:none;font-family:inherit;font-size:14px;scrollbar-width:thin;scrollbar-color:#c7cbce transparent}',
                'html.octane-dark #' + PANEL_ID + ' .dropdown-menu{background:#2a2c2e;border-color:#3a3d40;box-shadow:0 6px 18px rgba(0,0,0,.5);scrollbar-color:#3a3d40 transparent}',
                '#' + PANEL_ID + ' .dropdown-menu::-webkit-scrollbar{width:6px;height:0}',
                '#' + PANEL_ID + ' .dropdown-menu::-webkit-scrollbar-track{background:transparent}',
                '#' + PANEL_ID + ' .dropdown-menu::-webkit-scrollbar-thumb{background:#c7cbce;border-radius:3px}',
                '#' + PANEL_ID + ' .dropdown-menu::-webkit-scrollbar-thumb:hover{background:#b0b5ba}',
                'html.octane-dark #' + PANEL_ID + ' .dropdown-menu::-webkit-scrollbar-thumb{background:#3a3d40}',
                'html.octane-dark #' + PANEL_ID + ' .dropdown-menu::-webkit-scrollbar-thumb:hover{background:#4a4d50}',
                '#' + PANEL_ID + ' .dropdown.open .dropdown-menu{display:block}',
                '#' + PANEL_ID + ' .dropdown-item{padding:7px 10px;border-radius:4px;cursor:pointer;color:#232527;white-space:nowrap}',
                'html.octane-dark #' + PANEL_ID + ' .dropdown-item{color:#e8e8e8}',
                '#' + PANEL_ID + ' .dropdown-item:hover{background:#f2f4f5}',
                'html.octane-dark #' + PANEL_ID + ' .dropdown-item:hover{background:#3a3d40}',
                '#' + PANEL_ID + ' .dropdown-item.selected{background:#e8f0fe;color:#0a84ff}',
                'html.octane-dark #' + PANEL_ID + ' .dropdown-item.selected{background:#1f3a5f;color:#6cb2ff}',
                '#' + PANEL_ID + ' .footer{margin-top:32px;padding-top:20px;border-top:1px solid #e1e4e8;display:flex;align-items:center}',
                'html.octane-dark #' + PANEL_ID + ' .footer{border-top-color:#3a3d40}',
                '#' + PANEL_ID + ' .version{margin-left:auto;font-size:12px;color:#7a7d80}'
            ].join('');
            if (target.head) target.head.appendChild(s1);
            else target.appendChild(s1);
        }

        // 2. Inject hiding styles
        var hasHideStyle = target.getElementById ? target.getElementById(HIDE_STYLE_ID) : target.querySelector('#' + HIDE_STYLE_ID);
        if (!hasHideStyle) {
            var s2 = document.createElement('style');
            s2.id = HIDE_STYLE_ID;
            s2.textContent = '.tab-content.nx-hiding > *:not(#' + PANEL_ID + '){display:none!important}';
            if (target.head) target.head.appendChild(s2);
            else target.appendChild(s2);
        }
    }

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    function buildToggle(key, cfg) {
        var row = el('div', 'row');
        var text = el('div', 'row-text');
        text.appendChild(el('span', 'label', cfg.label));
        text.appendChild(el('span', 'desc', cfg.desc));
        row.appendChild(text);

        var toggle = el('label', 'toggle');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = panelSettings().get(key);

        input.addEventListener('change', function () {
            panelSettings().set(key, input.checked);
            var f = window.NX.features[key];
            if (!f) return;
            if (input.checked && typeof f.apply === 'function') f.apply();
            else if (!input.checked && typeof f.teardown === 'function') f.teardown();
        });

        toggle.appendChild(input);
        toggle.appendChild(el('span', 'slider'));
        row.appendChild(toggle);
        return row;
    }

    function buildDropdown(key, cfg) {
        var row = el('div', 'row');
        var text = el('div', 'row-text');
        text.appendChild(el('span', 'label', cfg.label));
        text.appendChild(el('span', 'desc', cfg.desc));
        row.appendChild(text);

        var f = window.NX.features[key];
        var list = (f && f.FONTS && f.FONTS.length) ? f.FONTS : DEFAULT_FONTS;
        var currentId = (f && typeof f.getFontId === 'function') ? f.getFontId() : panelSettings().getString(key + 'Id', 'default');
        var current = list.filter(function (o) { return o.id === currentId; })[0] || list[0];

        var wrap = el('div', 'dropdown');
        var btn = el('button', 'dropdown-btn');
        btn.type = 'button';
        var labelSpan = el('span', 'dropdown-label', current.label);
        var arrow = el('span', 'dropdown-arrow');
        btn.appendChild(labelSpan);
        btn.appendChild(arrow);
        wrap.appendChild(btn);

        var menu = el('div', 'dropdown-menu');
        list.forEach(function (opt) {
            var item = el('div', 'dropdown-item' + (opt.id === current.id ? ' selected' : ''), opt.label);
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                panelSettings().setString(key + 'Id', opt.id);
                var feat = window.NX.features[key];
                if (feat) {
                    if (typeof feat.setFontId === 'function') feat.setFontId(opt.id);
                    if (opt.id !== 'default' && typeof feat.apply === 'function') feat.apply();
                    if (opt.id === 'default' && typeof feat.teardown === 'function') feat.teardown();
                }
                labelSpan.textContent = opt.label;
                Array.prototype.forEach.call(menu.children, function (c) { c.classList.remove('selected'); });
                item.classList.add('selected');
                wrap.classList.remove('open');
            });
            menu.appendChild(item);
        });
        wrap.appendChild(menu);

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            wrap.classList.toggle('open');
        });

        document.addEventListener('click', function (ev) {
            if (wrap.contains(ev.target)) return;
            wrap.classList.remove('open');
        });

        row.appendChild(wrap);
        return row;
    }

    window.NX.ui.settingsPage = {
        build: function (shadowRoot) {
            injectStyles(shadowRoot);

            var existing = shadowRoot ? shadowRoot.querySelector('#' + PANEL_ID) : document.getElementById(PANEL_ID);
            if (existing) existing.remove();

            var page = el('div');
            page.id = PANEL_ID;

            CATS.forEach(function (cat) {
                var keys = Object.keys(OPTS).filter(function (k) { return OPTS[k].cat === cat.id; });
                if (!keys.length) return;

                var section = el('div', 'section');
                var header = el('div', 'section-header');
                header.appendChild(el('h3', '', cat.label));
                section.appendChild(header);

                keys.forEach(function (key) {
                    var cfg = OPTS[key];
                    section.appendChild(cfg.type === 'select' ? buildDropdown(key, cfg) : buildToggle(key, cfg));
                });

                page.appendChild(section);
            });

            var footer = el('div', 'footer');
            footer.appendChild(el('span', 'version', 'Nexus ' + VERSION));
            page.appendChild(footer);

            return page;
        },
        version: VERSION
    };
})();
