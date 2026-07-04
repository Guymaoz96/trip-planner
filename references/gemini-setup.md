# AI chat (Gemini) — API key

The floating 🤖 chat is an optional travel assistant powered by Google Gemini.

## Important: the key is entered in the running site, not in the code

- The site **never stores an API key in the files**. The first time you open the
  chat, it asks for a key and saves it **only in your browser** (localStorage,
  key `gemini_api_key`). Each person using the site enters their own key.
- This means the builder's key is never involved, and no key ships in the zip.

## Get a free Gemini API key

1. Go to https://aistudio.google.com/apikey (sign in with a Google account).
   - Tip: a **personal Gmail** works best. Some Google **Workspace / work**
     accounts block the free tier — if you see a "free tier"/quota error in the
     chat, create the key with a personal Gmail instead.
2. **Create API key** → copy it (looks like `AIza…`).
3. Open the site → click the 🤖 bubble → paste the key → save.

## Model / endpoint

`js/ai-chat.js` calls `generativelanguage.googleapis.com` with the key in the
`X-goog-api-key` header, using `gemini-flash-latest` (falls back to
`gemini-1.5-flash` on quota). To use a different provider, replace the
`geminiRequest`/`callGemini` functions and the key-input labels.

## Customize the assistant

Edit `SYSTEM_PROMPT` in `js/ai-chat.js` with a short summary of the trip
(destinations + dates) so answers are relevant.
