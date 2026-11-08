// Click-to-load YouTube embeds: show the thumbnail until the visitor presses play.
document.querySelectorAll(".video[data-yt]").forEach(function (box) {
  var btn = box.querySelector(".video-play");
  if (!btn) return;
  btn.addEventListener("click", function () {
    var f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + box.dataset.yt + "?autoplay=1&rel=0";
    f.title = btn.getAttribute("aria-label") || "YouTube video";
    f.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
    f.allowFullscreen = true;
    box.replaceChildren(f);
  });
});

// Audio players: one <audio> per track, a waveform drawn from precomputed loudness, one track at a time.
(function () {
  var players = Array.prototype.slice.call(document.querySelectorAll(".player[data-src]"));
  if (!players.length) return;
  function fmt(t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ":" + ("0" + (t % 60)).slice(-2); }
  function color(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  players.forEach(function (p) {
    var peaks = p.dataset.peaks.split(",").map(Number);
    var audio = new Audio(); audio.preload = "none"; audio.src = p.dataset.src;
    var btn = p.querySelector(".pp"), wave = p.querySelector(".wave"), cv = wave.querySelector("canvas"), cur = p.querySelector(".cur");
    var zh = (document.documentElement.lang || "").indexOf("zh") === 0;
    var title = btn.dataset.title || "";
    var PLAY = zh ? "播放 " : "Play ", PAUSE = zh ? "暂停 " : "Pause ";
    function draw() {
      var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.round(r.width * d)); cv.height = Math.max(1, Math.round(r.height * d));
      var ctx = cv.getContext("2d"), n = peaks.length, w = cv.width / n, h = cv.height;
      var prog = audio.duration ? audio.currentTime / audio.duration : 0;
      var on = color("--accent"), off = color("--muted");
      ctx.clearRect(0, 0, cv.width, h);
      for (var i = 0; i < n; i++) {
        var bh = Math.max(2 * d, peaks[i] / 100 * h);
        var played = (i + 0.5) / n <= prog;
        ctx.fillStyle = played ? on : off; ctx.globalAlpha = played ? 1 : 0.35;
        ctx.fillRect(i * w + w * 0.18, (h - bh) / 2, w * 0.64, bh);
      }
      ctx.globalAlpha = 1;
    }
    function stopOthers() { players.forEach(function (q) { if (q !== p && q._audio && !q._audio.paused) q._audio.pause(); }); }
    p._audio = audio;
    btn.addEventListener("click", function () {
      if (audio.paused) { stopOthers(); audio.play(); } else { audio.pause(); }
    });
    audio.addEventListener("play", function () { p.classList.add("playing"); btn.setAttribute("aria-label", PAUSE + title); });
    audio.addEventListener("pause", function () { p.classList.remove("playing"); btn.setAttribute("aria-label", PLAY + title); });
    audio.addEventListener("ended", function () { audio.currentTime = 0; draw(); });
    audio.addEventListener("timeupdate", function () { cur.textContent = fmt(audio.currentTime); wave.setAttribute("aria-valuenow", Math.floor(audio.currentTime)); draw(); });
    function seekTo(frac) {
      var go = function () { audio.currentTime = frac * audio.duration; draw(); };
      if (audio.duration) go(); else { audio.addEventListener("loadedmetadata", go, { once: true }); audio.load(); }
    }
    wave.addEventListener("click", function (e) { var r = wave.getBoundingClientRect(); seekTo((e.clientX - r.left) / r.width); });
    wave.addEventListener("keydown", function (e) {
      if (!audio.duration) return;
      if (e.key === "ArrowRight") { audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); e.preventDefault(); }
      if (e.key === "ArrowLeft") { audio.currentTime = Math.max(0, audio.currentTime - 5); e.preventDefault(); }
      draw();
    });
    window.addEventListener("resize", draw);
    if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
    draw();
  });
})();
