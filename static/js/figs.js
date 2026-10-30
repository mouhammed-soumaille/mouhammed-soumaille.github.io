// Interactive figures for research and project entries.
// Usage in data/*.yaml:  figure: "probe" | "tails" | "polytope" | "retrieval"
(function () {
  var root = document.documentElement;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var registry = [];

  // ---------- helpers ----------
  function css(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }
  function rgba(hex, a) {
    var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function canvasIn(stage) {
    var c = el('canvas'); stage.appendChild(c);
    var o = { c: c, ctx: c.getContext('2d'), W: 0, H: 0 };
    o.fit = function () {
      var r = stage.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      o.W = r.width; o.H = r.height;
      c.width = Math.max(1, Math.round(o.W * d)); c.height = Math.max(1, Math.round(o.H * d));
      o.ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    o.fit(); return o;
  }
  // Runs fn(time) every frame while started.
  function loop(fn) {
    var id = null;
    return {
      start: function () { if (id !== null) return; var f = function (t) { id = requestAnimationFrame(f); fn(t); }; id = requestAnimationFrame(f); },
      stop: function () { if (id !== null) { cancelAnimationFrame(id); id = null; } },
      running: function () { return id !== null; }
    };
  }
  // Tween a value from a to b over dur ms, calling step(value).
  function tween(a, b, dur, step, done) {
    if (RM || dur <= 0) { step(b); if (done) done(); return; }
    var t0 = null;
    function f(t) { if (t0 === null) t0 = t; var x = clamp((t - t0) / dur, 0, 1); step(a + (b - a) * ease(x)); if (x < 1) requestAnimationFrame(f); else if (done) done(); }
    requestAnimationFrame(f);
  }
  function label(ctx, text, x, y, color, align, size) {
    ctx.font = (size || 12) + 'px "Hanken Grotesk", system-ui, sans-serif';
    ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
  }

  // ======================================================================
  // 1. Truth probe: negation flips the labels but not the probe's answer
  // ======================================================================
  function probe(fig) {
    var S = canvasIn(fig.stage), r = rng(11), pts = [], neg = false, theta = -0.45;
    var cos = Math.cos(theta), sin = Math.sin(theta);
    for (var i = 0; i < 72; i++) {
      var c = i % 2;                                    // 1 = the pair is correct (e.g. Paris / France)
      var u = (c ? 1 : -1) * 0.42 + gauss(r) * 0.2;    // the feature the probe reads
      var v = (r() - 0.5) * 1.6;
      pts.push({ c: c, pred: u > 0 ? 1 : 0, x: u * cos - v * sin, y: u * sin + v * cos, d: r() * 0.4, fill: c });
    }
    function truth(p) { return neg ? 1 - p.c : p.c; }
    function accuracy() { var k = 0; pts.forEach(function (p) { if (p.pred === truth(p)) k++; }); return k / pts.length; }

    function draw() {
      var ctx = S.ctx, W = S.W, H = S.H, a = css('--accent'), ink = css('--ink'), mu = css('--muted');
      ctx.clearRect(0, 0, W, H);
      var s = fig.thumb ? Math.min(W / 3, H / 2.6) : Math.min(W / 2.8, H / 2.1), cx = W / 2, cy = H / 2;
      // shade the side the probe calls "true"
      var nx = cos, ny = sin, L = 5;
      ctx.beginPath();
      ctx.moveTo(cx + (-ny * L) * s, cy - (nx * L) * s);
      ctx.lineTo(cx + (ny * L) * s, cy - (-nx * L) * s);
      ctx.lineTo(cx + (ny * L + nx * L) * s, cy - (-nx * L + ny * L) * s);
      ctx.lineTo(cx + (-ny * L + nx * L) * s, cy - (nx * L + ny * L) * s);
      ctx.closePath(); ctx.fillStyle = rgba(a, 0.07); ctx.fill();
      // decision boundary
      ctx.beginPath(); ctx.moveTo(cx - ny * 3 * s, cy - nx * 3 * s); ctx.lineTo(cx + ny * 3 * s, cy + nx * 3 * s);
      ctx.strokeStyle = rgba(a, 0.8); ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      if (!fig.thumb) {
        label(ctx, 'probe says true', W - 12, 16, a, 'right');
        label(ctx, 'probe says false', 12, H - 14, mu, 'left');
      }
      // points: filled = actually true, hollow = actually false
      var rad = fig.thumb ? 3.4 : 5;
      pts.forEach(function (p) {
        var X = cx + p.x * s, Y = cy - p.y * s;
        ctx.beginPath(); ctx.arc(X, Y, rad, 0, Math.PI * 2);
        ctx.fillStyle = rgba(a, p.fill); ctx.fill();
        ctx.lineWidth = 1.4; ctx.strokeStyle = p.fill > 0.5 ? a : ink; ctx.stroke();
      });
    }

    function set(n, dur) {
      neg = n;
      var from = pts.map(function (p) { return p.fill; });
      tween(0, 1, dur, function (t) {
        pts.forEach(function (p, i) {
          var local = clamp((t * 1.4 - p.d), 0, 1);       // staggered sweep
          p.fill = from[i] + (truth(p) - from[i]) * local;
        });
        draw();
      });
      if (fig.readout) {
        var start = parseFloat(fig.readout.dataset.v || accuracy() * 100), end = accuracy() * 100;
        fig.readout.dataset.v = end;
        tween(start, end, dur, function (v) { fig.readout.querySelector('b').textContent = Math.round(v) + '%'; });
      }
      if (fig.buttons) fig.buttons.forEach(function (b, i) { b.setAttribute('aria-pressed', String((i === 1) === n)); });
    }

    if (!fig.thumb) {
      var seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Statement type');
      var b1 = el('button', null, 'Paris is in France'), b2 = el('button', null, 'Paris is <em>not</em> in France');
      [b1, b2].forEach(function (b, i) { b.type = 'button'; b.addEventListener('click', function () { set(i === 1, 900); }); seg.appendChild(b); });
      fig.buttons = [b1, b2];
      fig.readout = el('div', 'readout', '<b>' + Math.round(accuracy() * 100) + '%</b> probe accuracy');
      fig.readout.dataset.v = accuracy() * 100;
      fig.bar.appendChild(seg); fig.bar.appendChild(fig.readout);
      fig.caption.innerHTML = '<span class="key"><i class="dot full"></i>true statement <i class="dot"></i>false statement</span> A probe trained on affirmative statements learns which pairs are correct. Adding “not” flips the truth but not the pair, so the probe gets almost everything wrong.';
      set(false, 0);
    }
    return { draw: draw, fit: S.fit, activate: function (on) { set(on, 900); } };
  }

  // ======================================================================
  // 2. Heavy tails: same variance, very different extreme quantiles
  // ======================================================================
  function tails(fig) {
    var S = canvasIn(fig.stage), alpha = fig.thumb ? 0.95 : 0.99;
    function erf(x) { var s = x < 0 ? -1 : 1; x = Math.abs(x); var t = 1 / (1 + 0.3275911 * x);
      var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
    var N = { pdf: function (x) { return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI); }, cdf: function (x) { return 0.5 * (1 + erf(x / Math.SQRT2)); } };
    // Student-t with 3 degrees of freedom, rescaled to variance 1
    var T = { pdf: function (x) { return 2 / (Math.PI * Math.pow(1 + x * x, 2)); }, cdf: function (x) { return 0.5 + (x / (1 + x * x) + Math.atan(x)) / Math.PI; } };
    function quant(D, p) { var lo = -60, hi = 60; for (var i = 0; i < 80; i++) { var m = (lo + hi) / 2; if (D.cdf(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }

    function draw() {
      var ctx = S.ctx, W = S.W, H = S.H, a = css('--accent'), mu = css('--muted'), rule = css('--rule');
      ctx.clearRect(0, 0, W, H);
      var pad = fig.thumb ? 10 : 28, x0 = -3.5, x1 = 7, y1 = 0.68;
      var X = function (x) { return pad + (x - x0) / (x1 - x0) * (W - 2 * pad); };
      var Y = function (y) { return H - pad - y / y1 * (H - 2 * pad - (fig.thumb ? 4 : 18)); };
      var qn = quant(N, alpha), qt = quant(T, alpha);
      // axis
      ctx.strokeStyle = rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, Y(0)); ctx.lineTo(W - pad, Y(0)); ctx.stroke();
      if (!fig.thumb) for (var k = -2; k <= 6; k += 2) label(ctx, String(k), X(k), Y(0) + 13, mu, 'center', 11);
      function curve(D, color, width, fillFrom, fillColor) {
        if (fillFrom != null) {
          ctx.beginPath(); ctx.moveTo(X(fillFrom), Y(0));
          for (var x = fillFrom; x <= x1; x += 0.02) ctx.lineTo(X(x), Y(D.pdf(x)));
          ctx.lineTo(X(x1), Y(0)); ctx.closePath(); ctx.fillStyle = fillColor; ctx.fill();
        }
        ctx.beginPath();
        for (var x2 = x0; x2 <= x1; x2 += 0.02) { var px = X(x2), py = Y(D.pdf(x2)); if (x2 === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
      }
      curve(N, mu, 1.5, qn, rgba(mu, 0.18));
      curve(T, a, 2, qt, rgba(a, 0.22));
      // quantile markers, with a magnified view of the tail so the shaded areas are visible
      function marker(q, color, text, row) {
        ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(X(q), Y(0)); ctx.lineTo(X(q), pad + (fig.thumb ? 2 : 12 + row * 16)); ctx.stroke(); ctx.setLineDash([]);
        if (!fig.thumb) { var right = X(q) > W - 120; label(ctx, text + ' ' + q.toFixed(2), X(q) + (right ? -6 : 6), pad + 12 + row * 16, color, right ? 'right' : 'left', 12); }
      }
      marker(qn, mu, 'Gaussian', 1); marker(qt, a, 'Heavy-tailed', 0);
    }

    function setAlpha(v) {
      alpha = v; draw();
      if (fig.readout) {
        var qn = quant(N, alpha), qt = quant(T, alpha);
        fig.readout.innerHTML = 'At <b>' + (alpha * 100).toFixed(alpha > 0.995 ? 1 : 1) + '%</b>, the heavy-tailed quantile is <b>' + (qt / qn).toFixed(2) + '×</b> the Gaussian one';
      }
    }
    // slider position s in [0,1] maps to alpha in [0.9, 0.999] on a log scale
    function sToAlpha(s) { return 1 - 0.1 * Math.pow(10, -2 * s); }
    function alphaToS(al) { return -Math.log10((1 - al) / 0.1) / 2; }

    if (!fig.thumb) {
      var wrap = el('label', 'slider'), input = el('input');
      input.type = 'range'; input.min = 0; input.max = 1000; input.value = Math.round(alphaToS(alpha) * 1000);
      input.setAttribute('aria-label', 'Confidence level');
      wrap.appendChild(el('span', null, 'Confidence level')); wrap.appendChild(input);
      input.addEventListener('input', function () { setAlpha(sToAlpha(input.value / 1000)); });
      fig.readout = el('div', 'readout');
      fig.bar.appendChild(wrap); fig.bar.appendChild(fig.readout);
      fig.caption.innerHTML = '<span class="key"><i class="ln accent"></i>heavy-tailed (Student-t, 3 d.o.f.) <i class="ln"></i>Gaussian</span> Both have variance 1. Near the middle they look alike, but as the confidence level rises the heavy-tailed quantile runs away: extreme losses are far larger than a Gaussian model predicts.';
    }
    setAlpha(alpha);
    return {
      draw: draw, fit: S.fit,
      activate: function (on) { tween(alphaToS(alpha), on ? 1 : alphaToS(0.95), 1100, function (s) { setAlpha(sToAlpha(s)); }); }
    };
  }

  // ======================================================================
  // 3. Three-qubit entanglement polytope (Higuchi, Sudbery & Szulc 2003)
  // ======================================================================
  function polytope(fig) {
    var S = canvasIn(fig.stage), yaw = -0.75, pitch = 0.42, dragging = false, last = null, auto = loop(function () { yaw += 0.004; draw(); });
    var h = 0.5;
    var P = { O: [0, 0, 0], A: [h, h, 0], B: [h, 0, h], C: [0, h, h], D: [h, h, h] };
    var faces = [['O', 'A', 'B'], ['O', 'B', 'C'], ['O', 'C', 'A'], ['D', 'A', 'B'], ['D', 'B', 'C'], ['D', 'C', 'A']];
    var cube = [[0,0,0],[h,0,0],[h,h,0],[0,h,0],[0,0,h],[h,0,h],[h,h,h],[0,h,h]];
    var cubeEdges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    var marks = [{ p: [0, 0, 0], t: 'product' }, { p: [1/3, 1/3, 1/3], t: 'W' }, { p: [h, h, h], t: 'GHZ' }];

    function proj(v) {
      var x = v[0] - 0.25, y = v[2] - 0.25, z = v[1] - 0.25;          // λ3 points up
      var cx = Math.cos(yaw), sx = Math.sin(yaw), x1 = x * cx - z * sx, z1 = x * sx + z * cx;
      var cp = Math.cos(pitch), sp = Math.sin(pitch), y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var s = Math.min(S.W, S.H) * (fig.thumb ? 1.05 : 0.98);
      return { x: S.W / 2 + x1 * s, y: S.H / 2 - y1 * s, z: z2 };
    }

    function draw() {
      var ctx = S.ctx, a = css('--accent'), mu = css('--muted'), ink = css('--ink'), rule = css('--rule');
      ctx.clearRect(0, 0, S.W, S.H);
      // reference cube [0, 1/2]^3
      ctx.strokeStyle = rule; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      cubeEdges.forEach(function (e) { var p = proj(cube[e[0]]), q = proj(cube[e[1]]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); });
      ctx.setLineDash([]);
      if (!fig.thumb) {
        var ax = [[[0.62, 0, 0], 'λ₁'], [[0, 0.62, 0], 'λ₂'], [[0, 0, 0.62], 'λ₃']];
        ax.forEach(function (t) { var p = proj(t[0]); label(ctx, t[1], p.x, p.y, mu, 'center', 13); });
      }
      // faces, back to front
      var F = faces.map(function (f) { var q = f.map(function (k) { return proj(P[k]); }); return { q: q, z: (q[0].z + q[1].z + q[2].z) / 3 }; });
      F.sort(function (u, v) { return u.z - v.z; });
      F.forEach(function (f, i) {
        ctx.beginPath(); ctx.moveTo(f.q[0].x, f.q[0].y); ctx.lineTo(f.q[1].x, f.q[1].y); ctx.lineTo(f.q[2].x, f.q[2].y); ctx.closePath();
        ctx.fillStyle = rgba(a, 0.06 + 0.035 * i); ctx.fill();
        ctx.strokeStyle = rgba(a, 0.9); ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.stroke();
      });
      marks.forEach(function (m) {
        var p = proj(m.p); ctx.beginPath(); ctx.arc(p.x, p.y, fig.thumb ? 3 : 4.5, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill();
        if (!fig.thumb) label(ctx, m.t, p.x + 9, p.y - 2, ink, 'left', 12);
      });
    }

    function down(e) { dragging = true; last = [e.clientX, e.clientY]; auto.stop(); fig.stage.setPointerCapture(e.pointerId); }
    function move(e) { if (!dragging) return; yaw += (e.clientX - last[0]) * 0.01; pitch = clamp(pitch + (e.clientY - last[1]) * 0.006, -1.2, 1.2); last = [e.clientX, e.clientY]; draw(); }
    function up() { dragging = false; }
    if (!fig.thumb) {
      fig.stage.classList.add('draggable');
      fig.stage.addEventListener('pointerdown', down); fig.stage.addEventListener('pointermove', move);
      fig.stage.addEventListener('pointerup', up); fig.stage.addEventListener('pointercancel', up);
      var reset = el('button', 'chip', 'Reset view'); reset.type = 'button';
      reset.addEventListener('click', function () { tween(yaw, -0.75, 500, function (v) { yaw = v; draw(); }); tween(pitch, 0.42, 500, function (v) { pitch = v; draw(); }); });
      fig.bar.appendChild(el('div', 'readout', 'Drag the figure to rotate it'));
      fig.bar.appendChild(reset);
      fig.caption.innerHTML = 'Which smallest local eigenvalues (λ₁, λ₂, λ₃) a pure three-qubit state can have: a bipyramid inside the cube [0, ½]³ (Higuchi, Sudbery &amp; Szulc, 2003). Product states sit at the origin, the W state on the middle triangle, and GHZ at the opposite corner (½, ½, ½).';
    }
    draw();
    return {
      draw: draw, fit: S.fit,
      visible: function (on) { if (fig.thumb || RM) return; if (on && !dragging) auto.start(); else auto.stop(); },
      activate: function (on) { if (RM) return; if (on) auto.start(); else auto.stop(); }
    };
  }

  // ======================================================================
  // 4. Retrieval: nearest neighbours in an embedding space
  // ======================================================================
  function retrieval(fig) {
    var S = canvasIn(fig.stage), r = rng(5), pts = [], q = { x: 0.1, y: 0.05 }, inside = false, t0 = null;
    var centers = [[-0.55, 0.45], [0.5, 0.5], [-0.4, -0.5], [0.55, -0.35]];
    for (var i = 0; i < 96; i++) { var c = centers[i % 4]; pts.push({ x: c[0] + gauss(r) * 0.17, y: c[1] + gauss(r) * 0.15 }); }
    var orbit = loop(function (t) { if (t0 === null) t0 = t; var u = (t - t0) / 1000; q.x = Math.cos(u * 0.6) * 0.55; q.y = Math.sin(u * 0.9) * 0.45; draw(); });

    function toScreen(p) { var s = Math.min(S.W / 2.5, S.H / 2.3); return { x: S.W / 2 + p.x * s, y: S.H / 2 - p.y * s, s: s }; }
    function draw() {
      var ctx = S.ctx, a = css('--accent'), mu = css('--muted'), ink = css('--ink');
      ctx.clearRect(0, 0, S.W, S.H);
      var near = pts.map(function (p, i) { return { i: i, d: (p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y) }; })
        .sort(function (u, v) { return u.d - v.d; }).slice(0, 5).map(function (o) { return o.i; });
      var Q = toScreen(q);
      ctx.strokeStyle = rgba(a, 0.45); ctx.lineWidth = 1.2;
      near.forEach(function (i) { var P = toScreen(pts[i]); ctx.beginPath(); ctx.moveTo(Q.x, Q.y); ctx.lineTo(P.x, P.y); ctx.stroke(); });
      pts.forEach(function (p, i) {
        var P = toScreen(p), hit = near.indexOf(i) >= 0;
        ctx.beginPath(); ctx.arc(P.x, P.y, hit ? (fig.thumb ? 3.5 : 5) : (fig.thumb ? 2 : 2.8), 0, Math.PI * 2);
        ctx.fillStyle = hit ? a : rgba(mu, 0.55); ctx.fill();
      });
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(Q.x, Q.y, fig.thumb ? 5 : 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Q.x - 3, Q.y); ctx.lineTo(Q.x + 3, Q.y); ctx.moveTo(Q.x, Q.y - 3); ctx.lineTo(Q.x, Q.y + 3); ctx.stroke();
      if (!fig.thumb) label(ctx, 'query', Q.x + 12, Q.y - 10, ink, 'left', 12);
    }
    if (!fig.thumb) {
      fig.stage.addEventListener('pointermove', function (e) {
        var rc = fig.stage.getBoundingClientRect(), s = toScreen({ x: 0, y: 0 }).s;
        inside = true; orbit.stop();
        q.x = (e.clientX - rc.left - S.W / 2) / s; q.y = -(e.clientY - rc.top - S.H / 2) / s; draw();
      });
      fig.stage.addEventListener('pointerleave', function () { inside = false; });
      fig.bar.appendChild(el('div', 'readout', 'Move your pointer over the figure to search'));
      fig.caption.innerHTML = 'Each dot is a garment embedded by CLIP; similar items land close together. A search returns the five nearest neighbours of the query image.';
    }
    draw();
    return {
      draw: draw, fit: S.fit,
      visible: function (on) { if (fig.thumb || RM) return; if (on && !inside) orbit.start(); else orbit.stop(); },
      activate: function (on) { if (RM) return; if (on) orbit.start(); else orbit.stop(); }
    };
  }

  // ======================================================================
  // Wiring
  // ======================================================================
  var KINDS = { probe: probe, tails: tails, polytope: polytope, retrieval: retrieval };

  function build(node) {
    var kind = node.getAttribute('data-fig'), make = KINDS[kind]; if (!make) return;
    var fig = { node: node, thumb: node.hasAttribute('data-thumb') };
    fig.stage = node.querySelector('.fig-stage') || node.appendChild(el('div', 'fig-stage'));
    if (!fig.thumb) {
      fig.bar = node.appendChild(el('div', 'fig-bar'));
      fig.caption = node.appendChild(el('figcaption'));
    }
    var api = make(fig); api.fig = fig; registry.push(api);
    if (window.ResizeObserver) new ResizeObserver(function () { api.fit(); api.draw(); }).observe(fig.stage);
    if (api.visible && window.IntersectionObserver)
      new IntersectionObserver(function (es) { es.forEach(function (e) { api.visible(e.isIntersecting); }); }, { threshold: 0.2 }).observe(node);
    if (fig.thumb && api.activate) {
      var tile = node.closest('.tile') || node;
      tile.addEventListener('pointerenter', function () { api.activate(true); });
      tile.addEventListener('pointerleave', function () { api.activate(false); });
      tile.addEventListener('focusin', function () { api.activate(true); });
      tile.addEventListener('focusout', function () { api.activate(false); });
    }
  }

  document.querySelectorAll('[data-fig]').forEach(build);
  window.addEventListener('themechange', function () { registry.forEach(function (f) { f.draw(); }); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { registry.forEach(function (f) { f.draw(); }); });
})();
