// Draws a synthetic log-mel spectrogram (128 mel bands, up to 8 kHz) that scrolls slowly.
// Pure decoration: a melody with harmonics, a pad, kick and hi-hat, coloured with a magma-like map.
(function () {
  var BINS = 128, FMAX = 8000;
  var MELMAX = 2595 * Math.log10(1 + FMAX / 700);
  function bin(f) { return Math.round(2595 * Math.log10(1 + f / 700) / MELMAX * (BINS - 1)); }

  var stops = [[0, 0, 0, 4], [0.18, 28, 16, 68], [0.38, 99, 26, 128], [0.58, 183, 55, 121], [0.76, 241, 96, 93], [0.9, 254, 175, 119], [1, 252, 253, 191]];
  var lut = [];
  for (var i = 0; i < 256; i++) {
    var t = i / 255, k = 1;
    while (k < stops.length - 1 && stops[k][0] < t) k++;
    var a = stops[k - 1], b = stops[k], u = (t - a[0]) / (b[0] - a[0]);
    lut.push([a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u]);
  }

  // A minor pentatonic around A3–A5
  var scale = [220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784];
  var chords = [[110, 164.8, 220], [87.3, 130.8, 174.6], [130.8, 196, 261.6], [98, 146.8, 196]];
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  function Synth() { this.t = 0; this.note = scale[4]; this.prev = this.note; }
  Synth.prototype.column = function () {
    var t = this.t++, col = new Float32Array(BINS), j, k;
    if (t % 12 === 0) { this.prev = this.note; this.note = scale[Math.floor(rnd() * scale.length)]; }
    var glide = Math.min(1, (t % 12) / 3);
    var f0 = (this.prev + (this.note - this.prev) * glide) * (1 + 0.012 * Math.sin(t / 2.3));
    for (j = 0; j < BINS; j++) col[j] = 0.12 + 0.07 * rnd() + 0.05 * (1 - j / BINS);
    // melody with harmonics
    var env = 0.55 + 0.45 * Math.exp(-(t % 12) / 5);
    for (k = 1; k <= 9; k++) {
      var b = bin(f0 * k); if (b >= BINS) break;
      var amp = env * Math.pow(0.78, k - 1);
      col[b] += amp; if (b + 1 < BINS) col[b + 1] += amp * 0.35; if (b > 0) col[b - 1] += amp * 0.35;
    }
    // pad chord
    var ch = chords[Math.floor(t / 96) % chords.length];
    for (k = 0; k < ch.length; k++) for (var h = 1; h <= 4; h++) {
      var bb = bin(ch[k] * h); if (bb < BINS) col[bb] += 0.28 * Math.pow(0.7, h - 1);
    }
    // kick on the beat, hi-hat off the beat
    var ph = t % 24, kick = Math.exp(-ph / 2.5);
    for (j = 0; j < 14; j++) col[j] += 0.7 * kick * (1 - j / 14);
    var hp = (t + 12) % 24, hat = hp < 3 ? Math.exp(-hp / 1.2) : 0;
    for (j = 80; j < BINS; j++) col[j] += 0.32 * hat * (0.6 + 0.4 * rnd());
    if (ph === 0) for (j = 0; j < BINS; j++) col[j] += 0.12;
    return col;
  };

  function mount(canvas) {
    var off = document.createElement("canvas"), W = 320;
    off.width = W; off.height = BINS;
    var octx = off.getContext("2d"), ctx = canvas.getContext("2d");
    var synth = new Synth(), img = octx.createImageData(1, BINS);
    function push() {
      var c = synth.column();
      for (var j = 0; j < BINS; j++) {
        var v = Math.max(0, Math.min(1, Math.log1p(c[j] * 4) / Math.log1p(4.2)));
        var rgb = lut[Math.round(v * 255)], p = (BINS - 1 - j) * 4;
        img.data[p] = rgb[0]; img.data[p + 1] = rgb[1]; img.data[p + 2] = rgb[2]; img.data[p + 3] = 255;
      }
      octx.drawImage(off, -1, 0);
      octx.putImageData(img, W - 1, 0);
    }
    function size() {
      var r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * d)); canvas.height = Math.max(1, Math.round(r.height * d));
      draw();
    }
    function draw() { ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, canvas.width, canvas.height); }
    for (var i = 0; i < W; i++) push();
    size();
    window.addEventListener("resize", size);
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) return;
    var last = 0;
    function tick(ts) {
      if (!document.hidden && ts - last > 70) { last = ts; push(); draw(); }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var els = document.querySelectorAll("canvas.spectro");
  for (var n = 0; n < els.length; n++) mount(els[n]);
})();
