// Firebase config — PLACEHOLDER. The site works without it (data saved locally
// in the browser). Fill these in ONLY if you want the trip to sync between
// devices/people (shared to-do, timeline, photos, files).
//
// How to get these values: see references/firebase-setup guide.
// Create a project at https://console.firebase.google.com/, enable Firestore,
// then Project settings → Your apps → copy the config and paste it below.
//
// Until real values are filled in, `firebaseIsConfigured()` returns false and
// the app uses localStorage/sessionStorage only (single-device, no sync).
var firebaseConfig = {
    apiKey: 'AIzaSyBC0kDyeOQutcBWUVWB3Z9pImQvoG-PPs0',
    authDomain: 'honeymoon-plan-fac37.firebaseapp.com',
    projectId: 'honeymoon-plan-fac37',
    storageBucket: 'honeymoon-plan-fac37.firebasestorage.app',
    messagingSenderId: '617616338399',
    appId: '1:617616338399:web:1bf58f3ea263f1b89e686a'
};

function firebaseIsConfigured() {
    var k = String(firebaseConfig.apiKey || '');
    var p = String(firebaseConfig.projectId || '');
    /* Reject any placeholder from the template (YOUR_… or pasted demo text) */
    if (k.indexOf('YOUR') !== -1 || p.indexOf('YOUR') !== -1) return false;
    return k.length > 8 && p.length > 2;
}

var db = null;
try {
    if (typeof firebase !== 'undefined' && firebaseIsConfigured()) {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
    }
} catch (e) {
    console.warn('Firebase לא אותחל – משתמשים ב-localStorage בלבד.', e);
}
