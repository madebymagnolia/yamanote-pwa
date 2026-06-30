/* ───────────────────────────────────────────────────────────
   Yamanote.fun — analytics (Umami)
   A self-contained module: call init() once on load. It wires the
   app's existing controls + window events to Umami custom events so
   we can see how many tracks get listened through, the most popular
   station, and how often each control is used.

   The Umami loader script lives in index.html <head> (cookieless, so
   no consent banner). This module only fires custom events; it touches
   nothing in the player and degrades to a no-op when Umami is blocked
   or offline. Removing analytics = delete this file + its two
   index.html lines; the player keeps working untouched.
   ─────────────────────────────────────────────────────────── */

// Safe wrapper — never throws, no-ops when Umami is blocked/offline.
function track(name, data) {
  try {
    if (window.umami && typeof window.umami.track === "function") {
      data ? window.umami.track(name, data) : window.umami.track(name);
    }
  } catch (e) {}
}

// Add a click listener to an element by id, if present.
function onClick(id, handler) {
  const elm = document.getElementById(id);
  if (elm) elm.addEventListener("click", handler);
}

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light" : "dark";
}
function currentNameLang() {
  return document.documentElement.getAttribute("data-namelang") === "ja"
    ? "ja" : "en";
}

export function init() {
  // ── transport ───────────────────────────────────────────────────
  // analytics init() runs after app.js (module import is deferred), so the
  // app's own click handlers have already flipped DOM state by the time ours
  // reads it — e.g. #play has its post-toggle .playing class.
  const playBtn = document.getElementById("play");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      track(playBtn.classList.contains("playing") ? "play" : "pause");
    });
  }
  onClick("next", () => track("skip_next"));
  onClick("prev", () => track("skip_prev"));

  // ── loop direction ──────────────────────────────────────────────
  onClick("inner", () => track("loop_toggle", { loop: "inner" }));
  onClick("outer", () => track("loop_toggle", { loop: "outer" }));

  // ── appearance / language ───────────────────────────────────────
  // The theme toggle now lives in the info modal as a Dark/Light segmented
  // control; app.js flips data-theme synchronously before this runs.
  const themeSeg = document.getElementById("theme-seg");
  if (themeSeg) {
    themeSeg.querySelectorAll("[data-theme]").forEach((b) =>
      b.addEventListener("click", () =>
        track("theme_toggle", { theme: currentTheme() })));
  }
  const langSeg = document.getElementById("lang-seg");
  if (langSeg) {
    langSeg.querySelectorAll("[data-lang]").forEach((b) =>
      b.addEventListener("click", () =>
        track("lang_toggle", { lang: currentNameLang() })));
  }

  // ── share ───────────────────────────────────────────────────────
  onClick("share", () => track("share_open"));
  onClick("share-copy", () => track("share", { method: "copy" }));
  onClick("share-x", () => track("share", { method: "x" }));
  onClick("share-wa", () => track("share", { method: "whatsapp" }));

  // ── info modal + downloads ──────────────────────────────────────
  onClick("info", () => track("info_open"));
  onClick("download-all", () => track("download_zip"));
  onClick("offline-btn", () => track("offline_download"));

  // Only count the "show all stations" expand, not the collapse.
  const melodyToggle = document.getElementById("melody-toggle");
  if (melodyToggle) {
    melodyToggle.addEventListener("click", () => {
      // app.js flips aria-expanded synchronously before this runs.
      if (melodyToggle.getAttribute("aria-expanded") === "true") {
        track("melody_expand");
      }
    });
  }

  // ── station selection (name tap) ────────────────────────────────
  // Delegate on the ribbon; each station label is a .name div.
  const ribbon = document.getElementById("ribbon");
  if (ribbon) {
    ribbon.addEventListener("click", (e) => {
      const name = e.target.closest(".name");
      if (name && ribbon.contains(name)) {
        track("station_select", { station: name.textContent.trim() });
      }
    });
  }

  // ── track completion (the key metric) ───────────────────────────
  // Powers "tracks listened" (event count) and "most popular station"
  // (grouped by the station property). The player enriches the event
  // detail with the station name + loop direction.
  window.addEventListener("stationComplete", (e) => {
    track("track_complete", {
      station: e.detail && e.detail.station,
      loop: e.detail && e.detail.loop,
    });
  });
}
