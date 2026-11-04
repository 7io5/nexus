(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var link = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOGAqhROCtw0Ut_YFfVdTjB47MGcme_ZEx9Pw1BZOqAMck7rggs1-pvz0&s=10';
    var seed = 0x9E3779B9;
    var epoch = 1700000000000;
    var total = 100;
    var size = 128;
    var minS = 0.08;
    var maxS = 0.16;

    var layer = null;
    var bits = [];
    var loop = null;
    var prev = 0;
    var w = 0, h = 0, res = 1;
    var hits = [];
    var pen = null;
    var base = null;

    function handleMessage(e) {
        if (!e.data || e.data.type !== 'OCTANE_SHOW_IMAGE_POPUP') return;

        var old = document.getElementById('octane-global-popup');
        if (old) old.remove();

        var wrap = document.createElement('div');
        wrap.id = 'octane-global-popup';
        wrap.style.position = 'fixed';
        wrap.style.top = '0';
        wrap.style.left = '0';
        wrap.style.width = '100vw';
        wrap.style.height = '100vh';
        wrap.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        wrap.style.display = 'flex';
        wrap.style.justifyContent = 'center';
        wrap.style.alignItems = 'center';
        wrap.style.zIndex = '9999999999';
        wrap.style.opacity = '0';
        wrap.style.transition = 'opacity 0.3s ease, background-color 0.3s ease';

        var box = document.createElement('div');
        box.style.position = 'relative';
        box.style.display = 'flex';
        box.style.justifyContent = 'center';
        box.style.alignItems = 'center';
        box.style.maxWidth = '90%';
        box.style.maxHeight = '90%';
        box.style.transform = 'scale(0.7) translateY(40px)';
        box.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';

        var pic = document.createElement('img');
        pic.style.maxWidth = '100%';
        pic.style.maxHeight = '100%';
        pic.style.borderRadius = '12px';
        pic.style.boxShadow = '0 8px 32px rgba(0,0,0,0.6)';
        pic.style.userSelect = 'none';
        pic.src = e.data.url;

        var close = document.createElement('div');
        close.style.position = 'absolute';
        close.style.top = '-40px';
        close.style.right = '-40px';
        close.style.width = '40px';
        close.style.height = '40px';
        close.style.backgroundColor = 'transparent';
        close.style.display = 'flex';
        close.style.justifyContent = 'center';
        close.style.alignItems = 'center';
        close.style.cursor = 'pointer';
        close.style.color = '#b5bac1';
        close.style.transition = 'color 0.15s ease, transform 0.15s ease';
        close.innerHTML = '<svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z"></path></svg>';

        close.addEventListener('mouseenter', function () {
            close.style.color = '#ffffff';
            close.style.transform = 'scale(1.1)';
        });
        close.addEventListener('mouseleave', function () {
            close.style.color = '#b5bac1';
            close.style.transform = 'scale(1)';
        });

        box.appendChild(pic);
        box.appendChild(close);
        wrap.appendChild(box);
        document.body.appendChild(wrap);

        requestAnimationFrame(function () {
            wrap.style.opacity = '1';
            wrap.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            box.style.transform = 'scale(1) translateY(0)';
        });

        function hide() {
            wrap.style.opacity = '0';
            wrap.style.backgroundColor = 'rgba(0, 0, 0, 0)';
            box.style.transform = 'scale(0.8) translateY(20px)';
            setTimeout(function () { wrap.remove(); }, 350);
        }

        close.addEventListener('click', hide);
        wrap.addEventListener('click', function (ev) {
            if (ev.target === wrap) hide();
        });
    }

    function sync(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function fit() {
        res = Math.min(window.devicePixelRatio || 1, 1.5);
        w = window.innerWidth;
        h = window.innerHeight;
        layer.width = Math.round(w * res);
        layer.height = Math.round(h * res);
        pen.setTransform(res, 0, 0, res, 0, 0);
    }

    function spawn() {
        var rnd = sync(seed);
        bits = [];
        for (var i = 0; i < total; i++) {
            var sc = minS + rnd() * (maxS - minS);
            bits.push({
                x0: rnd(),
                y0: rnd(),
                size: size * sc,
                speed: 1.2 + rnd() * 1.5,
                swayPhase: rnd() * Math.PI * 2,
                swaySpeed: 0.010 + rnd() * 0.015,
                swayAmp: 0.8 + rnd() * 1.5,
                bobPhase: rnd() * Math.PI * 2,
                bobSpeed: 0.015 + rnd() * 0.025,
                bobAmp: 1.0 + rnd() * 1.5,
                rotation: rnd() * Math.PI * 2,
                rotSpeed: (rnd() - 0.5) * 0.02,
                opacityBase: 0.55 + rnd() * 0.35,
                opacityPhase: rnd() * Math.PI * 2,
                opacitySpeed: 0.005 + rnd() * 0.01,
                yOffset: rnd()
            });
        }
    }

    function paint(ts) {
        if (!prev) prev = ts;
        var gap = ts - prev;
        prev = ts;
        if (gap > 40) gap = 40;

        var now = Date.now();
        var time = (now - epoch) / 16.667;

        pen.clearRect(0, 0, w, h);
        hits.length = 0;

        for (var i = 0; i < bits.length; i++) {
            var f = bits[i];

            var shift = Math.sin(f.swayPhase + time * f.swaySpeed) * f.swayAmp;
            var startX = f.x0 * w;
            var posX = (startX + shift) % w;
            if (posX < 0) posX += w;

            var dropY = time * f.speed;
            var posY = (f.yOffset * h + dropY) % (h + f.size * 2);
            if (posY < 0) posY += h;

            var spin = f.rotation + time * f.rotSpeed;

            var glow = Math.sin(f.opacityPhase + time * f.opacitySpeed) * 0.15;
            var alpha = Math.max(0, Math.min(1, f.opacityBase + glow));

            hits.push({ x: posX, y: posY, size: f.size });

            pen.globalAlpha = alpha;
            pen.save();
            pen.translate(posX, posY);
            pen.rotate(spin);
            pen.drawImage(base, -f.size * 0.5, -f.size * 0.5, f.size, f.size);
            pen.restore();
        }

        loop = requestAnimationFrame(paint);
    }

    function handleVisibility() {
        if (document.hidden) {
            cancelAnimationFrame(loop);
            loop = null;
        } else if (!loop) {
            prev = 0;
            loop = requestAnimationFrame(paint);
        }
    }

    function handleClick(e) {
        var cx = e.clientX;
        var cy = e.clientY;

        for (var i = 0; i < hits.length; i++) {
            var p = hits[i];
            var dx = cx - p.x;
            var dy = cy - p.y;

            if ((dx * dx + dy * dy) < ((p.size * 0.5 + 10) * (p.size * 0.5 + 10))) {
                window.top.postMessage({
                    type: 'OCTANE_SHOW_IMAGE_POPUP',
                    url: link
                }, '*');
                break;
            }
        }
    }

    function handleResize() {
        if (layer) fit();
    }

    window.NX.features.snow = {
        apply: function () {
            if (layer) return;

            var url = window.location.href.toLowerCase();
            var isIframe = window.self !== window.top;

            // Blocked globally
            if (
                url.indexOf('chat') !== -1 || 
                url.indexOf('develop') !== -1 || 
                url.indexOf('build/upload') !== -1 ||
                url.indexOf('/catalog/') !== -1 ||
                url.indexOf('/library/') !== -1
            ) {
                return;
            }

            // Blocked only inside iframes
            if (isIframe && (
                url.indexOf('friends') !== -1 || 
                url.indexOf('trades') !== -1 || 
                url.indexOf('donate') !== -1 || 
                url.indexOf('inventory') !== -1 ||
                url.indexOf('avatar') !== -1
            )) {
                return;
            }

            window.addEventListener('message', handleMessage);

            if (window.self === window.top) return;

            base = document.createElement('canvas');
            base.width = size;
            base.height = size;
            var bCtx = base.getContext('2d', { alpha: true });

            bCtx.font = (size * 0.8) + 'px "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
            bCtx.textAlign = 'center';
            bCtx.textBaseline = 'middle';
            bCtx.fillText('\u2744\uFE0F', size / 2, size / 2 + 4);

            bCtx.globalCompositeOperation = 'source-in';
            var color = bCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
            color.addColorStop(0, '#ffffff');
            color.addColorStop(0.4, '#b3e5fc');
            color.addColorStop(0.8, '#4fc3f7');
            color.addColorStop(1, '#0288d1');
            bCtx.fillStyle = color;
            bCtx.fillRect(0, 0, size, size);

            layer = document.createElement('canvas');
            layer.style.position = 'fixed';
            layer.style.top = '0';
            layer.style.left = '0';
            layer.style.width = '100%';
            layer.style.height = '100%';
            layer.style.pointerEvents = 'none';
            layer.style.zIndex = '2147483647';
            layer.style.willChange = 'transform';

            pen = layer.getContext('2d', { alpha: true });

            document.body.appendChild(layer);
            fit();
            spawn();

            window.addEventListener('resize', handleResize);
            window.addEventListener('click', handleClick);
            document.addEventListener('visibilitychange', handleVisibility);

            prev = 0;
            loop = requestAnimationFrame(paint);
        },
        teardown: function () {
            if (layer) {
                layer.remove();
                layer = null;
            }
            if (loop) {
                cancelAnimationFrame(loop);
                loop = null;
            }
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('click', handleClick);
            document.removeEventListener('visibilitychange', handleVisibility);
            
            var popup = document.getElementById('octane-global-popup');
            if (popup) popup.remove();

            bits = [];
            hits = [];
            base = null;
            pen = null;
        }
    };
})();
