<p align="center">
  <img src="icons/icon-512-0.3.png" alt="Yamanote.fun" width="120" height="120">
</p>

<h1 align="center">Yamanote.fun</h1>

<p align="center">
  The sound of riding the Yamanote Line, station by station.
</p>

<p align="center">
  <a href="https://claude.ai/code"><img src="https://img.shields.io/badge/Built%20with%20Claude%20Code-D97757?style=for-the-badge&logo=claude&logoColor=white" alt="Built with Claude Code"></a>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white" alt="Netlify">
  <img src="https://img.shields.io/badge/Cloudflare%20R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare R2">
</p>

<p align="center">
  <a href="#what-it-is">What it is</a> •
  <a href="#how-it-was-built">How it was built</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#running-locally">Running locally</a> •
  <a href="#project-structure">Project structure</a>
</p>

---

## What it is

[Yamanote.fun](https://www.yamanote.fun) is an installable web app that recreates the experience of riding Tokyo's Yamanote Line loop — the departure melody, door chime, ambient platform noise, and conductor announcement for every one of the line's 30 stations, stitched into one continuous soundtrack.

- **30 stations, both directions.** The inner loop (anticlockwise) and outer loop (clockwise) have different melody sets, so the two directions genuinely sound different.
- **Real-time playback position.** A ribbon of station artwork scrolls in sync with the audio; skip forward/back to jump a station.
- **Shareable station links.** Each station × direction has its own URL (`/jy13-ikebukuro-inner`) with pre-rendered Open Graph metadata, so a shared link unfurls with the right station name and description on X, WhatsApp, Slack, and iMessage — no client JS required for the preview.
- **Installable PWA.** Add-to-home-screen on iOS/Android/desktop, offline app shell, and an optional on-device download of every station's audio for fully offline playback.
- **Dark/light themes and EN/JP station names**, both persisted locally.
- Sourced from the [ekimero melody archive](https://w.atwiki.jp/ekimerowiki/pages/99.html).

## How it was built

This is a solo project built almost entirely through pair-programming with [Claude Code](https://claude.ai/code) — from the original UI/animation work through the later PWA, offline-audio, and pre-rendered social-share infrastructure. There's no framework and no build step for the app itself: it's hand-written HTML/CSS/JS, kept deliberately small enough for a single person (and a single Claude session) to hold in their head.

The one piece of tooling is [`build.js`](build.js), a small Node script that assembles the deployable `dist/` folder and pre-renders a per-station HTML shell (60 of them — 30 stations × 2 directions) so social crawlers that don't execute JavaScript still get correct per-station title, description, and Open Graph tags when a link is shared. Real browsers load the identical shell and the client-side app takes over immediately.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Client (vanilla JS, no framework)                          │
│  index.html · css/styles.css · js/app.js · js/stations.js   │
│  js/pwa-install.js · js/analytics.js                        │
└───────────────────────┬───────────────────────────────────┘
                         │  fetch (opus / m4a)
┌───────────────────────▼───────────────────────────────────┐
│  Cloudflare R2 (audio storage, via Worker)                  │
│  station melodies, chimes, announcements — per station       │
└───────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  build.js (Node, build-time only)                            │
│  reads js/stations.js → writes dist/{station}-{dir}/index.html│
│  (60 pre-rendered OG shells) + dist/_redirects                │
└───────────────────────┬───────────────────────────────────┘
                         │
┌───────────────────────▼───────────────────────────────────┐
│  Netlify (static hosting + redirects)                        │
└────────────────────────────────────────────────────────────┘
```

- **`js/stations.js`** is the single source of truth for station data — names, kanji, artwork, audio URLs, melody names, and scrub-bar section timings for both directions.
- **`js/app.js`** drives playback, the scrolling station ribbon, swipe/skip controls, share sheet, offline downloads, and theme/language preferences.
- **`sw.js`** is a cache-first service worker for the app shell, plus a separate, user-triggered cache for full station audio (so offline playback doesn't happen without the user asking for it).
- **`js/analytics.js`** loads a cookieless [Umami](https://umami.is/) tracker — no consent banner needed.
- Audio is served from **Cloudflare R2** through a Worker, extension-less in `stations.js` (`app.js` appends `.opus` for Chromium/Firefox or `.m4a` for Safari at runtime, since Safari can't decode Ogg/Opus).
- Deployed on **Netlify**; `netlify.toml` points the build at `node build.js` and publishes `dist/`.

## Running locally

There's no dev server or bundler — it's static files.

```bash
# Serve the raw source (no pre-rendered station shells)
npx serve .

# Or build the full dist/ (pre-renders all 60 station shells + _redirects)
npm run build
npx serve dist
```

## Project structure

```
index.html          App shell — markup, meta tags, deep-link/theme boot script
css/styles.css       All styling (ribbon, controls, modal, themes)
js/app.js            Playback, ribbon animation, controls, share, settings
js/stations.js       Station data — names, artwork, audio URLs, melody timings
js/pwa-install.js    Add-to-home-screen prompt handling
js/analytics.js      Umami analytics loader
sw.js                Service worker — app-shell cache + offline audio cache
build.js             Assembles dist/ and pre-renders per-station OG shells
artwork/             Per-station artwork (JY01–JY30)
icons/               PWA icons (192/512/maskable)
manifest.webmanifest PWA manifest
netlify.toml         Netlify build + CSP header config
```

## Support

If you enjoy Yamanote.fun, consider [supporting it on Ko-fi](https://ko-fi.com/yamanotefun).

## Credits

Station melodies, chimes, and announcements sourced from the [ekimero melody archive](https://w.atwiki.jp/ekimerowiki/pages/99.html). A collaboration between Paul Jackson & Claude.
