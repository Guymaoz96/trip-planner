# Firebase (Firestore) setup — optional, for syncing between devices/people

The site works without this (data stays in one browser). Do this only if you
want the trip to **sync** — e.g. two phones seeing the same to-do, timeline,
photos and files. **You create your own free Firebase project; none of the
builder's data is involved.**

## Steps (~5 minutes, free "Spark" plan is enough)

1. Go to https://console.firebase.google.com/ and sign in with a Google account.
2. **Add project** → give it any name → you can disable Google Analytics → Create.
3. In the left menu: **Build → Firestore Database → Create database**.
   - Start in **production mode** (or test mode; you'll set rules below).
   - Pick a location close to you.
4. Register a web app: **Project settings (gear) → General → Your apps →
   Web (`</>`)** → give it a nickname → Register. Firebase shows a
   `firebaseConfig = { apiKey: …, projectId: …, … }` snippet.
5. Copy those values into **`js/firebase-config.js`**, replacing the
   `YOUR_…` placeholders. Save. That's it — the site now syncs.

## Security rules

This app has no login. For a private family trip the simplest workable rule is
open read/write to the collections it uses. In **Firestore → Rules**, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{doc} {
      allow read, write: if collection in
        ['timeline','dayFiles','photos','todo','budget','packing','tripConfig'];
    }
  }
}
```

> Note: this is open to anyone who has your Firebase project keys (the keys are
> visible in the site's JS — that's normal for client-side Firebase). Fine for a
> private trip site shared with a partner. If you want it locked down, add
> Firebase Anonymous/Email auth and require `request.auth != null` in the rules.

## Is my data safe?

- The `firebaseConfig` values are **not secrets** — client Firebase always ships
  them in the page. Security comes from the rules above, not from hiding keys.
- Do **not** commit anything else (no personal tokens). Only the placeholder or
  your own config belongs in `firebase-config.js`.
