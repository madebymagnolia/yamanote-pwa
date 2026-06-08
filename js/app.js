/* ───────────────────────────────────────────────────────────
   Yamanote Line player — role-based layout engine
   The current station BLOCK (JY box + name) is centred in the band
   between the loop toggle and the play controls. The previous name
   is centred in the space above the block; the next name in the
   space below it. Only previous · current · next are visible — every
   other station is faded out. Each station animates to the position
   for its role (offset from current); the loop wraps via modular
   offset, so no copies or re-centring are needed.
   ─────────────────────────────────────────────────────────── */
(function () {
  const S = window.YAMANOTE_STATIONS;
  const N = S.length;                 // 30
  const DUR_MS = 620;                 // keep in sync with --dur

  const BOX  = 96;                    // JY number box — ALWAYS 96×96, never scales
  const GAP  = 16;                    // box ↔ name gap
  const NAME = 36;                    // active name line height
  const BLOCK = BOX + GAP + NAME;     // current block height = 148

  const ribbon   = document.getElementById("ribbon");
  const stage    = document.getElementById("stage");
  const playBtn  = document.getElementById("play");
  const innerBtn = document.getElementById("inner");
  const outerBtn = document.getElementById("outer");

  let currentIndex = 30;              // open on Tokyo (JY01 → array index 01)
  let direction = +1;                 // inner loop ascends; outer descends
  let playing = false;
  let spineOffset = 0;                // accumulated dotted-line scroll

  // computed in measure()
  let nameCenter = 0, prevCenter = 0, nextCenter = 0;
  let upGap = 0, downGap = 0;
  let dotPeriod = 10, lineStep = 120;

  /* build the station elements (one copy — looping is modular) ------------- */
  const items = [];
  let spine;
  function build() {
    ribbon.innerHTML = "";

    spine = document.createElement("div");
    spine.className = "spine";
    ribbon.appendChild(spine);

    for (let i = 0; i < N; i++) {
      const st = S[i];
      const el = document.createElement("div");
      el.className = "station";

      const eraser = document.createElement("div");
      eraser.className = "eraser";

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.innerHTML =
        '<div class="inner"><span class="jy">JY</span>' +
        '<span class="num">' + st.jy + '</span></div>';

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = st.name;
      name.addEventListener("click", () => jumpTo(i));

      el.appendChild(eraser);
      el.appendChild(badge);
      el.appendChild(name);
      ribbon.appendChild(el);
      items[i] = el;
    }
  }

  /* layout maths ----------------------------------------------------------- */
  function measure() {
    const toggleEl = document.querySelector(".toggle");
    const ctrlEl   = document.querySelector(".controls");
    // Use layout geometry (offsetTop/offsetHeight), NOT getBoundingClientRect:
    // during boot the toggle and controls are parked off-screen by CSS
    // transforms, and rect-based measurement would read those transformed
    // positions — placing prev/next behind the chrome. offset* ignores
    // transforms, so the band is always measured against the resting layout.
    const T = toggleEl.offsetTop + toggleEl.offsetHeight;  // band top (below toggle)
    const C = ctrlEl.offsetTop;                            // band bottom (above controls)
    const mid = (T + C) / 2;
    dotPeriod = 10;

    // Role-based spacing: the current block (JY box + name) is centred in the
    // band. The previous name is centred in the space above the block (between
    // the toggle and the box); the next name is centred in the space below it
    // (between the current name and the controls).
    const blockTop    = mid - BLOCK / 2;
    const blockBottom = mid + BLOCK / 2;
    nameCenter = blockBottom - NAME / 2;            // current name = block bottom
    prevCenter = (T + blockTop) / 2;                // centred above the block
    nextCenter = (blockBottom + C) / 2;             // centred below the block
    upGap   = nameCenter - prevCenter;
    downGap = nextCenter - nameCenter;

    // the dotted line scrolls by the average name travel so it moves with them
    lineStep = Math.max(dotPeriod,
               Math.round(((upGap + downGap) / 2) / dotPeriod) * dotPeriod);

    document.documentElement.style.setProperty("--badge", BOX + "px");
    document.documentElement.style.setProperty("--dot", dotPeriod + "px");

    if (spine) {
      spine.style.top = "-3500px";
      spine.style.height = (stage.clientHeight + 7000) + "px";
    }
  }

  // signed nearest offset of station i from the current one (handles the loop)
  function offsetOf(i) {
    let m = ((i - currentIndex) % N + N) % N;       // 0 … N-1
    if (m > N / 2) m -= N;                           // → −N/2 … N/2
    return m;
  }

  function targetY(k) {
    if (k === 0) return nameCenter;
    return k < 0 ? nameCenter + k * upGap : nameCenter + k * downGap;
  }

  function layout(animate) {
    if (!animate) ribbon.classList.add("no-anim");
    for (let i = 0; i < N; i++) {
      const k = offsetOf(i);
      const el = items[i];
      const visible = Math.abs(k) <= 1;
      el.style.transform = "translateY(" + targetY(k) + "px)";
      el.style.opacity = visible ? "1" : "0";
      el.classList.toggle("active", k === 0);
      el.classList.toggle("far", !visible);
    }
    if (!animate) {
      void ribbon.offsetHeight;
      ribbon.classList.remove("no-anim");
    }
  }

  /* navigation ------------------------------------------------------------- */
  // No lock: presses are never dropped. CSS transitions are interruptible, so
  // tapping five times quickly re-targets the layout five stations along and
  // the names ease straight to the final position — it feels instant.
  function step(delta) {
    if (delta === 0) return;
    currentIndex = ((currentIndex + delta) % N + N) % N;
    layout(true);

    // scroll the dotted line so the dots visibly travel with the names. The
    // offset accumulates across rapid presses; lineStep is a whole number of
    // dots, so the eventual reset to 0 is invisible on the uniform line. We
    // only reset once motion has settled (debounced after the last press).
    const dir = delta > 0 ? 1 : -1;
    spineOffset += -dir * lineStep;
    spine.style.transform = "translateY(" + spineOffset + "px)";

    window.clearTimeout(step._t);
    step._t = window.setTimeout(() => {
      spine.classList.add("no-anim");
      spineOffset = 0;
      spine.style.transform = "translateY(0)";
      void spine.offsetHeight;
      spine.classList.remove("no-anim");
    }, DUR_MS + 60);
  }

  function jumpTo(i) {
    step(offsetOf(i));
    syncAudio(true);
  }

  /* ───────────────────────────────────────────────────────────────────────
     audio transport — the inner-loop playlist behaves like a repeating
     Spotify playlist. The "playlist" is the set of stations that have an
     audio file, walked in the current loop direction (inner ascends, outer
     descends). With every station scored it degrades to a plain ±1 step.
       · next ............ skip to the next station that has audio, play it
       · prev (>3s in) ... restart the current track
       · prev (≤3s in) ... skip to the previous station that has audio
       · track ends ...... auto-advance to the next track (loops forever)
     currentIndex is the single source of truth; audio always reflects it.
     ─────────────────────────────────────────────────────────────────────── */
  const audio = new Audio();
  audio.preload = "auto";
  const PREV_RESTART_S = 3;

  const normIdx = (i) => ((i % N) + N) % N;
  // Each station can carry a track per loop: audio: { inner, outer }. The
  // active playlist follows the current loop direction, so the same station
  // plays a different recording on the inner vs. outer loop.
  const loopKey = () => (direction === +1 ? "inner" : "outer");
  const srcFor  = (i) => {
    const a = S[normIdx(i)].audio;
    return (a && a[loopKey()]) || null;
  };
  const cacheKey = (i) => loopKey() + ":" + normIdx(i);

  // Scan from the current station in `dir` for the nearest station that has a
  // track on the ACTIVE loop.
  function scanAudio(dir) {
    for (let s = 1; s <= N; s++) {
      const i = normIdx(currentIndex + dir * s);
      if (srcFor(i)) return { dist: s };
    }
    return null;
  }

  // Point the <audio> at the current station. `restart` rewinds to 0. If the
  // user intends playback (`playing`) and the station has a track, it plays;
  // a silent station just goes quiet while the play intent is preserved.
  function syncAudio(restart) {
    const src = srcFor(currentIndex);
    if (!src) {
      audio.pause();
      audio.removeAttribute("src");
      audio.removeAttribute("data-key");
      return;
    }
    if (audio.getAttribute("data-key") !== cacheKey(currentIndex)) {
      audio.src = src;
      audio.setAttribute("data-key", cacheKey(currentIndex));
      audio.currentTime = 0;
    } else if (restart) {
      audio.currentTime = 0;
    }
    if (playing) audio.play().catch(() => {});
  }

  // Move the ribbon by `delta` stations, then resync audio from the start.
  function gotoTrack(delta) {
    step(delta);
    syncAudio(true);
  }

  function transportNext() {
    const r = scanAudio(direction);
    if (r) gotoTrack(direction * r.dist);
  }

  function transportPrev() {
    // Past the restart threshold, "previous" rewinds the current track.
    if (srcFor(currentIndex) && audio.currentTime > PREV_RESTART_S) {
      audio.currentTime = 0;
      if (playing) audio.play().catch(() => {});
      return;
    }
    const r = scanAudio(-direction);
    if (r) gotoTrack(-direction * r.dist);
  }

  audio.addEventListener("ended", transportNext);

  /* loop direction --------------------------------------------------------- */
  function setLoop(isInner) {
    const changed = direction !== (isInner ? +1 : -1);
    direction = isInner ? +1 : -1;
    innerBtn.classList.toggle("on", isInner);
    outerBtn.classList.toggle("on", !isInner);
    // Switching loops swaps to the other playlist's recording for this
    // station and starts it from the top. syncAudio only calls play() when
    // `playing` is set, so a playing deck autostarts the new track while a
    // paused deck just arms it silently — matching the current transport state.
    if (changed) syncAudio(true);
  }

  /* play / pause ----------------------------------------------------------- */
  function togglePlay() {
    playing = !playing;
    playBtn.classList.toggle("playing", playing);
    if (playing) syncAudio(false);   // resume current track (or start it)
    else audio.pause();
  }

  /* wire up ---------------------------------------------------------------- */
  document.getElementById("prev").addEventListener("click", transportPrev);
  document.getElementById("next").addEventListener("click", transportNext);
  playBtn.addEventListener("click", togglePlay);
  innerBtn.addEventListener("click", () => setLoop(true));
  outerBtn.addEventListener("click", () => setLoop(false));

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); transportNext(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); transportPrev(); }
    else if (e.key === " ") { e.preventDefault(); togglePlay(); }
  });

  // swipe to scrub — manual one-station browse that keeps audio in sync
  let touchY = null;
  stage.addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (touchY === null) return;
    const dy = e.changedTouches[0].clientY - touchY;
    // Move stations in the direction of the swipe regardless of loop mode:
    // swipe up pulls the next station up into place, swipe down the previous.
    if (Math.abs(dy) > 44) { step(dy < 0 ? +1 : -1); syncAudio(true); }
    touchY = null;
  }, { passive: true });

  let rt;
  window.addEventListener("resize", () => {
    window.clearTimeout(rt);
    rt = window.setTimeout(() => { measure(); layout(false); }, 120);
  });

  // Re-measure once iOS settles the new viewport after an orientation change.
  window.addEventListener("orientationchange", () => {
    window.setTimeout(() => { measure(); layout(false); }, 250);
  });

  /* boot ------------------------------------------------------------------- */
  // Reveal once: drops the .booting class so the ribbon fades in while the
  // toggle slides down from above and the controls slide up from below — all
  // together. We wait for the final (post-font) layout to be painted hidden,
  // then flip on the next frame so the entrance transition actually fires.
  let revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.body.classList.remove("booting"));
    });
  }

  build();
  measure();
  layout(false);
  setLoop(true);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { measure(); layout(false); reveal(); });
  }
  // Fallback: never leave the UI parked off-screen if fonts stall.
  window.setTimeout(reveal, 1500);
})();
