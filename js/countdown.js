(function () {
    'use strict';
    /* EXAMPLE — set to the trip's first day ('YYYY-MM-DD'T00:00:00). */
    var target = new Date('2026-07-19T00:00:00');

    function unit(n, label) {
        return '<div class="cd-unit">' +
            '<span class="cd-num">' + String(n).padStart(2, '0') + '</span>' +
            '<span class="cd-label">' + label + '</span>' +
            '</div>';
    }

    function render() {
        var el = document.getElementById('countdown');
        if (!el) return;
        var diff = target - Date.now();
        if (diff <= 0) {
            el.innerHTML = '<p class="cd-done">✈️ הטיול כבר התחיל!</p>';
            return;
        }
        var d = Math.floor(diff / 86400000);
        var h = Math.floor((diff % 86400000) / 3600000);
        var m = Math.floor((diff % 3600000) / 60000);
        var s = Math.floor((diff % 60000) / 1000);
        el.innerHTML = '<div class="cd-row">' +
            unit(d, 'ימים') + unit(h, 'שעות') + unit(m, 'דקות') + unit(s, 'שניות') +
            '</div>';
    }

    document.addEventListener('DOMContentLoaded', function () {
        render();
        setInterval(render, 1000);
    });
})();
