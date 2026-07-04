(function () {
    'use strict';
    var CACHE_KEY = 'fx_rates';
    var CACHE_TS = 'fx_ts';
    var TTL = 4 * 3600 * 1000;
    var rates = null;

    /* EXAMPLE currencies. Add/remove entries to match the trip.
       - `code`  : ISO 4217 code used by the exchange API (from ILS)
       - `elId`  : id of the value element in index.html (fx<CODE>)
       - `symbol`: shown after the number
       The fetch URL and fallback are built from this list. */
    var CURRENCIES = [
        { code: 'IDR', elId: 'fxIDR', symbol: 'Rp', fallback: 5990, whole: true },
        { code: 'USD', elId: 'fxUSD', symbol: '$', fallback: 0.333 }
    ];

    function loadCache() {
        try {
            var ts = parseInt(sessionStorage.getItem(CACHE_TS) || '0');
            if (Date.now() - ts < TTL) {
                var r = sessionStorage.getItem(CACHE_KEY);
                return r ? JSON.parse(r) : null;
            }
        } catch (e) {}
        return null;
    }

    function writeCache(r) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(r));
            sessionStorage.setItem(CACHE_TS, String(Date.now()));
        } catch (e) {}
    }

    function update() {
        if (!rates) return;
        var amtEl = document.getElementById('fxAmount');
        if (!amtEl) return;
        var val = parseFloat(amtEl.value);
        function fmt(r, sym, whole) {
            if (!val || !r) return '—';
            var n = val * r;
            var num = whole ? Math.round(n).toLocaleString('he-IL') : n.toFixed(2);
            return num + ' ' + sym;
        }
        CURRENCIES.forEach(function (c) {
            var el = document.getElementById(c.elId);
            if (el) el.textContent = fmt(rates[c.code], c.symbol, c.whole);
        });

        /* Reference line: cross-rates that don't depend on the input amount. */
        var refEl = document.getElementById('fxRef');
        if (refEl && rates.USD) {
            var usdToIls = (1 / rates.USD);            // 1$ = X₪
            var usdToIdr = rates.IDR ? (rates.IDR / rates.USD) : null; // 1$ = Y Rp
            var ilsToIdr = rates.IDR || null;          // 1₪ = Z Rp
            var parts = ['1$ = ' + usdToIls.toFixed(2) + ' ₪'];
            if (usdToIdr) parts.push('1$ = ' + Math.round(usdToIdr).toLocaleString('he-IL') + ' Rp');
            if (ilsToIdr) parts.push('1₪ = ' + Math.round(ilsToIdr).toLocaleString('he-IL') + ' Rp');
            refEl.textContent = parts.join('  ·  ');
        }
    }

    function init() {
        var amtEl = document.getElementById('fxAmount');
        if (!amtEl) return;

        var cached = loadCache();
        if (cached) { rates = cached; update(); return; }

        var codes = CURRENCIES.map(function (c) { return c.code; }).join(',');
        fetch('https://api.frankfurter.app/latest?from=ILS&to=' + codes)
            .then(function (r) { return r.json(); })
            .then(function (d) {
                rates = d.rates || {};
                writeCache(rates);
                update();
                var statusEl = document.getElementById('fxStatus');
                if (statusEl) statusEl.textContent = '';
            })
            .catch(function () {
                rates = {};
                CURRENCIES.forEach(function (c) { rates[c.code] = c.fallback; });
                var statusEl = document.getElementById('fxStatus');
                if (statusEl) statusEl.textContent = '(שערים משוערים)';
                update();
            });

        amtEl.addEventListener('input', update);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
