(function () {
    'use strict';
    var CACHE_KEY = 'weather_v2';
    var TTL = 30 * 60 * 1000;

    /* EXAMPLE cities. One entry per weather card. `id` must match the element
       id in index.html (wx-<id>). lat/lon drive the live forecast. */
    var CITIES = [
        { id: 'uluwatu', name: 'אולוואטו', flag: '🏄', lat: -8.8290, lon: 115.0849, tz: 'Asia/Makassar', note: 'יולי–אוג׳: יבש ~29°C' },
        { id: 'rajaampat', name: 'ראג׳ה אמפט', flag: '🐠', lat: -0.2333, lon: 130.8167, tz: 'Asia/Jayapura', note: 'חם ולח ~31°C' },
        { id: 'sideman', name: 'סידמן', flag: '🌾', lat: -8.4350, lon: 115.4450, tz: 'Asia/Makassar', note: 'הררי ונעים ~27°C' },
        { id: 'gili', name: 'גילי אייר', flag: '🐢', lat: -8.3575, lon: 116.0847, tz: 'Asia/Makassar', note: 'יבש וחמים ~29°C' },
        { id: 'nusa', name: 'נוסה', flag: '🤿', lat: -8.6813, lon: 115.4531, tz: 'Asia/Makassar', note: 'יבש ~29°C' },
        { id: 'munduk', name: 'מונדוק', flag: '⛰️', lat: -8.2650, lon: 115.0680, tz: 'Asia/Makassar', note: 'הרים קרירים ~23°C' },
        { id: 'ubud', name: 'אובוד', flag: '🌴', lat: -8.5069, lon: 115.2625, tz: 'Asia/Makassar', note: 'לח וירוק ~28°C' }
    ];

    var CODES = {
        0: ['☀️', 'בהיר'], 1: ['🌤️', 'כמעט בהיר'], 2: ['⛅', 'מעונן חלקית'], 3: ['☁️', 'מעונן'],
        45: ['🌫️', 'ערפל'], 48: ['🌫️', 'ערפל'], 51: ['🌦️', 'טפטוף'], 61: ['🌧️', 'גשם קל'],
        63: ['🌧️', 'גשם'], 71: ['🌨️', 'שלג'], 80: ['🌦️', 'מקלחות'], 95: ['⛈️', 'סערה']
    };

    function codeInfo(c) {
        for (var k in CODES) { if (parseInt(k) === c) return CODES[k]; }
        if (c <= 3) return CODES[c] || ['🌤️', ''];
        if (c < 50) return ['🌫️', 'ערפל'];
        if (c < 70) return ['🌧️', 'גשם'];
        return ['🌤️', ''];
    }

    function loadCache() {
        try {
            var raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            var obj = JSON.parse(raw);
            if (Date.now() - obj.ts > TTL) return null;
            return obj.data;
        } catch (e) { return null; }
    }

    function saveCache(data) {
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
    }

    function fetchCity(city) {
        var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + city.lat +
            '&longitude=' + city.lon + '&current_weather=true&timezone=' + city.tz;
        return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
            return {
                id: city.id,
                temp: Math.round(d.current_weather.temperature),
                wind: Math.round(d.current_weather.windspeed),
                code: d.current_weather.weathercode
            };
        });
    }

    function render(results) {
        CITIES.forEach(function (city, i) {
            var el = document.getElementById('wx-' + city.id);
            if (!el) return;
            var r = results && results[i];
            if (r && r.temp !== undefined) {
                var info = codeInfo(r.code);
                el.innerHTML =
                    '<div class="wx-icon">' + info[0] + '</div>' +
                    '<div class="wx-temp">' + r.temp + '°C</div>' +
                    '<div class="wx-desc">' + info[1] + '</div>' +
                    '<div class="wx-note">' + city.note + '</div>';
            } else {
                el.innerHTML = '<div class="wx-note" style="padding:0.5rem">' + city.note + '</div>';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (!document.getElementById('wx-' + (CITIES[0] && CITIES[0].id))) return;

        var cached = loadCache();
        if (cached) { render(cached); return; }

        Promise.all(CITIES.map(fetchCity))
            .then(function (results) { saveCache(results); render(results); })
            .catch(function () { render(null); });
    });
})();
