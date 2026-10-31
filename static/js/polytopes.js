// Entanglement polytopes for three qubits: four interactive demos for the Lab page.
// They follow my notes "Computing Polytopes" (Algorithms 1-8), specialised to three qubits,
// where every polytope is known exactly, so you can watch each algorithm recover it.
//
// Coordinates: λ = (λ1, λ2, λ3), the LARGEST eigenvalue of each one-qubit reduced density
// matrix (the other eigenvalue is 1 - λi). The origin O of the notes is (1/2, 1/2, 1/2).
// Registered with figs.js through window.FigExtra.
(function () {
  'use strict';
  var X = window.FigExtra = window.FigExtra || {};

  // ====================================================================
  // Three-qubit numerics. A state is {re:[8], im:[8]}, index = 4*j1 + 2*j2 + j3.
  // ====================================================================
  var Q = {};
  function bit(i, k) { return (i >> (2 - k)) & 1; }
  Q.norm = function (s) {
    var n = 0, i; for (i = 0; i < 8; i++) n += s.re[i] * s.re[i] + s.im[i] * s.im[i];
    n = Math.sqrt(n) || 1; return { re: s.re.map(function (x) { return x / n; }), im: s.im.map(function (x) { return x / n; }) };
  };
  Q.basis = function (bits, amps) {
    var s = { re: [0, 0, 0, 0, 0, 0, 0, 0], im: [0, 0, 0, 0, 0, 0, 0, 0] };
    bits.forEach(function (b, i) { s.re[parseInt(b, 2)] = amps ? amps[i] : 1; });
    return Q.norm(s);
  };
  // reduced density matrix of qubit k: {a: ρ00, d: ρ11, zr + i zi: ρ01}
  Q.rho = function (s, k) {
    var p0 = 0, re = 0, im = 0;
    for (var i = 0; i < 8; i++) {
      if (bit(i, k)) continue; var j = i | (1 << (2 - k));
      p0 += s.re[i] * s.re[i] + s.im[i] * s.im[i];
      re += s.re[i] * s.re[j] + s.im[i] * s.im[j]; im += s.im[i] * s.re[j] - s.re[i] * s.im[j];
    }
    return { a: p0, d: 1 - p0, zr: re, zi: im };
  };
  Q.lmax = function (r) { return 0.5 + Math.sqrt((r.a - 0.5) * (r.a - 0.5) + r.zr * r.zr + r.zi * r.zi); };
  Q.spec = function (s) { return [0, 1, 2].map(function (k) { return Q.lmax(Q.rho(s, k)); }); };
  // apply a 2x2 complex matrix (entries {r, i}) to qubit k
  Q.apply = function (s, k, M) {
    var re = s.re.slice(), im = s.im.slice();
    for (var i = 0; i < 8; i++) {
      if (bit(i, k)) continue; var j = i | (1 << (2 - k));
      var ar = s.re[i], ai = s.im[i], br = s.re[j], bi = s.im[j];
      re[i] = M[0][0].r * ar - M[0][0].i * ai + M[0][1].r * br - M[0][1].i * bi;
      im[i] = M[0][0].r * ai + M[0][0].i * ar + M[0][1].r * bi + M[0][1].i * br;
      re[j] = M[1][0].r * ar - M[1][0].i * ai + M[1][1].r * br - M[1][1].i * bi;
      im[j] = M[1][0].r * ai + M[1][0].i * ar + M[1][1].r * bi + M[1][1].i * br;
    }
    return { re: re, im: im };
  };
  // exp(-t H) for a Hermitian 2x2 H = [[a, z], [z*, d]]
  Q.expH = function (H, t) {
    var m = (H.a + H.d) / 2, vz = (H.a - H.d) / 2, vx = H.zr, vy = -H.zi, r = Math.sqrt(vx * vx + vy * vy + vz * vz);
    var e = Math.exp(-t * m), ch = Math.cosh(t * r), sh = r > 1e-12 ? Math.sinh(t * r) / r : t;
    return [[{ r: e * (ch - sh * vz), i: 0 }, { r: -e * sh * vx, i: e * sh * vy }],
            [{ r: -e * sh * vx, i: -e * sh * vy }, { r: e * (ch + sh * vz), i: 0 }]];
  };
  // U diag(q, 1-q) U†, with U the eigenbasis of ρ (largest eigenvalue first)
  Q.target = function (r, q) {
    var h = Math.sqrt((r.a - 0.5) * (r.a - 0.5) + r.zr * r.zr + r.zi * r.zi);
    if (h < 1e-12) return { a: 0.5, d: 0.5, zr: 0, zi: 0 };
    var nx = r.zr / h, ny = -r.zi / h, nz = (r.a - 0.5) / h, k = 2 * q - 1;
    return { a: 0.5 + k * nz / 2, d: 0.5 - k * nz / 2, zr: k * nx / 2, zi: -k * ny / 2 };
  };
  // One step of the (extended) gradient flow towards the point p. p = O is Algorithm 6.
  Q.flowStep = function (s, p, eta) {
    var f = 0, Hs = [0, 1, 2].map(function (k) {
      var r = Q.rho(s, k), T = Q.target(r, p[k]);
      var H = { a: r.a - T.a, d: r.d - T.d, zr: r.zr - T.zr, zi: r.zi - T.zi };
      f += H.a * H.a + H.d * H.d + 2 * (H.zr * H.zr + H.zi * H.zi); return H;
    });
    for (var k = 0; k < 3; k++) s = Q.apply(s, k, Q.expH(Hs[k], eta));
    return { s: Q.norm(s), f: f };
  };
  // ‖X|ψ⟩ − c|ψ⟩‖ with X = Σ I<span class="op">⊗</span>ρ(i)<span class="op">⊗</span>I (Proposition 2.1 / Algorithm 2)
  Q.residual = function (s) {
    var out = { re: [0, 0, 0, 0, 0, 0, 0, 0], im: [0, 0, 0, 0, 0, 0, 0, 0] };
    for (var k = 0; k < 3; k++) {
      var r = Q.rho(s, k), M = [[{ r: r.a, i: 0 }, { r: r.zr, i: r.zi }], [{ r: r.zr, i: -r.zi }, { r: r.d, i: 0 }]];
      var t = Q.apply(s, k, M); for (var i = 0; i < 8; i++) { out.re[i] += t.re[i]; out.im[i] += t.im[i]; }
    }
    var c = 0, i2; for (i2 = 0; i2 < 8; i2++) c += s.re[i2] * out.re[i2] + s.im[i2] * out.im[i2];
    var n = 0; for (i2 = 0; i2 < 8; i2++) { var dr = out.re[i2] - c * s.re[i2], di = out.im[i2] - c * s.im[i2]; n += dr * dr + di * di; }
    return { c: c, res: Math.sqrt(n) };
  };

  // ====================================================================
  // Geometry of the three-qubit polytopes
  // ====================================================================
  var V = { P: [1, 1, 1], O: [0.5, 0.5, 0.5], A: [1, 0.5, 0.5], B: [0.5, 1, 0.5], C: [0.5, 0.5, 1], Wc: [2 / 3, 2 / 3, 2 / 3] };
  var FACES = {
    GHZ: [['P', 'A', 'B'], ['P', 'B', 'C'], ['P', 'C', 'A'], ['O', 'A', 'B'], ['O', 'B', 'C'], ['O', 'C', 'A']],
    W: [['P', 'A', 'B'], ['P', 'B', 'C'], ['P', 'C', 'A'], ['A', 'B', 'C']]
  };
  // the inequalities of the full polytope Δ (Higuchi–Sudbery–Szulc), written a·λ ≤ b
  var DELTA_INEQS = [
    { a: [1, 0, 0], b: 1 }, { a: [0, 1, 0], b: 1 }, { a: [0, 0, 1], b: 1 },
    { a: [-1, 0, 0], b: -0.5 }, { a: [0, -1, 0], b: -0.5 }, { a: [0, 0, -1], b: -0.5 },
    { a: [-1, 1, 1], b: 1 }, { a: [1, -1, 1], b: 1 }, { a: [1, 1, -1], b: 1 }
  ];
  function dot(u, v) { return u[0] * v[0] + u[1] * v[1] + u[2] * v[2]; }
  function sub(u, v) { return [u[0] - v[0], u[1] - v[1], u[2] - v[2]]; }
  function cross(u, v) { return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; }
  function dist(u, v) { var d = sub(u, v); return Math.sqrt(dot(d, d)); }
  function det3(m) { return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]); }
  // vertices of {λ : a·λ ≤ b for all inequalities}, by trying every triple of planes
  function vertices(ineqs) {
    var out = [];
    for (var i = 0; i < ineqs.length; i++) for (var j = i + 1; j < ineqs.length; j++) for (var k = j + 1; k < ineqs.length; k++) {
      var M = [ineqs[i].a, ineqs[j].a, ineqs[k].a], b = [ineqs[i].b, ineqs[j].b, ineqs[k].b], D = det3(M);
      if (Math.abs(D) < 1e-9) continue;
      var x = [0, 1, 2].map(function (c) { var Mc = M.map(function (row, r) { var t = row.slice(); t[c] = b[r]; return t; }); return det3(Mc) / D; });
      if (ineqs.every(function (q) { return dot(q.a, x) <= q.b + 1e-9; }) && !out.some(function (y) { return dist(x, y) < 1e-7; })) out.push(x);
    }
    return out;
  }
  // convex hull of a few points: returns {kind, faces|poly}
  function hull(pts) {
    var P = []; pts.forEach(function (p) { if (!P.some(function (q) { return dist(p, q) < 1e-6; })) P.push(p); });
    if (P.length === 1) return { kind: 'point', pts: P };
    if (P.length === 2) return { kind: 'seg', pts: P };
    // coplanar? (or collinear)
    var n = null;
    for (var i = 2; i < P.length && !n; i++) { var c = cross(sub(P[1], P[0]), sub(P[i], P[0])); if (dot(c, c) > 1e-12) n = c; }
    if (!n) { var far = P.slice().sort(function (a, b) { return dot(a, [1, 1, 1]) - dot(b, [1, 1, 1]); }); return { kind: 'seg', pts: [far[0], far[far.length - 1]] }; }
    var flat = P.every(function (p) { return Math.abs(dot(n, sub(p, P[0]))) < 1e-9; });
    if (flat) {   // 2D hull in the plane
      var u = sub(P[1], P[0]), w = cross(n, u);
      var two = P.map(function (p) { var d = sub(p, P[0]); return { p: p, x: dot(d, u), y: dot(d, w) }; }).sort(function (a, b) { return a.x - b.x || a.y - b.y; });
      function cr(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
      var lo = [], up = [];
      two.forEach(function (q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 1e-12) lo.pop(); lo.push(q); });
      two.slice().reverse().forEach(function (q) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 1e-12) up.pop(); up.push(q); });
      return { kind: 'poly', pts: lo.slice(0, -1).concat(up.slice(0, -1)).map(function (q) { return q.p; }) };
    }
    var F = [];
    for (var a = 0; a < P.length; a++) for (var b = a + 1; b < P.length; b++) for (var c2 = b + 1; c2 < P.length; c2++) {
      var nn = cross(sub(P[b], P[a]), sub(P[c2], P[a])); if (dot(nn, nn) < 1e-12) continue;
      var pos = 0, neg = 0; P.forEach(function (p) { var s = dot(nn, sub(p, P[a])); if (s > 1e-9) pos++; else if (s < -1e-9) neg++; });
      if (!pos || !neg) F.push([P[a], P[b], P[c2]]);
    }
    return { kind: 'faces', faces: F };
  }
  // "a λ₁ + b λ₂ + c λ₃", leaving out coefficients equal to 1
  function lin(a, f) {
    var names = ['λ₁', 'λ₂', 'λ₃'], out = '';
    a.forEach(function (c, i) { var t = f(Math.abs(c)); if (t === '0' || t === '0.000') return; out += (out ? (c < 0 ? ' − ' : ' + ') : (c < 0 ? '−' : '')) + (t === '1' ? '' : t) + names[i]; });
    return out;
  }
  function fmt(x, d) { return (Math.abs(x) < 5e-13 ? 0 : x).toFixed(d == null ? 3 : d); }
  function vec(l, d) { return '(' + l.map(function (x) { return fmt(x, d); }).join(', ') + ')'; }
  // a small rational approximation, for the "round the inequality" step of SIC
  function frac(x) {
    for (var q = 1; q <= 12; q++) { var p = Math.round(x * q); if (Math.abs(p / q - x) < 0.02 / q) return q === 1 ? String(p) : p + '/' + q; }
    return x.toFixed(3);
  }

  // ====================================================================
  // Shared pieces: a rotatable 3D view of [1/2, 1]^3 and a pseudocode panel
  // ====================================================================
  function make(H) {
    var css = H.css, rgba = H.rgba, el = H.el, clamp = H.clamp, label = H.label, RM = H.RM;

    function View(fig) {
      // stage on the left, pseudocode on the right
      var grid = el('div', 'ep-grid'); fig.node.insertBefore(grid, fig.stage); grid.appendChild(fig.stage);
      fig.stage.classList.add('fig-ep', 'draggable');
      var side = el('div', 'ep-side'); grid.appendChild(side);
      var S = H.canvasIn(fig.stage), yaw = -2.35, pitch = 0.38, drag = false, last = null, idle = 0, me = {};
      me.S = S; me.side = side; me.layers = [];
      me.proj = function (v) {
        var x = v[0] - 0.75, y = v[2] - 0.75, z = v[1] - 0.75;      // λ3 up
        var cx = Math.cos(yaw), sx = Math.sin(yaw), x1 = x * cx - z * sx, z1 = x * sx + z * cx;
        var cp = Math.cos(pitch), sp = Math.sin(pitch), y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        var s = Math.min(S.W, S.H) * 0.98;
        return { x: S.W / 2 + x1 * s, y: S.H / 2 + 6 - y1 * s, z: z2 };
      };
      var cube = [[.5, .5, .5], [1, .5, .5], [1, 1, .5], [.5, 1, .5], [.5, .5, 1], [1, .5, 1], [1, 1, 1], [.5, 1, 1]];
      var edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      me.line = function (a, b, color, w, dash) {
        var p = me.proj(a), q = me.proj(b), c = S.ctx;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.strokeStyle = color; c.lineWidth = w || 1; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]);
      };
      me.tri = function (pts, fill, stroke, w) {
        var c = S.ctx, q = pts.map(me.proj);
        c.beginPath(); c.moveTo(q[0].x, q[0].y); for (var i = 1; i < q.length; i++) c.lineTo(q[i].x, q[i].y); c.closePath();
        if (fill) { c.fillStyle = fill; c.fill(); }
        if (stroke) { c.strokeStyle = stroke; c.lineWidth = w || 1.2; c.lineJoin = 'round'; c.stroke(); }
      };
      me.faces = function (list, fillA, strokeA, color) {
        var F = list.map(function (f) { var q = f.map(me.proj); return { f: f, z: (q[0].z + q[1].z + q[2].z) / 3 }; }).sort(function (u, v) { return u.z - v.z; });
        F.forEach(function (o) { me.tri(o.f, rgba(color, fillA), rgba(color, strokeA), 1.3); });
      };
      me.named = function (names, fillA, strokeA, color) { me.faces(names.map(function (f) { return f.map(function (k) { return V[k]; }); }), fillA, strokeA, color); };
      me.dot = function (v, r, fill, stroke) {
        var p = me.proj(v), c = S.ctx; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2);
        if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke(); }
      };
      me.text = function (v, t, color, dx, dy, size) { var p = me.proj(v); label(S.ctx, t, p.x + (dx || 8), p.y + (dy || -8), color, 'left', size || 12); };
      me.hull = function (h, color) {
        if (!h) return;
        if (h.kind === 'point') me.dot(h.pts[0], 5, color);
        else if (h.kind === 'seg') me.line(h.pts[0], h.pts[1], color, 3);
        else if (h.kind === 'poly') me.tri(h.pts, rgba(color, 0.25), color, 1.6);
        else me.faces(h.faces, 0.14, 0.95, color);
      };
      // the plane n·λ = r, clipped to the cube
      me.plane = function (n, r, color) {
        var pts = [];
        edges.forEach(function (e) {
          var a = cube[e[0]], b = cube[e[1]], fa = dot(n, a) - r, fb = dot(n, b) - r;
          if ((fa <= 0 && fb >= 0) || (fa >= 0 && fb <= 0)) { if (Math.abs(fa - fb) < 1e-12) return; var t = fa / (fa - fb); pts.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]); }
        });
        if (pts.length < 3) return;
        var h = hull(pts); if (h.kind === 'poly') me.tri(h.pts, rgba(color, 0.16), rgba(color, 0.8), 1.2);
      };
      me.base = function () {
        var c = S.ctx, rule = css('--rule'), mu = css('--muted');
        c.clearRect(0, 0, S.W, S.H);
        edges.forEach(function (e) { me.line(cube[e[0]], cube[e[1]], rule, 1, [3, 3]); });
        [[[1.08, .5, .5], 'λ₁'], [[.5, 1.08, .5], 'λ₂'], [[.5, .5, 1.08], 'λ₃']].forEach(function (t) { var p = me.proj(t[0]); label(c, t[1], p.x, p.y, mu, 'center', 13); });
      };
      me.draw = function () { me.base(); me.layers.forEach(function (f) { f(); }); };
      // rotate by dragging; slow spin when left alone
      fig.stage.addEventListener('pointerdown', function (e) { drag = true; last = [e.clientX, e.clientY]; fig.stage.setPointerCapture(e.pointerId); });
      fig.stage.addEventListener('pointermove', function (e) { if (!drag) return; yaw += (e.clientX - last[0]) * 0.01; pitch = clamp(pitch + (e.clientY - last[1]) * 0.006, -1.2, 1.2); last = [e.clientX, e.clientY]; idle = 0; me.draw(); });
      fig.stage.addEventListener('pointerup', function () { drag = false; });
      fig.stage.addEventListener('pointercancel', function () { drag = false; });
      me.spin = H.loop(function () { if (!drag && ++idle > 90) yaw += 0.0025; me.tick && me.tick(); me.draw(); });
      me.api = {
        draw: function () { me.draw(); }, fit: S.fit,
        visible: function (on) { if (on && !RM) me.spin.start(); else { me.spin.stop(); me.draw(); } }
      };
      return me;
    }

    // Pseudocode box. lines: array of HTML strings; leading spaces = indentation.
    function Algo(parent, title, lines) {
      var box = el('div', 'algo'), head = el('div', 'algo-title', title), ol = el('ol', 'algo-lines');
      lines.forEach(function (l) {
        var m = /^( *)(.*)$/.exec(l), li = el('li', null, m[2] || '&nbsp;'); li.style.paddingLeft = (m[1].length * 0.55 + 0.4) + 'em'; ol.appendChild(li);
      });
      box.appendChild(head); box.appendChild(ol); parent.appendChild(box);
      var items = ol.children;
      return {
        box: box,
        at: function (n) { for (var i = 0; i < items.length; i++) items[i].classList.toggle('on', i === n - 1); },
        done: function (n) { this.at(0); if (n) items[n - 1].classList.add('ret'); },
        clear: function () { for (var i = 0; i < items.length; i++) items[i].classList.remove('on', 'ret'); }
      };
    }
    function logBox(parent) { var b = el('div', 'algo-log'); parent.appendChild(b); return b; }
    function btn(text, cls) { var b = el('button', cls || 'chip', text); b.type = 'button'; return b; }
    function seg(opts, cur, onPick) {
      var g = el('div', 'seg'); g.setAttribute('role', 'group');
      opts.forEach(function (o) {
        var b = btn(o[1], ''); b.setAttribute('aria-pressed', String(o[0] === cur));
        b.addEventListener('click', function () { g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); onPick(o[0]); });
        g.appendChild(b);
      });
      return g;
    }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, RM ? 0 : ms); }); }

    // random states in each SLOCC class (only the positive part of g matters for the spectra)
    function gauss() { return H.gauss(Math.random); }
    function slocc(s, scale) {
      for (var k = 0; k < 3; k++) { var h = { a: gauss(), d: 0, zr: gauss(), zi: gauss() }; h.d = -h.a; s = Q.apply(s, k, Q.expH(h, scale)); }
      return Q.norm(s);
    }
    var W0 = Q.basis(['001', '010', '100']), GHZ0 = Q.basis(['000', '111']);
    function randomState(cls) {
      var sc = Math.pow(Math.random(), 1.2) * 1.8;
      if (cls === 'W') return slocc(W0, sc);
      if (cls === 'GHZ') return slocc(GHZ0, sc);
      if (cls === 'PROD') return slocc(Q.basis(['000']), sc);
      // biseparable: one qubit on its own, the other two in a random entangled state
      var k = Math.floor(Math.random() * 3), bits = [['000', '011'], ['000', '101'], ['000', '110']][k];
      return slocc(Q.basis(bits), sc);
    }

    // ==================================================================
    // Demo 1: the polytopes, sampled orbits, and Algorithm 1 as a witness
    // ==================================================================
    X['ep-classes'] = function (fig) {
      var v = View(fig), cls = 'W', pts = [], pending = 0, viol = 0;
      var algo = Algo(v.side, 'Algorithm 1 · an inequality as an entanglement witness', [
        '<b>for</b> i = 1, 2, 3 <b>do</b>',
        '  compute ρ<sup>(i)</sup> of |φ⟩',
        '  λ<sup>(i)</sup> ← eigenvalues of ρ<sup>(i)</sup>, decreasing',
        'λ ← (λ<sup>(1)</sup>, λ<sup>(2)</sup>, λ<sup>(3)</sup>)',
        '<b>for</b> each known inequality ⟨a, λ⟩ ≤ b of Δ<sub>W</sub> <b>do</b>',
        '  <b>if</b> ⟨a, λ⟩ &gt; b <b>then</b>   <i>here: λ₁+λ₂+λ₃ &lt; 2</i>',
        '    <b>return</b> “|φ⟩ ∉ closure of W”',
        '<b>return</b> “inconclusive”'
      ]);
      var log = logBox(v.side);
      log.innerHTML = 'Pick a class, sample its orbit, then test one state with the algorithm.';
      var names = { PROD: 'product', BISEP: 'biseparable', W: 'W', GHZ: 'GHZ' };
      v.layers.push(function () {
        var a = css('--accent'), a2 = css('--accent-2'), mu = css('--muted'), ink = css('--ink');
        v.named(FACES.GHZ, 0.0, 0.35, mu);                                  // Δ, the GHZ polytope, as a ghost
        if (cls === 'GHZ') v.named(FACES.GHZ, 0.08, 0.9, a);
        if (cls === 'W') v.named(FACES.W, 0.10, 0.9, a);
        if (cls === 'BISEP') ['A', 'B', 'C'].forEach(function (k) { v.line(V.P, V[k], a, 3); });
        if (cls === 'W' || cls === 'GHZ') v.plane([1, 1, 1], 2, a2);
        var d = pts.map(function (p) { return { p: p, z: v.proj(p.l).z }; }).sort(function (x, y) { return x.z - y.z; });
        d.forEach(function (o) { v.dot(o.p.l, o.p.bad ? 2.6 : 1.8, o.p.bad ? rgba(a2, 0.95) : rgba(ink, 0.45)); });
        if (v.test) { v.dot(v.test.l, 7, null, ink); v.dot(v.test.l, 3, ink); }
        [['P', 'product'], ['Wc', 'W'], ['O', 'GHZ']].forEach(function (t) { v.dot(V[t[0]], 3.5, ink); v.text(V[t[0]], t[1], ink); });
      });
      v.tick = function () {
        for (var n = 0; n < 40 && pending > 0; n++, pending--) {
          var l = Q.spec(randomState(cls)), bad = l[0] + l[1] + l[2] < 2 - 1e-9; if (bad) viol++;
          pts.push({ l: l, bad: bad });
        }
        readout();
      };
      function readout() {
        fig.readout.innerHTML = '<b>' + pts.length + '</b> sampled ' + names[cls] + '-class states' +
          (cls === 'GHZ' ? ' · <b>' + viol + '</b> violate λ₁+λ₂+λ₃ ≥ 2, so Algorithm 1 certifies they are not in the closure of W' :
           cls === 'W' ? ' · all satisfy λ₁+λ₂+λ₃ ≥ 2 (the W polytope is the tetrahedron)' : '');
      }
      var running = false;
      async function testOne() {
        if (running) return; running = true;
        var s = randomState(cls), l = Q.spec(s), lines = [], tries = 0;
        while (cls !== 'PROD' && l[0] + l[1] + l[2] > 2.9 && tries++ < 200) { s = randomState(cls); l = Q.spec(s); }
        function say(t) { lines.push(t); log.innerHTML = lines.join('<br>'); }
        log.innerHTML = '';
        for (var i = 0; i < 3; i++) {
          algo.at(1); await sleep(220); algo.at(2); var r = Q.rho(s, i);
          await sleep(260); algo.at(3); say('λ<sup>(' + (i + 1) + ')</sup> = (' + fmt(l[i]) + ', ' + fmt(1 - l[i]) + ')'); await sleep(320);
        }
        algo.at(4); v.test = { l: l }; say('λ = ' + vec(l)); await sleep(450);
        algo.at(5); await sleep(300); algo.at(6); var S = l[0] + l[1] + l[2]; say('λ₁+λ₂+λ₃ = ' + fmt(S)); await sleep(450);
        if (S < 2 - 1e-9) { algo.done(7); say('<b>Violated, so |φ⟩ is certainly not in the closure of W.</b>'); }
        else { algo.done(8); say('<b>Satisfied, so the test is inconclusive</b> (it would be for any W-class state, but also for some GHZ-class ones).'); }
        running = false;
      }
      fig.readout = el('div', 'readout');
      var controls = el('div', 'fig-controls');
      controls.appendChild(seg([['PROD', 'Product'], ['BISEP', 'Biseparable'], ['W', 'W'], ['GHZ', 'GHZ']], cls, function (c) { cls = c; pts = []; viol = 0; v.test = null; algo.clear(); pending = 600; readout(); v.draw(); }));
      var more = btn('Sample 600 more'); more.addEventListener('click', function () { pending += 600; v.spin.start(); });
      var test = btn('Run Algorithm 1 on one state'); test.addEventListener('click', testOne);
      controls.appendChild(more); controls.appendChild(test);
      fig.bar.appendChild(controls); fig.bar.appendChild(fig.readout);
      fig.caption.innerHTML = '<span class="key"><i class="ln accent"></i>class polytope <i class="ln"></i>full polytope Δ <i class="sq blue"></i>plane λ₁+λ₂+λ₃ = 2</span> Each dot is the vector of largest local eigenvalues of a random state g·|ψ⟩ in the chosen SLOCC class. Product states all sit at one corner, biseparable states on three edges, W-class states fill a tetrahedron and GHZ-class states fill the whole bipyramid Δ. Drag to rotate.';
      pending = 600; if (RM) v.tick(); v.draw(); readout();
      return v.api;
    };

    // ==================================================================
    // Demo 2: gradient flow to the closest point (Algorithm 6), then Algorithm 2
    // ==================================================================
    X['ep-flow'] = function (fig) {
      var v = View(fig), cls = 'W', s = null, trail = [], fs = [], phase = 'idle', star = null, ineq = null, eta = 0.3;
      var algo = Algo(v.side, 'Algorithm 6 · gradient flow, then Algorithm 2', [
        '<b>repeat</b>',
        '  <b>for</b> i = 1, 2, 3 <b>do</b>',
        '    H<sub>i</sub> ← ρ<sup>(i)</sup> − I/2',
        '    g<sub>i</sub> ← exp(−η H<sub>i</sub>)   <i>an SLOCC step</i>',
        '  |ψ⟩ ← (g₁ <span class="op">⊗</span> g₂ <span class="op">⊗</span> g₃)|ψ⟩ / ‖·‖',
        '  f ← Σ<sub>i</sub> tr(H<sub>i</sub>²)',
        '<b>until</b> f changes by less than ε',
        'λ* ← λ(|ψ⟩)',
        '<i>Alg. 2:</i> check X|ψ⟩ = c|ψ⟩',
        '<b>if</b> λ* = <var>O</var> <b>then return</b> “no new inequality”',
        '<b>return</b> ⟨λ − <var>O</var>, λ* − <var>O</var>⟩ ≥ ⟨λ* − <var>O</var>, λ* − <var>O</var>⟩'
      ]);
      var log = logBox(v.side), chart = el('canvas', 'ep-chart'); v.side.insertBefore(chart, log);
      function drawChart() {
        var r = chart.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2), c = chart.getContext('2d');
        chart.width = r.width * d; chart.height = r.height * d; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, r.width, r.height);
        var mu = css('--muted'), a = css('--accent');
        label(c, 'f = ‖moment map‖² (log scale)', 0, 8, mu, 'left', 11);
        if (fs.length < 2) return;
        var lo = -9, hi = 1, n = Math.max(30, fs.length);
        c.beginPath(); fs.forEach(function (f, i) { var x = i / (n - 1) * r.width, y = 18 + (1 - (Math.log10(Math.max(f, 1e-9)) - lo) / (hi - lo)) * (r.height - 22); if (i) c.lineTo(x, y); else c.moveTo(x, y); });
        c.strokeStyle = a; c.lineWidth = 1.6; c.stroke();
      }
      v.layers.push(function () {
        var a = css('--accent'), a2 = css('--accent-2'), mu = css('--muted'), ink = css('--ink');
        v.named(FACES.GHZ, 0, 0.3, mu);
        v.named(FACES.W, 0, 0.3, mu);
        if (ineq) v.plane(ineq.n, ineq.r, a2);
        if (trail.length > 1) for (var i = 1; i < trail.length; i++) v.line(trail[i - 1], trail[i], rgba(a, 0.35 + 0.65 * i / trail.length), 2);
        if (trail.length) { v.dot(trail[0], 4, null, a); v.dot(trail[trail.length - 1], 5, a); }
        if (star) { v.dot(star, 9, null, ink); v.text(star, 'λ*', ink, 12, -10, 13); }
        v.dot(V.O, 3.5, ink); v.text(V.O, 'O', ink, -18, 4);
      });
      function fresh() {
        s = randomState(cls === 'W' ? 'W' : 'GHZ');
        // start somewhere visibly away from the answer
        var l = Q.spec(s); var tries = 0;
        while ((l[0] + l[1] + l[2] < 2.45 || l[0] + l[1] + l[2] > 2.97) && tries++ < 200) { s = randomState(cls === 'W' ? 'W' : 'GHZ'); l = Q.spec(s); }
        trail = [l]; fs = []; star = null; ineq = null; phase = 'idle'; algo.clear(); drawChart();
        log.innerHTML = 'Start: λ = ' + vec(l) + '. Press <b>Run the flow</b>.';
        v.draw();
      }
      var prevF = Infinity, it = 0;
      v.tick = function () {
        if (phase !== 'run') return;
        for (var k = 0; k < (RM ? 400 : 1); k++) {
          var o = Q.flowStep(s, V.O, eta); s = o.s; it++;
          fs.push(o.f); trail.push(Q.spec(s));
          algo.at(2 + (it % 5));
          if (Math.abs(prevF - o.f) < 1e-8 || it > 400) { finish(); break; }
          prevF = o.f;
        }
        drawChart();
        log.innerHTML = 'iteration ' + it + ' · f = ' + o.f.toExponential(2) + ' · λ = ' + vec(trail[trail.length - 1]);
      };
      async function finish() {
        phase = 'done'; star = trail[trail.length - 1];
        var lines = ['Converged after ' + it + ' steps.'];
        function say(t) { lines.push(t); log.innerHTML = lines.join('<br>'); }
        algo.at(7); await sleep(300); algo.at(8); say('λ* = ' + vec(star)); await sleep(400);
        var R = Q.residual(s); algo.at(9); say('‖X|ψ⟩ − c|ψ⟩‖ = ' + R.res.toExponential(1) + ' with c = ' + fmt(R.c) + ', so |ψ⟩ is (numerically) an eigenvector of X'); await sleep(500);
        var n = sub(star, V.O), nn = dot(n, n);
        if (Math.sqrt(nn) < 0.01) { algo.done(10); say('<b>λ* = O</b>: the closest point is the origin, so this gives no new inequality. (GHZ-class states can have every local state maximally mixed.)'); }
        else {
          algo.done(11);
          // in full-spectrum coordinates both sides double, so this is the same inequality
          ineq = { n: n, r: dot(n, V.O) + nn };
          var k = n[0];
          say('<b>New inequality:</b> ' + fmt(n[0]) + 'λ₁ + ' + fmt(n[1]) + 'λ₂ + ' + fmt(n[2]) + 'λ₃ ≥ ' + fmt(ineq.r));
          say('Dividing by ' + fmt(k) + ': <b>λ₁ + λ₂ + λ₃ ≥ ' + fmt(ineq.r / k, 2) + '</b>, exactly the bottom face of the W tetrahedron.');
        }
        v.draw();
      }
      fig.readout = el('div', 'readout');
      var controls = el('div', 'fig-controls');
      controls.appendChild(seg([['W', 'Start in the W class'], ['GHZ', 'Start in the GHZ class']], cls, function (c) { cls = c; fresh(); }));
      var go = btn('Run the flow'); go.addEventListener('click', function () { if (phase === 'done') fresh(); it = 0; prevF = Infinity; fs = []; trail = [Q.spec(s)]; phase = 'run'; v.spin.start(); });
      var nw = btn('New starting state'); nw.addEventListener('click', fresh);
      controls.appendChild(go); controls.appendChild(nw);
      fig.bar.appendChild(controls);
      fig.caption.innerHTML = '<span class="key"><i class="ln accent"></i>path of λ(|ψ⟩) during the flow <i class="sq blue"></i>the inequality it produces</span> The flow only applies invertible local operators, so it never leaves the SLOCC class, and it pushes the local spectra towards uniform. A W-class state gets stuck at (⅔, ⅔, ⅔): the point of the W polytope closest to O. Convexity then turns that one point into a whole facet. A GHZ-class state flows all the way to O.';
      fresh();
      return v.api;
    };

    // ==================================================================
    // Demo 3: free states, the matrix A, and Algorithms 3 and 4
    // ==================================================================
    X['ep-free'] = function (fig) {
      var v = View(fig), sel = ['001', '010', '100'], found = [], inner = null, outer = null, running = false;
      var algo = Algo(v.side, 'Algorithm 4 · inner and outer approximation (uses Alg. 3)', [
        'S ← supp(|ψ⟩);  Points ← ∅;  Ineqs ← ∅',
        '<b>for all</b> j ∈ S <b>do</b> add the sorted spectra of μ<sub>j</sub> to Points',
        '<b>for all</b> nonempty T ⊆ S <b>do</b>',
        '  run Algorithm 3 on T:',
        '    A<sub>rs</sub> ← #positions where j<sup>(r)</sup>, j<sup>(s)</sup> agree',
        '    solve A p = c·1,  Σ p<sub>r</sub> = 1',
        '    <b>if</b> some p<sub>r</sub> ≤ 0: no closest point for T',
        '    λ* ← sorted diagonals of Σ p<sub>r</sub> |j<sup>(r)</sup>⟩⟨j<sup>(r)</sup>|',
        '  add λ* to Points',
        '  <b>if</b> T = S and λ* ≠ <var>O</var>: add ⟨λ − <var>O</var>, λ* − <var>O</var>⟩ ≥ |λ* − <var>O</var>|² to Ineqs',
        '<b>return</b> conv(Points) (inner) and Ineqs (outer)'
      ]);
      var info = el('div', 'ep-info'); v.side.appendChild(info);
      var log = logBox(v.side);
      var picker = el('div', 'ep-basis'); picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', 'Support of the state');
      ['000', '001', '010', '011', '100', '101', '110', '111'].forEach(function (b) {
        var t = btn('|' + b + '⟩', 'ket'); t.dataset.b = b;
        t.addEventListener('click', function () { if (running) return; var i = sel.indexOf(b); if (i >= 0) sel.splice(i, 1); else sel.push(b); sel.sort(); update(); });
        picker.appendChild(t);
      });
      function hamming(a, b) { var d = 0; for (var i = 0; i < 3; i++) if (a[i] !== b[i]) d++; return d; }
      function alg3(T) {
        var m = T.length, A = T.map(function (x) { return T.map(function (y) { return 3 - hamming(x, y); }); });
        // unknowns p_1..p_m, c:  A p − c·1 = 0,  Σ p = 1
        var M = [], i, j;
        for (i = 0; i < m; i++) { M.push(A[i].concat([-1, 0])); }
        var last = []; for (j = 0; j < m; j++) last.push(1); last.push(0, 1); M.push(last);
        var n = m + 1;
        for (var col = 0; col < n; col++) {
          var piv = col; for (i = col + 1; i < n; i++) if (Math.abs(M[i][col]) > Math.abs(M[piv][col])) piv = i;
          if (Math.abs(M[piv][col]) < 1e-10) return { A: A, ok: false, why: 'no unique solution' };
          var t = M[col]; M[col] = M[piv]; M[piv] = t;
          for (i = 0; i < n; i++) if (i !== col) { var f = M[i][col] / M[col][col]; for (j = col; j <= n; j++) M[i][j] -= f * M[col][j]; }
        }
        var p = [], c = M[m][n] / M[m][m]; for (i = 0; i < m; i++) p.push(M[i][n] / M[i][i]);
        if (p.some(function (x) { return x <= 1e-12; })) return { A: A, p: p, c: c, ok: false, why: 'some p<sub>r</sub> ≤ 0' };
        var l = [0, 1, 2].map(function (q) { var w0 = 0; T.forEach(function (b, r) { if (b[q] === '0') w0 += p[r]; }); return Math.max(w0, 1 - w0); });
        return { A: A, p: p, c: c, ok: true, l: l };
      }
      function isFree(S) { for (var i = 0; i < S.length; i++) for (var j = i + 1; j < S.length; j++) if (hamming(S[i], S[j]) < 2) return [S[i], S[j]]; return null; }
      function update() {
        picker.querySelectorAll('button').forEach(function (t) { t.setAttribute('aria-pressed', String(sel.indexOf(t.dataset.b) >= 0)); });
        found = []; inner = null; outer = null; algo.clear(); log.innerHTML = '';
        if (!sel.length) { info.innerHTML = 'Pick some basis vectors: they form the support of |ψ⟩ = Σ c<sub>j</sub>|j⟩.'; v.draw(); return; }
        var bad = isFree(sel), html = '';
        html += 'Support S = {' + sel.map(function (b) { return '|' + b + '⟩'; }).join(', ') + '}<br>';
        if (bad) { html += '<b>Not free:</b> |' + bad[0] + '⟩ and |' + bad[1] + '⟩ differ in only one position, so the reduced density matrices need not be diagonal.'; info.innerHTML = html; runBtn.disabled = true; v.draw(); return; }
        var R = alg3(sel);
        html += '<b>Free.</b> A = ' + matrix(R.A) + '<br>';
        if (R.ok) html += 'p = ' + vec(R.p) + ', c = ' + fmt(R.c) + '<br>λ* = ' + vec(R.l) + (dist(R.l, V.O) < 1e-9 ? ' = O' : '');
        else html += 'Algorithm 3: ' + R.why + '.';
        var ranks = [0, 1, 2].map(function (q) { var z = sel.some(function (b) { return b[q] === '0'; }), o = sel.some(function (b) { return b[q] === '1'; }); return (z ? 1 : 0) + (o ? 1 : 0); });
        var bound = ranks.reduce(function (s, r) { return s + r - 1; }, 0), okT = sel.length <= bound;
        html += '<br>#S = ' + sel.length + (okT ? ' ≤ ' : ' &gt; ') + 'Σ(r<sub>i</sub> − 1) = ' + bound + (okT ? ', so Theorem 2.1 applies.' : ', so Theorem 2.1 does not apply.');
        info.innerHTML = html; runBtn.disabled = !okT; v.draw();
      }
      function matrix(A) { return '<span class="mat">' + A.map(function (r) { return r.join(' '); }).join('<br>') + '</span>'; }
      async function run() {
        if (running) return; running = true; found = []; inner = null; outer = null;
        var lines = []; function say(t) { lines.push(t); if (lines.length > 7) lines.shift(); log.innerHTML = lines.join('<br>'); }
        algo.at(1); await sleep(400);
        algo.at(2); sel.forEach(function () { found.push([1, 1, 1]); }); inner = hull(found); say('product states |j⟩ all give the corner (1, 1, 1)'); v.draw(); await sleep(600);
        var m = sel.length;
        for (var mask = 1; mask < (1 << m); mask++) {
          var T = sel.filter(function (_, i) { return mask & (1 << i); });
          algo.at(3); await sleep(140); algo.at(5); await sleep(140); algo.at(6);
          var R = alg3(T); await sleep(160);
          if (!R.ok) { algo.at(7); say('T = {' + T.join(', ') + '}: ' + R.why); await sleep(260); continue; }
          algo.at(8); await sleep(160); algo.at(9);
          found.push(R.l); inner = hull(found); v.draw();
          say('T = {' + T.join(', ') + '} → λ* = ' + vec(R.l));
          await sleep(T.length === 1 ? 120 : 420);
          if (T.length === m && dist(R.l, V.O) > 1e-9) {
            algo.at(10); var n = sub(R.l, V.O); outer = { n: n, r: dot(n, V.O) + dot(n, n) };
            say('<b>outer inequality:</b> ' + fmt(n[0]) + 'λ₁ + ' + fmt(n[1]) + 'λ₂ + ' + fmt(n[2]) + 'λ₃ ≥ ' + fmt(outer.r)); v.draw(); await sleep(700);
          }
        }
        algo.done(11);
        var same = sel.join() === '001,010,100';
        say(same ? '<b>Inner hull = W tetrahedron, and the outer inequality is its bottom face: the two approximations meet.</b>' : '<b>Done.</b> Inner approximation shaded; outer inequality (if any) as the plane.');
        running = false;
      }
      v.layers.push(function () {
        var a = css('--accent'), a2 = css('--accent-2'), mu = css('--muted'), ink = css('--ink');
        v.named(FACES.GHZ, 0, 0.3, mu);
        if (outer) v.plane(outer.n, outer.r, a2);
        v.hull(inner, a);
        found.forEach(function (p) { v.dot(p, 4, ink); });
      });
      var runBtn = btn('Run Algorithm 4'); runBtn.addEventListener('click', run);
      var presets = el('div', 'fig-controls');
      [['W support', ['001', '010', '100']], ['GHZ support', ['000', '111']], ['Biseparable', ['000', '011']], ['Not free', ['000', '001', '111']]].forEach(function (p) {
        var b = btn(p[0]); b.addEventListener('click', function () { if (running) return; sel = p[1].slice(); update(); }); presets.appendChild(b);
      });
      presets.appendChild(runBtn);
      fig.bar.appendChild(picker); fig.bar.appendChild(presets);
      fig.caption.innerHTML = '<span class="key"><i class="ln accent"></i>inner approximation <i class="sq blue"></i>outer inequality</span> A state is free when any two basis vectors in its support differ in at least two positions. Then every reduced density matrix is diagonal, and finding the closest point is just the linear system A p = c·1. Click basis vectors to build a support, or start from a preset, then run Algorithm 4.';
      update();
      return v.api;
    };

    // ==================================================================
    // Demo 4: Semi-interactive polytope computation (Algorithms 7 and 8)
    // ==================================================================
    X['ep-sic'] = function (fig) {
      var v = View(fig), ineqs, confirmed, rejected, current = null, trail = [], running = false, cut = null;
      var algo = Algo(v.side, 'Algorithm 8 · semi-interactive polytope computation (uses Alg. 7)', [
        'Confirmed ← ∅;  I ← inequalities of Δ',
        '<b>loop</b>',
        '  V ← vertices of {λ : λ satisfies every inequality in I}',
        '  U ← V \\ Confirmed',
        '  <b>if</b> U = ∅ <b>then return</b> Δ<sub>W</sub> = conv(Confirmed)',
        '  pick any q ∈ U',
        '  run Algorithm 7: flow from a W-class state towards q',
        '  <b>if</b> the flow reaches q <b>then</b>',
        '    add q to Confirmed',
        '  <b>else</b>',
        '    round the separating inequality to rationals',
        '    check by hand that it holds on Δ<sub>W</sub> and cuts off q',
        '    add it to I'
      ]);
      var log = logBox(v.side), list = el('div', 'ep-ineqs'); v.side.appendChild(list);
      function reset() {
        ineqs = DELTA_INEQS.map(function (q) { return { a: q.a.slice(), b: q.b }; }); confirmed = []; rejected = []; current = null; trail = []; cut = null; algo.clear();
        log.innerHTML = 'Goal: compute the W polytope Δ<sub>W</sub> starting only from the inequalities of the full polytope Δ.';
        showIneqs(); v.draw();
      }
      function showIneqs(fresh) {
        list.innerHTML = '<b>I</b> (' + ineqs.length + ' inequalities)' + (fresh ? ' · <span class="new">new: ' + fresh + '</span>' : '');
      }
      var cand = [];
      v.layers.push(function () {
        var a = css('--accent'), a2 = css('--accent-2'), mu = css('--muted'), ink = css('--ink');
        var h = hull(vertices(ineqs)); if (h.kind === 'faces') v.faces(h.faces, 0.06, 0.6, mu);
        if (cut) v.plane(cut.n, cut.r, a2);
        if (confirmed.length > 1 && !running && cand.length && cand.every(function (q) { return confirmed.some(function (c) { return dist(c, q) < 1e-6; }); })) v.hull(hull(confirmed), a);
        for (var i = 1; i < trail.length; i++) v.line(trail[i - 1], trail[i], rgba(a, 0.3 + 0.7 * i / trail.length), 2);
        cand.forEach(function (q) {
          var ok = confirmed.some(function (c) { return dist(c, q) < 1e-6; });
          v.dot(q, 5.5, ok ? a : null, ok ? null : ink);
        });
        rejected.forEach(function (q) { v.dot(q, 5.5, null, a2); v.text(q, '✕', a2, -4, 1, 13); });
        if (current) { v.dot(current, 10, null, a); }
      });
      async function flowTo(q) {
        var s = randomState('W'), tries = 0, l = Q.spec(s);
        while (l[0] + l[1] + l[2] > 2.95 && tries++ < 100) { s = randomState('W'); l = Q.spec(s); }
        trail = [l]; var prev = Infinity, d = 0;
        for (var it = 0; it < 600; it++) {
          s = Q.flowStep(s, q, 0.3).s; l = Q.spec(s); trail.push(l); d = dist(l, q);
          if (d < 0.006 || Math.abs(prev - d) < 1e-7) break; prev = d;
          if (it % 3 === 0 && !RM) { v.draw(); await sleep(16); }
        }
        v.draw(); return { l: l, d: d };
      }
      async function run() {
        if (running) return; running = true; reset();
        var lines = []; function say(t) { lines.push(t); if (lines.length > 6) lines.shift(); log.innerHTML = lines.join('<br>'); }
        algo.at(1); await sleep(500);
        for (var round = 0; round < 6; round++) {
          algo.at(2); await sleep(200);
          algo.at(3); cand = vertices(ineqs); v.draw(); say('the outer approximation has ' + cand.length + ' vertices'); await sleep(600);
          algo.at(4); var U = cand.filter(function (q) { return !confirmed.some(function (c) { return dist(c, q) < 1e-6; }); }); await sleep(300);
          if (!U.length) break;
          while (U.length) {
            algo.at(5); await sleep(150);
            algo.at(6); current = U.shift(); v.draw(); say('q = ' + vec(current, 2)); await sleep(350);
            algo.at(7); var R = await flowTo(current);
            algo.at(8); await sleep(250);
            if (R.d < 0.012) { algo.at(9); confirmed.push(current); say('reached it (distance ' + R.d.toFixed(3) + '): q ∈ Δ<sub>W</sub>'); v.draw(); await sleep(500); }
            else {
              algo.at(10); rejected.push(current);
              var n = sub(R.l, current), r = dot(n, current) + dot(n, n);
              say('stuck at ' + vec(R.l) + ', distance ' + R.d.toFixed(3) + ': q ∉ Δ<sub>W</sub>'); await sleep(500);
              algo.at(11); var k = Math.min.apply(null, n.map(Math.abs));
              var a = n.map(function (x) { return Math.round(x / k * 12) / 12; }), b = Math.round(r / k * 12) / 12;
              cut = { n: a, r: b }; v.draw();
              say('separating inequality ' + fmt(n[0]) + 'λ₁ + ' + fmt(n[1]) + 'λ₂ + ' + fmt(n[2]) + 'λ₃ ≥ ' + fmt(r));
              say('rounded: <b>' + lin(a, frac) + ' ≥ ' + frac(b) + '</b>'); await sleep(700);
              algo.at(12); say('by hand: it is Algorithm 2’s inequality for the W state, so it holds on Δ<sub>W</sub>, and q gives ' + fmt(dot(a, current), 2) + ' &lt; ' + frac(b)); await sleep(800);
              algo.at(13); ineqs.push({ a: a.map(function (x) { return -x; }), b: -b }); showIneqs(lin(a, frac) + ' ≥ ' + frac(b)); await sleep(500);
              break;   // the vertex set changed: go back to the top of the loop
            }
          }
          current = null; trail = [];
        }
        current = null; trail = []; cut = null; running = false;
        algo.done(5); say('<b>Every vertex is confirmed: Δ<sub>W</sub> = conv of ' + confirmed.length + ' points, the tetrahedron.</b>'); v.draw();
      }
      var go = btn('Run SIC for the W class'); go.addEventListener('click', run);
      var rs = btn('Reset'); rs.addEventListener('click', function () { if (!running) { reset(); cand = vertices(ineqs); v.draw(); } });
      var controls = el('div', 'fig-controls'); controls.appendChild(go); controls.appendChild(rs);
      fig.bar.appendChild(controls);
      fig.caption.innerHTML = '<span class="key"><i class="dot full"></i>confirmed vertex <i class="dot"></i>not yet checked <i class="sq blue"></i>new inequality</span> SIC starts from an outer approximation and checks its vertices one at a time with the extended flow. Four of the five vertices of Δ are reachable from a W-class state. The fifth, O, is not: the flow gets stuck at (⅔, ⅔, ⅔), and the separating inequality it hands back is λ₁+λ₂+λ₃ ≥ 2. One cut, and the computation is finished.';
      reset(); cand = vertices(ineqs); v.draw();
      return v.api;
    };
  }

  X.__install = make;
  X.__Q = Q; X.__geom = { vertices: vertices, hull: hull, DELTA_INEQS: DELTA_INEQS };
})();
