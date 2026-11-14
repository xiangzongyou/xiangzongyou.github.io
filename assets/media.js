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
  // One volume control for all tracks, remembered in this browser. Hidden where the browser ignores volume (iPhone/iPad).
  var zhPage = (document.documentElement.lang || "").indexOf("zh") === 0;
  var level = 0.8, muted = false;
  try { var saved = parseFloat(localStorage.getItem("trackVolume")); if (saved >= 0 && saved <= 1) level = saved; } catch (e) {}
  var probe = new Audio(); probe.volume = 0.5;
  var canSetVolume = Math.abs(probe.volume - 0.5) < 0.01;
  function applyVolume() { players.forEach(function (q) { if (q._audio) { q._audio.volume = level; q._audio.muted = muted || level === 0; } }); }
  if (canSetVolume) {
    var box = document.createElement("div"); box.className = "vol";
    var mute = document.createElement("button"); mute.type = "button"; mute.className = "vol-btn";
    mute.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="vol-wave" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="vol-x" d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    var range = document.createElement("input"); range.type = "range"; range.min = 0; range.max = 100; range.step = 1;
    range.setAttribute("aria-label", zhPage ? "音量" : "Volume");
    var syncUI = function () {
      range.value = Math.round(level * 100);
      var off = muted || level === 0;
      box.classList.toggle("is-muted", off);
      mute.setAttribute("aria-label", off ? (zhPage ? "取消静音" : "Unmute") : (zhPage ? "静音" : "Mute"));
      range.style.setProperty("--fill", (off ? 0 : level * 100) + "%");
    };
    range.addEventListener("input", function () {
      level = range.value / 100; muted = false; applyVolume(); syncUI();
      try { localStorage.setItem("trackVolume", String(level)); } catch (e) {}
    });
    mute.addEventListener("click", function () {
      if (level === 0) { level = 0.8; muted = false; } else { muted = !muted; }
      applyVolume(); syncUI();
    });
    box.appendChild(mute); box.appendChild(range);
    var list = players[0].parentNode; list.parentNode.insertBefore(box, list);
    syncUI();
  }

  players.forEach(function (p) {
    var peaks = p.dataset.peaks.split(",").map(Number);
    var audio = p.querySelector("audio.native") || new Audio();
    audio.preload = "none"; if (!audio.getAttribute("src")) audio.src = p.dataset.src;
    audio.removeAttribute("controls");
    p.classList.add("enhanced");
    var btn = p.querySelector(".pp"), wave = p.querySelector(".wave"), cv = wave.querySelector("canvas"), cur = p.querySelector(".cur");
    var zh = (document.documentElement.lang || "").indexOf("zh") === 0;
    var title = btn.dataset.title || (btn.getAttribute("aria-label") || "").replace(/^(Play|播放)\s*/, "");
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
    audio.volume = level; audio.muted = muted || level === 0;
    btn.addEventListener("click", function () {
      if (audio.paused) { stopOthers(); audio.play(); } else { audio.pause(); }
    });
    audio.addEventListener("play", function () { p.classList.add("playing"); btn.setAttribute("aria-label", PAUSE + title); });
    audio.addEventListener("pause", function () {
      p.classList.remove("playing"); btn.setAttribute("aria-label", PLAY + title);
      // pausing or switching tracks rewinds, so the next play starts from the beginning
      try { audio.currentTime = 0; } catch (e) {}
      cur.textContent = fmt(0); wave.setAttribute("aria-valuenow", 0); draw();
    });
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
