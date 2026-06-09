/* ───────────────────────────────────────────────────────────
   Station artwork for the Media Session API.

   Renders the Yamanote JY station-number sign — a JR-green rounded
   square framing a dark inner panel with "JY" over the line number —
   onto a square canvas, for use as lock-screen / control-centre
   album art. Mirrors the in-app .badge styling (css/styles.css):
     · green frame  rgb(40,163,81), 8px radius on a 96px box
     · dark inner   rgb(25,25,23), inset 8px, 4px radius
     · white text   "JY" (22px) over the number (46px), Space Grotesk
   Results are cached per JY number; pass {force:true} to rebuild
   (e.g. after the web font finishes loading).
   ─────────────────────────────────────────────────────────── */
(function () {
  const BG    = "rgb(25, 25, 23)";
  const GREEN = "rgb(40, 163, 81)";
  const WHITE = "#fff";
  const cache = new Map();   // jy → object URL

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
  }

  // Draw the badge onto a square canvas of side `S`. Ratios are taken
  // straight from the 96px in-app badge so the proportions match.
  function paint(canvas, jy, S) {
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.height = S;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, S, S);

    const B  = S * 0.70;                 // green box
    const bx = (S - B) / 2, by = (S - B) / 2;
    roundRect(ctx, bx, by, B, B, B * (8 / 96));
    ctx.fillStyle = GREEN;
    ctx.fill();

    const inset = B * (8 / 96);
    const ix = bx + inset, iy = by + inset, iB = B - inset * 2;
    roundRect(ctx, ix, iy, iB, iB, B * (4 / 96));
    ctx.fillStyle = BG;
    ctx.fill();

    const cx = S / 2, cy = S / 2;
    const jySize  = B * (22 / 96);
    const numSize = B * (46 / 96);

    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // "JY" sits above centre, the number below — matching the stacked,
    // centred flex column of the live badge.
    ctx.font = '500 ' + numSize + 'px "Space Grotesk", sans-serif';
    if ("letterSpacing" in ctx) ctx.letterSpacing = (numSize * -0.02) + "px";
    ctx.fillText(jy, cx, cy + numSize * 0.36);

    ctx.font = '500 ' + jySize + 'px "Space Grotesk", sans-serif';
    if ("letterSpacing" in ctx) ctx.letterSpacing = (jySize * 0.02) + "px";
    ctx.fillText("JY", cx, cy - numSize * 0.40);

    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }

  // Public: return an object-URL for the artwork of station `jy`.
  // Cached unless {force:true}. Falls back to a data URL if the browser
  // can't produce a blob synchronously.
  window.makeStationArtwork = function (jy, opts) {
    opts = opts || {};
    if (!opts.force && cache.has(jy)) return cache.get(jy);

    const S = opts.size || 512;
    const canvas = document.createElement("canvas");
    paint(canvas, jy, S);

    const url = canvas.toDataURL("image/png");
    if (cache.has(jy)) cache.set(jy, url);     // keep map fresh on force
    else cache.set(jy, url);
    return url;
  };

  // Expose the painter for a live <canvas> (used by the test harness).
  window.paintStationArtwork = paint;
})();
