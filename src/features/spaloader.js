(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-loader-style';
    var LOADER_ID = 'loader';
    var FILL_ID = 'loader-fill';
    var timer = null;
    var navigating = false;
    var clickHandler = null;
    var mouseHandler = null;
    var popHandler = null;
    var obs = null;

    var CSS = '#' + LOADER_ID + '{position:fixed;top:0;left:0;width:100%;height:2px;z-index:2147483647;pointer-events:none;background:transparent;opacity:0;transition:opacity .1s linear}' +
              '#' + LOADER_ID + '.on{opacity:1}' +
              '#' + FILL_ID + '{height:100%;width:0%;background:#fff;transition:width .15s linear}';

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }

    function mountLoader() {
        if (document.getElementById(LOADER_ID)) return;
        var loader = document.createElement('div');
        loader.id = LOADER_ID;
        var fill = document.createElement('div');
        fill.id = FILL_ID;
        loader.appendChild(fill);
        (document.body || document.documentElement).appendChild(loader);
    }

    function start() {
        var loader = document.getElementById(LOADER_ID);
        var fill = document.getElementById(FILL_ID);
        if (!loader || !fill) return;
        if (timer) return;
        loader.className = 'on';
        fill.style.width = '0%';
        requestAnimationFrame(function () { fill.style.width = '25%'; });
        var w = 25;
        timer = setInterval(function () {
            w += Math.random() * 4;
            if (w > 92) w = 92;
            fill.style.width = w + '%';
        }, 120);
    }

    function finish() {
        var loader = document.getElementById(LOADER_ID);
        var fill = document.getElementById(FILL_ID);
        if (!timer || !loader || !fill) return;
        clearInterval(timer);
        timer = null;
        fill.style.width = '100%';
        setTimeout(function () {
            loader.className = '';
            setTimeout(function () { fill.style.width = '0%'; }, 150);
        }, 100);
    }

    function navigate(path) {
        if (navigating) return;
        navigating = true;
        start();

        var attempts = 0;
        var tryRoute = function () {
            if (window.next && window.next.router) {
                window.next.router.push(path).then(function () {
                    finish();
                    navigating = false;
                }).catch(function () {
                    navigating = false;
                    window.location.href = path;
                });
            } else if (attempts < 20) {
                attempts++;
                setTimeout(tryRoute, 50);
            } else {
                navigating = false;
                window.location.href = path;
            }
        };
        tryRoute();
    }

    function onClick(e) {
        if (e.defaultPrevented || navigating) return;
        var a = e.target.closest('a[href]');
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || href.indexOf('#') === 0 || href.indexOf('javascript:') === 0 || a.target === '_blank' || a.hasAttribute('download')) return;
        if (href.indexOf('http') === 0) {
            var hostname = new URL(href).hostname;
            if (hostname !== window.location.hostname) return;
        }
        if (href.charAt(0) !== '/' && href.indexOf(window.location.origin) !== 0) return;
        var path = href.charAt(0) === '/' ? href : new URL(href).pathname;
        e.preventDefault();
        e.stopPropagation();
        navigate(path);
    }

    function onMouseDown(e) {
        if (e.defaultPrevented || navigating) return;
        var card = e.target.closest('[ng-click], [onclick]');
        if (!card) return;

        var url = null;
        var ngHref = card.getAttribute('ng-href');
        if (!ngHref) {
            var child = card.querySelector('[ng-href]');
            if (child) ngHref = child.getAttribute('ng-href');
        }
        if (ngHref) url = ngHref;

        var onclick = card.getAttribute('onclick') || '';
        var match = onclick.match(/location\.href\s*=\s*['"]([^'"]+)/);
        if (!url && match) url = match[1];

        if (url && url.charAt(0) === '/') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            navigate(url);
        }
    }

    function onPop() {
        if (navigating) return;
        navigating = true;
        start();
        setTimeout(function () {
            finish();
            navigating = false;
        }, 400);
    }

    window.NX.features.spaLoader = {
        apply: function () {
            style();
            mountLoader();
            clickHandler = onClick;
            mouseHandler = onMouseDown;
            popHandler = onPop;
            document.addEventListener('click', clickHandler, true);
            document.addEventListener('mousedown', mouseHandler, true);
            window.addEventListener('popstate', popHandler);
            obs = new MutationObserver(function () {
                if (!document.getElementById(LOADER_ID)) mountLoader();
            });
            obs.observe(document.documentElement, { childList: true, subtree: true });
        },
        teardown: function () {
            if (clickHandler) document.removeEventListener('click', clickHandler, true);
            if (mouseHandler) document.removeEventListener('mousedown', mouseHandler, true);
            if (popHandler) window.removeEventListener('popstate', popHandler);
            if (obs) obs.disconnect();
            if (timer) { clearInterval(timer); timer = null; }
            var loader = document.getElementById(LOADER_ID);
            if (loader) loader.remove();
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
            clickHandler = null;
            mouseHandler = null;
            popHandler = null;
            obs = null;
            navigating = false;
        },
        refresh: function () {
            if (!document.getElementById(LOADER_ID)) mountLoader();
        }
    };
})();
