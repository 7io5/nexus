(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-custom-font';
    var IFRAME_STYLE_ID = 'nx-custom-font-iframe';
    var STORAGE_KEY = 'nx_custom_font';

    var FONTS = [
        { id: 'default',    label: 'Default',          stack: '' },
        { id: 'roboto',     label: 'Roboto',           stack: '"Roboto", sans-serif' },
        { id: 'opensans',   label: 'Open Sans',        stack: '"Open Sans", sans-serif' },
        { id: 'lato',       label: 'Lato',             stack: '"Lato", sans-serif' },
        { id: 'montserrat', label: 'Montserrat',       stack: '"Montserrat", sans-serif' },
        { id: 'inter',      label: 'Inter',            stack: '"Inter", sans-serif' },
        { id: 'poppins',    label: 'Poppins',          stack: '"Poppins", sans-serif' },
        { id: 'nunito',     label: 'Nunito',           stack: '"Nunito", sans-serif' },
        { id: 'jetbrains',  label: 'JetBrains Mono',   stack: '"JetBrains Mono", monospace' },
        { id: 'comic',      label: 'Comic Sans',       stack: '"Comic Sans MS", cursive' },
        { id: 'raleway',    label: 'Raleway',          stack: '"Raleway", sans-serif' },
        { id: 'rubik',      label: 'Rubik',            stack: '"Rubik", sans-serif' },
        { id: 'worksans',   label: 'Work Sans',        stack: '"Work Sans", sans-serif' },
        { id: 'dmsans',     label: 'DM Sans',          stack: '"DM Sans", sans-serif' },
        { id: 'manrope',    label: 'Manrope',          stack: '"Manrope", sans-serif' },
        { id: 'sora',       label: 'Sora',             stack: '"Sora", sans-serif' },
        { id: 'outfit',     label: 'Outfit',           stack: '"Outfit", sans-serif' },
        { id: 'spacegrotesk', label: 'Space Grotesk',  stack: '"Space Grotesk", sans-serif' },
        { id: 'figtree',    label: 'Figtree',          stack: '"Figtree", sans-serif' },
        { id: 'plusjakarta', label: 'Plus Jakarta Sans', stack: '"Plus Jakarta Sans", sans-serif' },
        { id: 'lexend',     label: 'Lexend',           stack: '"Lexend", sans-serif' },
        { id: 'urbanist',   label: 'Urbanist',         stack: '"Urbanist", sans-serif' },
        { id: 'karla',      label: 'Karla',            stack: '"Karla", sans-serif' },
        { id: 'quicksand',  label: 'Quicksand',        stack: '"Quicksand", sans-serif' },
        { id: 'cabin',      label: 'Cabin',            stack: '"Cabin", sans-serif' },
        { id: 'josefinsans', label: 'Josefin Sans',    stack: '"Josefin Sans", sans-serif' },
        { id: 'barlow',     label: 'Barlow',           stack: '"Barlow", sans-serif' },
        { id: 'mulish',     label: 'Mulish',           stack: '"Mulish", sans-serif' },
        { id: 'dmserif',    label: 'DM Serif Display', stack: '"DM Serif Display", serif' },
        { id: 'playfair',   label: 'Playfair Display', stack: '"Playfair Display", serif' },
        { id: 'merriweather', label: 'Merriweather',   stack: '"Merriweather", serif' },
        { id: 'lora',       label: 'Lora',             stack: '"Lora", serif' },
        { id: 'crimson',    label: 'Crimson Text',     stack: '"Crimson Text", serif' },
        { id: 'ibmplexsans', label: 'IBM Plex Sans',   stack: '"IBM Plex Sans", sans-serif' },
        { id: 'ibmplexmono', label: 'IBM Plex Mono',   stack: '"IBM Plex Mono", monospace' },
        { id: 'firasans',   label: 'Fira Sans',        stack: '"Fira Sans", sans-serif' },
        { id: 'firamono',   label: 'Fira Code',        stack: '"Fira Code", monospace' },
        { id: 'sourcecodepro', label: 'Source Code Pro', stack: '"Source Code Pro", monospace' },
        { id: 'spacemono',  label: 'Space Mono',       stack: '"Space Mono", monospace' },
        { id: 'inconsolata', label: 'Inconsolata',     stack: '"Inconsolata", monospace' },
        { id: 'oswald',     label: 'Oswald',           stack: '"Oswald", sans-serif' },
        { id: 'bebasneue',  label: 'Bebas Neue',       stack: '"Bebas Neue", sans-serif' },
        { id: 'anton',      label: 'Anton',            stack: '"Anton", sans-serif' },
        { id: 'righteous',  label: 'Righteous',        stack: '"Righteous", sans-serif' },
        { id: 'permanentmarker', label: 'Permanent Marker', stack: '"Permanent Marker", cursive' },
        { id: 'pacifico',   label: 'Pacifico',         stack: '"Pacifico", cursive' }
    ];

    var GOOGLE_FONTS = [
        'Roboto', 'Open Sans', 'Lato', 'Montserrat',
        'Inter', 'Poppins', 'Nunito', 'JetBrains Mono',
        'Raleway', 'Rubik', 'Work Sans', 'DM Sans',
        'Manrope', 'Sora', 'Outfit', 'Space Grotesk',
        'Figtree', 'Plus Jakarta Sans', 'Lexend', 'Urbanist',
        'Karla', 'Quicksand', 'Cabin', 'Josefin Sans',
        'Barlow', 'Mulish', 'DM Serif Display', 'Playfair Display',
        'Merriweather', 'Lora', 'Crimson Text', 'IBM Plex Sans',
        'IBM Plex Mono', 'Fira Sans', 'Fira Code', 'Source Code Pro',
        'Space Mono', 'Inconsolata', 'Oswald', 'Bebas Neue',
        'Anton', 'Righteous', 'Permanent Marker', 'Pacifico'
    ];

    var SKIP_SELECTOR = [
        'code', 'pre', 'kbd', 'samp', 'var', 'tt',
        'textarea', 'input', 'select',
        '[contenteditable="true"]',
        '.nx-css-editor', '.nx-css-editor *',
        '#octo-panel-cssarea', '#octo-panel-cssarea *',
        '#octo-panel-prompt-input',
        '.nx-code', '.nx-code *',
        '.rbx-code', '.rbx-code *',
        '.shader-editor', '.shader-editor *',
        '.monaco-editor', '.monaco-editor *',
        '.CodeMirror', '.CodeMirror *'
    ].join(', ');

    function getFontId() {
        try { return localStorage.getItem(STORAGE_KEY) || 'default'; }
        catch (e) { return 'default'; }
    }

    function setFontId(id) {
        try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}
        injectAll();
    }

    function fontById(id) {
        for (var i = 0; i < FONTS.length; i++) {
            if (FONTS[i].id === id) return FONTS[i];
        }
        return FONTS[0];
    }

    var linksInjected = false;
    function injectGoogleFonts() {
        if (linksInjected) return;
        if (document.getElementById('nx-custom-font-links')) { linksInjected = true; return; }
        linksInjected = true;
        var families = GOOGLE_FONTS.map(function (f) {
            return 'family=' + f.replace(/ /g, '+') + ':wght@400;500;600;700';
        }).join('&');
        var l = document.createElement('link');
        l.id = 'nx-custom-font-links';
        l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?' + families + '&display=swap';
        l.crossOrigin = 'anonymous';
        (document.head || document.documentElement).appendChild(l);
    }

    function buildCss(stack) {
        return [
            'html, body, #__next, .gotham-font, .gotham-font * {',
            '  font-family: ' + stack + ' !important;',
            '}',
            'html code, html pre, html kbd, html samp, html var, html tt,',
            'html textarea, html input, html select,',
            'html [contenteditable="true"],',
            'html .monaco-editor, html .monaco-editor *,',
            'html .CodeMirror, html .CodeMirror *,',
            'html .nx-css-editor, html .nx-css-editor *,',
            'html #octo-panel-cssarea, html #octo-panel-cssarea *,',
            'html #octo-panel-prompt-input,',
            'html .nx-code, html .nx-code *,',
            'html .rbx-code, html .rbx-code *,',
            'html .shader-editor, html .shader-editor * {',
            '  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;',
            '}'
        ].join('\n');
    }

    function injectIntoDocument(doc, stack, id) {
        if (!doc || !doc.documentElement) return;
        var old = doc.getElementById(id);
        if (old) old.remove();
        if (!stack) return;
        var s = doc.createElement('style');
        s.id = id;
        s.textContent = buildCss(stack);
        (doc.head || doc.documentElement).appendChild(s);
    }

    function inject() {
        var cfg = fontById(getFontId());
        if (!cfg.stack) {
            removeAll();
            return;
        }
        injectGoogleFonts();
        injectIntoDocument(document, cfg.stack, STYLE_ID);
        forEachSameOriginIframe(function (doc) {
            injectIntoDocument(doc, cfg.stack, IFRAME_STYLE_ID);
        });
    }

    function injectAll() { inject(); }

    function removeAll() {
        var a = document.getElementById(STYLE_ID);
        if (a) a.remove();
        forEachSameOriginIframe(function (doc) {
            var b = doc.getElementById(IFRAME_STYLE_ID);
            if (b) b.remove();
        });
    }

    function forEachSameOriginIframe(fn) {
        var frames = document.querySelectorAll('iframe');
        for (var i = 0; i < frames.length; i++) {
            var d = null;
            try { d = frames[i].contentDocument; } catch (e) { d = null; }
            if (d && d.documentElement) fn(d, frames[i]);
        }
    }

    function bindIframes() {
        var frames = document.querySelectorAll('iframe');
        for (var i = 0; i < frames.length; i++) {
            var f = frames[i];
            if (f.__nxFontBound) continue;
            f.__nxFontBound = true;
            f.addEventListener('load', function () {
                var cfg = fontById(getFontId());
                if (!cfg.stack) return;
                var d = null;
                try { d = this.contentDocument; } catch (e) { d = null; }
                if (d) injectIntoDocument(d, cfg.stack, IFRAME_STYLE_ID);
            });
        }
    }

    var scheduled = false;
    function scheduleInject() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function () {
            scheduled = false;
            inject();
        });
    }

    function apply() {
        var run = function () {
            inject();
            bindIframes();

            var obs = new MutationObserver(function () {
                bindIframes();
                if (!document.getElementById(STYLE_ID) && getFontId() !== 'default') scheduleInject();
            });
            obs.observe(document.documentElement, { childList: true, subtree: true });

            forEachSameOriginIframe(function (doc) {
                try {
                    var fobs = new MutationObserver(function () {
                        if (!doc.getElementById(IFRAME_STYLE_ID) && getFontId() !== 'default') {
                            var cfg = fontById(getFontId());
                            if (cfg.stack) injectIntoDocument(doc, cfg.stack, IFRAME_STYLE_ID);
                        }
                    });
                    fobs.observe(doc.documentElement, { childList: true });
                } catch (e) {}
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
            window.addEventListener('load', function () { scheduleInject(); }, { once: true });
        } else if (document.readyState === 'interactive') {
            window.addEventListener('load', function () { scheduleInject(); }, { once: true });
            run();
        } else {
            run();
        }
    }

    function teardown() {
        removeAll();
        linksInjected = false;
        var l = document.getElementById('nx-custom-font-links');
        if (l) l.remove();
        var frames = document.querySelectorAll('iframe');
        for (var i = 0; i < frames.length; i++) {
            try { delete frames[i].__nxFontBound; } catch (e) {}
        }
    }

    window.NX.features.customFont = {
        apply: apply,
        teardown: teardown,
        FONTS: FONTS,
        getFontId: getFontId,
        setFontId: function (id) { setFontId(id); },
        fontById: fontById
    };
})();
