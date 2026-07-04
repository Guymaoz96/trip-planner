(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', function () {
        var el = document.getElementById('tripMap');
        if (!el || typeof L === 'undefined') return;

        var map = L.map('tripMap', { scrollWheelZoom: false, zoomControl: true })
            .setView([-6, 122], 5);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 18
        }).addTo(map);

        /* EXAMPLE stops. One per major destination, in travel order.
           pos: [lat, lon] · label: pin number · dates/sub: shown in popup. */
        var stops = [
            { pos: [-8.8290, 115.0849], label: '1', title: '🏄 אולוואטו', sub: 'חופים וגלישה', dates: '19–23.7', color: '#ff9a9e' },
            { pos: [-0.2333, 130.8167], label: '2', title: '🐠 ראג׳ה אמפט', sub: 'צלילה ושנורקל', dates: '23–30.7', color: '#88d8c0' },
            { pos: [-8.4350, 115.4450], label: '3', title: '🌾 סידמן', sub: 'טרסות אורז', dates: '30.7–2.8', color: '#a8c0ff' },
            { pos: [-8.3575, 116.0847], label: '4', title: '🐢 גילי אייר', sub: 'אי צבים', dates: '2–4.8', color: '#ffc38b' },
            { pos: [-8.6813, 115.4531], label: '5', title: '🤿 נוסה', sub: 'מנטות וחופים', dates: '4–8.8', color: '#c3a8ff' },
            { pos: [-8.2650, 115.0680], label: '6', title: '⛰️ מונדוק', sub: 'הרים ומפלים', dates: '8–10.8', color: '#8bd3ff' },
            { pos: [-8.5069, 115.2625], label: '7', title: '🌴 אובוד', sub: 'תרבות וג׳ונגל', dates: '10–14.8', color: '#ffb3c8' }
        ];

        var line = stops.map(function (s) { return s.pos; });
        L.polyline(line, { color: '#ff9a9e', weight: 2.5, dashArray: '10, 8', opacity: 0.7 }).addTo(map);

        stops.forEach(function (s) {
            var icon = L.divIcon({
                html: '<div style="background:' + s.color + ';color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;box-shadow:0 3px 10px rgba(0,0,0,0.2);border:2px solid #fff;">' + s.label + '</div>',
                className: '',
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -18]
            });
            L.marker(s.pos, { icon: icon }).addTo(map)
                .bindPopup(
                    '<div style="text-align:right;direction:rtl;font-family:Assistant,sans-serif;min-width:140px">' +
                    '<b style="font-size:1rem">' + s.title + '</b><br>' +
                    '<span style="color:#718096;font-size:0.85rem">' + s.sub + '</span><br>' +
                    '<span style="color:#ff9a9e;font-weight:600;font-size:0.85rem">' + s.dates + '</span>' +
                    '</div>'
                );
        });

        map.fitBounds(line, { padding: [40, 40] });
    });
})();
