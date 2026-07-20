(function () {
    'use strict';
    var mapInstance = null;
    var markersLayer = null;

    /* Per-id map metadata (lat/lon can't be derived from tripData). The pin
       NUMBER and DATE RANGE are never read from here — both are computed
       fresh from tripData.countries' current order/dates on every render, so
       reordering/adding/removing in the itinerary editor stays in sync. A
       destination added from "יעדים נוספים" (js/destination-catalog.js) gets
       its pin from there automatically; a fully custom name has no
       coordinates anywhere and simply gets no pin. */
    var STOP_META = {
        uluwatu: { pos: [-8.8290, 115.0849], flag: '🏄', sub: 'חופים וגלישה', color: '#ff9a9e' },
        rajaampat: { pos: [-0.2333, 130.8167], flag: '🐠', sub: 'צלילה ושנורקל', color: '#88d8c0' },
        sideman: { pos: [-8.4350, 115.4450], flag: '🌾', sub: 'טרסות אורז', color: '#a8c0ff' },
        gili: { pos: [-8.3575, 116.0847], flag: '🐢', sub: 'אי צבים', color: '#ffc38b' },
        nusa: { pos: [-8.6813, 115.4531], flag: '🤿', sub: 'מנטות וחופים', color: '#c3a8ff' },
        munduk: { pos: [-8.2650, 115.0680], flag: '⛰️', sub: 'הרים ומפלים', color: '#8bd3ff' },
        ubud: { pos: [-8.5069, 115.2625], flag: '🌴', sub: 'תרבות וג׳ונגל', color: '#ffb3c8' }
    };

    /* Shared with js/schedule-view.js so the calendar cells use the same
       per-destination colors as the map pins. */
    window.STOP_META = STOP_META;

    function candidateMeta(id) {
        if (typeof DESTINATION_CATALOG === 'undefined') return null;
        var c = DESTINATION_CATALOG.filter(function (d) { return d.id === id; })[0];
        if (!c || !c.pos) return null;
        return { pos: c.pos, flag: '', sub: '', color: c.color || '#cbd5e0' };
    }

    /* Check-in → check-out (last night + 1), matching the cards and the
       schedule view — see checkoutDate() in js/main.js. */
    function compactRange(days) {
        if (!days.length) return '';
        var first = new Date(days[0].date + 'T12:00:00');
        var last = new Date(checkoutDate(days[days.length - 1].date) + 'T12:00:00');
        function dm(d) { return d.getDate() + '.' + (d.getMonth() + 1); }
        if (first.getMonth() === last.getMonth()) return first.getDate() + '–' + dm(last);
        return dm(first) + '–' + dm(last);
    }

    /* Order + dates always reflect tripData.countries' current state; only
       lat/lon/color/sub come from the static lookups above. */
    function activeStopsInOrder() {
        var countries = (typeof tripData !== 'undefined' && tripData.countries) || [];
        var result = [];
        countries.forEach(function (c, i) {
            var meta = STOP_META[c.id] || candidateMeta(c.id);
            if (!meta) return;
            var days = [];
            c.weeks.forEach(function (w) { days = days.concat(w.days); });
            result.push({
                pos: meta.pos,
                label: String(i + 1),
                title: (meta.flag ? meta.flag + ' ' : '') + c.name,
                sub: meta.sub || '',
                dates: compactRange(days),
                color: meta.color
            });
        });
        return result;
    }

    function render() {
        var el = document.getElementById('tripMap');
        if (!el || typeof L === 'undefined') return;
        var active = activeStopsInOrder();
        if (!active.length) return;

        if (!mapInstance) {
            mapInstance = L.map('tripMap', { scrollWheelZoom: false, zoomControl: true }).setView([-6, 122], 5);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 18
            }).addTo(mapInstance);
        }
        if (markersLayer) markersLayer.remove();
        markersLayer = L.layerGroup().addTo(mapInstance);

        var line = active.map(function (s) { return s.pos; });
        L.polyline(line, { color: '#ff9a9e', weight: 2.5, dashArray: '10, 8', opacity: 0.7 }).addTo(markersLayer);

        active.forEach(function (s) {
            var icon = L.divIcon({
                html: '<div style="background:' + s.color + ';color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;box-shadow:0 3px 10px rgba(0,0,0,0.2);border:2px solid #fff;">' + s.label + '</div>',
                className: '',
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -18]
            });
            L.marker(s.pos, { icon: icon }).addTo(markersLayer)
                .bindPopup(
                    '<div style="text-align:right;direction:rtl;font-family:Assistant,sans-serif;min-width:140px">' +
                    '<b style="font-size:1rem">' + s.title + '</b><br>' +
                    (s.sub ? '<span style="color:#718096;font-size:0.85rem">' + s.sub + '</span><br>' : '') +
                    '<span style="color:#ff9a9e;font-weight:600;font-size:0.85rem">' + s.dates + '</span>' +
                    '</div>'
                );
        });

        mapInstance.fitBounds(line, { padding: [40, 40] });
    }

    document.addEventListener('DOMContentLoaded', render);
    document.addEventListener('tripdatachange', render);
})();
