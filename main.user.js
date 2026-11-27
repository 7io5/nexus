// ==UserScript==
// @name         Nexus
// @namespace    https://github.com/zykieboi/nexus
// @version      1.5.3
// @icon         https://raw.githubusercontent.com/7io5/nexus/main/img/icon.png
// @author       zykieboi
// @description  Testing stuff :)
// @match        https://octane.wtf/*
// @match        https://*.octane.wtf/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      octane.wtf
// @connect      tcdn.octane.wtf
// @connect      raw.githubusercontent.com
// @connect      octomons.wtf
// @run-at       document-start
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/build/bundle.js?v=16.3
// @downloadURL  https://raw.githubusercontent.com/zykieboi/nexus/main/main.user.js
// @updateURL    https://raw.githubusercontent.com/zykieboi/nexus/main/main.user.js
// ==/UserScript==
(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};
    window.NX.ui = window.NX.ui || {};
    window.NX.role = null;

    var TAB_ID = 'nx-tab';
    var TAB_CONTENT_HIDE_CLASS = 'nx-hiding';
    var HEADER_FLAG = 'data-nx-swapped';
    var REOPEN_KEY = 'nx_reopen';

    var nxOpen = false;
    var reopenConsumed = false;
    var hiddenSiblings = [];

    function deepQuery(selector, root) {
        root = root || document;
        var found = root.querySelector(selector);
        if (found) return found;
        var hosts = root.querySelectorAll('*');
        for (var i = 0; i < hosts.length; i++) {
            if (hosts[i].shadowRoot) {
                var r = deepQuery(selector, hosts[i].shadowRoot);
                if (r) return r;
            }
        }
        return null;
    }

    function deepQueryAll(selector, root) {
        root = root || document;
        var out = Array.prototype.slice.call(root.querySelectorAll(selector));
        var hosts = root.querySelectorAll('*');
        for (var i = 0; i < hosts.length; i++) {
            if (hosts[i].shadowRoot) {
                out = out.concat(deepQueryAll(selector, hosts[i].shadowRoot));
            }
        }
        return out;
    }

    function meId() {
        var id = parseInt(localStorage.getItem('nx_me_id') || '0', 10);
        if (id) return id;
        try {
            var u = window.__NEXT_DATA__ && window.__NEXT_DATA__.props
                && window.__NEXT_DATA__.props.pageProps
                && window.__NEXT_DATA__.props.pageProps.user;
            if (u && u.id) {
                localStorage.setItem('nx_me_id', String(u.id));
                return u.id;
            }
        } catch (e) {}
        var a = deepQuery('a[href*="/users/"][href*="/profile"]');
        if (a) {
            var m = (a.getAttribute('href') || '').match(/\/users\/(\d+)\/profile/);
            if (m) {
                id = parseInt(m[1], 10);
                localStorage.setItem('nx_me_id', String(id));
                return id;
            }
        }
        return 0;
    }

    function meName() {
        try {
            var u = window.__NEXT_DATA__ && window.__NEXT_DATA__.props
                && window.__NEXT_DATA__.props.pageProps
                && window.__NEXT_DATA__.props.pageProps.user;
            if (u && (u.name || u.username)) return u.name || u.username;
        } catch (e) {}
        var el = deepQuery('.age-bracket-label-username');
        if (el && el.textContent) return el.textContent.trim().replace(/^@/, '');
        return '';
    }

    window.NX.getMeId = meId;
    window.NX.getMeName = meName;

    function refreshRole() {
        return Promise.resolve(null);
    }
    window.NX.refreshRole = refreshRole;

    function makeTabLi() {
        var li = document.createElement('li');
        li.id = TAB_ID;
        li.className = 'menu-option';

        var a = document.createElement('a');
        a.className = 'rbx-tab-heading';
        a.href = '#';
        var span = document.createElement('span');
        span.className = 'font-caption-header';
        span.textContent = 'Nexus';
        a.appendChild(span);
        li.appendChild(a);

        li.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            try { sessionStorage.removeItem(REOPEN_KEY); } catch (err) {}
            openNexus();
        }, true);

        return li;
    }

    function ensureTab() {
        var list = deepQuery('#vertical-menu');
        if (!list) return false;
        if (deepQuery('#' + TAB_ID)) return true;
        list.appendChild(makeTabLi());
        return true;
    }

    function markActive() {
        var list = deepQuery('#vertical-menu');
        if (!list) return;
        requestAnimationFrame(function () {
            list.querySelectorAll('.menu-option').forEach(function (li) {
                if (li.id === TAB_ID) li.classList.add('active');
                else li.classList.remove('active');
            });
        });
    }

    function clearActive() {
        var tab = deepQuery('#' + TAB_ID);
        if (tab) tab.classList.remove('active');
    }

    function swapHeader() {
        var h1 = deepQuery('.user-account-header');
        if (!h1) return;
        if (h1.getAttribute(HEADER_FLAG) === '1') return;
        h1.setAttribute(HEADER_FLAG, '1');
        h1.setAttribute('data-nx-original', h1.textContent);
        h1.textContent = 'My Nexus Settings';
    }

    function restoreHeader() {
        var h1 = deepQuery('.user-account-header');
        if (!h1) return;
        if (h1.getAttribute(HEADER_FLAG) !== '1') return;
        var orig = h1.getAttribute('data-nx-original');
        if (orig) h1.textContent = orig;
        h1.removeAttribute(HEADER_FLAG);
        h1.removeAttribute('data-nx-original');
    }

    function ensurePanel() {
        var tabContent = deepQuery('#settings-container .tab-content');
        if (!tabContent) return null;

        var existing = deepQuery('#nx-panel');
        if (existing && existing.parentNode === tabContent) return existing;

        if (existing) existing.remove();
        if (!window.NX.ui.settingsPage || typeof window.NX.ui.settingsPage.build !== 'function') return null;

        var rootNode = tabContent.getRootNode();
        var panel = window.NX.ui.settingsPage.build(rootNode);
        tabContent.appendChild(panel);
        return panel;
    }

    function hideContent(tabContent) {
        hiddenSiblings = [];
        var children = Array.prototype.slice.call(tabContent.children);
        children.forEach(function (child) {
            if (child.id === 'nx-panel') return;
            if (child.style.display === 'none') return;
            hiddenSiblings.push({ el: child, display: child.style.display });
            child.style.display = 'none';
        });
    }

    function showContent() {
        hiddenSiblings.forEach(function (item) {
            if (item.el && item.el.parentNode) {
                item.el.style.display = item.display;
            }
        });
        hiddenSiblings = [];
    }

    function openNexus() {
        nxOpen = true;

        var tabContent = deepQuery('#settings-container .tab-content');
        if (!tabContent) return;

        var panel = ensurePanel();
        if (!panel) return;

        hideContent(tabContent);
        panel.classList.add('nx-active');

        ensureTab();
        markActive();
        swapHeader();
    }

    function closeNexus() {
        nxOpen = false;

        showContent();
        var panel = deepQuery('#nx-panel');
        if (panel) panel.classList.remove('nx-active');
        clearActive();
        restoreHeader();
    }

    function purgeNexusPanel() {
        nxOpen = false;
        showContent();
        var panel = deepQuery('#nx-panel');
        if (panel) panel.remove();
        var tab = deepQuery('#' + TAB_ID);
        if (tab) tab.remove();
        restoreHeader();
    }

    function isAccountPage() {
        var p = location.pathname;
        return p === '/my/account'
            || p === '/my/settings'
            || p === '/theme2020/setting';
    }

    function isSettingsPage() {
        return isAccountPage() && !!deepQuery('#vertical-menu');
    }

    document.addEventListener('click', function (e) {
        var li = e.target.closest && e.target.closest('#vertical-menu .menu-option');
        if (!li) return;
        if (li.id === TAB_ID) return;
        try { sessionStorage.removeItem(REOPEN_KEY); } catch (err) {}
        if (nxOpen) closeNexus();
    }, true);

    function consumeReopen() {
        if (reopenConsumed) return false;
        var flag;
        try { flag = sessionStorage.getItem(REOPEN_KEY); } catch (e) {}
        if (flag !== '1') { reopenConsumed = true; return false; }
        try { sessionStorage.removeItem(REOPEN_KEY); } catch (e) {}
        reopenConsumed = true;
        return true;
    }

    function panelTick() {
        if (!isAccountPage()) {
            if (deepQuery('#' + TAB_ID) || deepQuery('#' + 'nx-panel')) purgeNexusPanel();
            return;
        }

        if (!isSettingsPage()) return;

        ensureTab();
        observeMenu();

        if (consumeReopen()) { openNexus(); return; }

        if (nxOpen) {
            var panel = deepQuery('#' + 'nx-panel');
            if (!panel) {
                var tabContent = deepQuery('#settings-container .tab-content');
                var p = ensurePanel();
                if (p && tabContent) {
                    hideContent(tabContent);
                    p.classList.add('nx-active');
                }
            }
        }
    }

    function observeMenu() {
        var list = deepQuery('#vertical-menu');
        if (!list || list.__nxWatched) return;
        list.__nxWatched = true;
        new MutationObserver(function () {
            if (!deepQuery('#' + TAB_ID)) ensureTab();
        }).observe(list, { childList: true });
    }

    function applyAll() {
        var f = window.NX.features;
        var s = window.NX.settings;
        if (!f || !s) return;

        if (s.get('removeAds') && f.removeAds) f.removeAds.apply();
        if (s.get('hideAlert') && f.hideAlert) f.hideAlert.apply();
        if (s.get('rap') && f.rap) f.rap.apply();
        if (s.get('inventorySearch') && f.inventorySearch) f.inventorySearch.apply();
        if (s.get('bulkUnfriend') && f.bulkUnfriend) f.bulkUnfriend.apply();
        if (s.get('customLogo') && f.customLogo) f.customLogo.apply();
        if (s.get('hideChat') && f.hideChat) f.hideChat.apply();
        if (s.get('customFont') && f.customFont) f.customFont.apply();
        if (s.get('nexusPanel') && f.nexusPanel) f.nexusPanel.apply();
        if (s.get('background') && f.background) f.background.apply();
        if (s.get('userBadge') && f.userBadge) f.userBadge.apply();
        if (s.get('tradeValues') && f.tradeValues) f.tradeValues.apply();
        if (s.get('itemOwners') && f.itemOwners) f.itemOwners.apply();
        if (s.get('quickSearch') && f.quickSearch) f.quickSearch.apply();
        if (s.get('snow') && f.snow) f.snow.apply();
        if (f.announcement) f.announcement.apply();
    }

    function tick() {
        panelTick();

        var f = window.NX.features;
        var s = window.NX.settings;
        if (!f || !s) return;

        if (s.get('removeAds') && f.removeAds) f.removeAds.apply();
        if (s.get('hideAlert') && f.hideAlert) f.hideAlert.apply();
        if (s.get('rap') && f.rap) f.rap.apply();
        if (s.get('inventorySearch') && f.inventorySearch) f.inventorySearch.apply();
        if (s.get('bulkUnfriend') && f.bulkUnfriend) f.bulkUnfriend.apply();
        if (s.get('tradeValues') && f.tradeValues) f.tradeValues.apply();
        if (s.get('quickSearch') && f.quickSearch) f.quickSearch.apply();
        if (s.get('snow') && f.snow) f.snow.apply();
        if (s.get('background') && f.background) f.background.apply();
        if (s.get('userBadge') && f.userBadge) f.userBadge.apply();
    }

    var tries = 0;
    var burst = setInterval(function () {
        tick();
        if (++tries > 40) clearInterval(burst);
    }, 50);

    setInterval(tick, 500);

    new MutationObserver(tick).observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    function wrapHistory(name) {
        var orig = history[name];
        history[name] = function () {
            var r = orig.apply(this, arguments);
            setTimeout(tick, 0);
            setTimeout(tick, 100);
            setTimeout(tick, 400);
            return r;
        };
    }
    wrapHistory('pushState');
    wrapHistory('replaceState');
    window.addEventListener('popstate', function () {
        setTimeout(tick, 0);
        setTimeout(tick, 100);
        setTimeout(tick, 400);
    });

    var booted = false;
    function boot() {
        if (booted) return;
        booted = true;
        refreshRole().then(function () {
            applyAll();
            tick();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
    setTimeout(boot, 1200);
})();
