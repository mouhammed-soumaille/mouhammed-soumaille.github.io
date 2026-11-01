// Small, dependency-free behaviour for the site.
(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Light / dark toggle (remembered in this browser only) ----------
  var themeBtn = document.getElementById('themeBtn');
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applyTheme(next) {
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    if (walks) walks.redraw();
    window.dispatchEvent(new Event('themechange'));
  }
  // The new theme spreads out from the button in a circle (where the browser supports view transitions).
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    if (!document.startViewTransition || reduceMotion) { applyTheme(next); return; }
    var b = themeBtn.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
    var rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('theme-swap');
    var vt = document.startViewTransition(function () { applyTheme(next); });
    vt.ready.then(function () {
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 650, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
    vt.finished.finally(function () { root.classList.remove('theme-swap'); });
  });

  // ---------- Header gets a hairline once you scroll ----------
  var top = document.querySelector('.top');
  function onScroll() { if (top) top.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- Older news ----------
  var moreNews = document.getElementById('moreNews');
  if (moreNews) moreNews.addEventListener('click', function () {
    var open = moreNews.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.news .older').forEach(function (li) { li.hidden = open; });
    moreNews.setAttribute('aria-expanded', String(!open));
    moreNews.textContent = open ? 'Show older news' : 'Show less';
  });

  // ---------- "Updated 3 days ago" ----------
  document.querySelectorAll('time[datetime]').forEach(function (t) {
    var d = new Date(t.getAttribute('datetime') + 'T12:00:00'), days = Math.round((Date.now() - d) / 864e5);
    if (isNaN(days) || days < 0 || days > 60) return;
    t.title = t.textContent;
    t.textContent = days === 0 ? 'today' : days === 1 ? 'yesterday' : days < 14 ? days + ' days ago' : Math.round(days / 7) + ' weeks ago';
    if (days <= 14) t.closest('.updated').classList.add('fresh');
  });

  // ---------- Notes filter ----------
  var filter = document.querySelector('.filter');
  if (filter) filter.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var f = b.getAttribute('data-filter');
    filter.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    document.querySelectorAll('#rows .row').forEach(function (r) {
      r.hidden = !(f === 'all' || r.getAttribute('data-status') === f);
    });
  });

  // ---------- Search palette (⌘K, Ctrl+K or /) ----------
  var pal = document.getElementById('palette'), input = document.getElementById('paletteInput'), list = document.getElementById('paletteList');
  var index = []; try { index = JSON.parse(document.getElementById('searchIndex').textContent); } catch (e) {}
  index = index.concat([
    { t: 'Switch light / dark mode', k: 'Command', a: 'theme' },
    { t: 'Resample the random walks', k: 'Command', a: 'random' },
    { t: 'Copy my email address', k: 'Command', a: 'email' }
  ]);
  var SECRETS = {
    lain: { t: 'Enter the terminal', k: '???', a: 'tty' }, sudo: { t: 'Enter the terminal', k: '???', a: 'tty' },
    terminal: { t: 'Enter the terminal', k: '???', a: 'tty' }, erdos: { t: 'What is my Erdős number?', k: '???', a: 'erdos' }
  };
  var sel = 0, shown = [];
  function render() {
    var q = input.value.trim().toLowerCase();
    shown = index.filter(function (it) { return !q || (it.t + ' ' + it.k).toLowerCase().indexOf(q) >= 0; }).slice(0, 12);
    var secret = SECRETS[q]; if (secret) shown.unshift(secret);   // hidden: only appears on an exact match
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.innerHTML = shown.length ? '' : '<li class="empty">No matches. Try a course code like “MATH 330”.</li>';
    shown.forEach(function (it, i) {
      var li = document.createElement('li'); li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === sel));
      li.innerHTML = '<span class="p-t"></span><span class="p-k"></span>';
      li.firstChild.textContent = it.t; li.lastChild.textContent = it.k;
      li.addEventListener('mousemove', function () { if (sel !== i) { sel = i; render(); } });
      li.addEventListener('click', function () { go(it); });
      list.appendChild(li);
    });
  }
  function go(it) {
    pal.close();
    if (it.a) { runCommand(it.a); return; }
    window.location.href = it.u;
  }
  function openPal() { if (!pal || pal.open) return; input.value = ''; sel = 0; render(); pal.showModal(); input.focus(); }
  if (pal) {
    var sb = document.getElementById('searchBtn'); if (sb) sb.addEventListener('click', openPal);
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) document.querySelectorAll('.search-btn kbd').forEach(function (k) { k.textContent = 'Ctrl K'; });
    document.addEventListener('keydown', function (e) {
      var typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openPal(); }
    });
    input.addEventListener('input', function () { sel = 0; render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (shown[sel]) go(shown[sel]); }
    });
    pal.addEventListener('click', function (e) { if (e.target === pal) pal.close(); });
  }

  // ---------- Commands, a toast, and a couple of easter eggs ----------
  var toastEl = null, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }
  function runCommand(a) {
    if (a === 'theme' && themeBtn) themeBtn.click();
    else if (a === 'random') {
      if (walks) { walks.resample(); window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); }
      else window.location.href = '/?random';
    }
    else if (a === 'email') {
      var em = document.querySelector('.foot a[href^="mailto:"]'), addr = em ? em.getAttribute('href').slice(7) : '';
      if (navigator.clipboard && addr) navigator.clipboard.writeText(addr).then(function () { toast('Copied ' + addr); }, function () { toast(addr); });
      else toast(addr);
    }
    else if (a === 'erdos') toast('My Erdős number: ∞ (for now).');
    else if (a === 'tty') {
      if (reduceMotion) { window.location.href = '/tty/'; return; }
      document.body.classList.add('glitch');
      setTimeout(function () { window.location.href = '/tty/'; }, 650);
    }
  }
  // Type a word anywhere on the page (outside text boxes):
  //   "random" resamples the walks, "erdos" asks about your Erdős number,
  //   "lain" or "sudo" opens the hidden terminal at /tty/.
  var typed = '';
  document.addEventListener('keydown', function (e) {
    var ae = document.activeElement;
    if ((ae && (/INPUT|TEXTAREA|SELECT/.test(ae.tagName) || ae.isContentEditable)) || e.metaKey || e.ctrlKey || e.altKey || !e.key || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-12);
    if (/random$/.test(typed)) { typed = ''; runCommand('random'); toast('Fresh sample paths.'); }
    else if (/erdos$/.test(typed)) { typed = ''; runCommand('erdos'); }
    else if (/(lain|sudo)$/.test(typed)) { typed = ''; runCommand('tty'); }   // the hidden terminal
  });
  // On phones there is no keyboard: tapping the big name on the homepage 5 times quickly opens the terminal.
  var heroName = document.getElementById('hero-name'), taps = [];
  if (heroName) document.addEventListener('click', function (e) {   // the walks canvas sits on top of the name, so check the position
    var r = heroName.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    var now = Date.now(); taps = taps.filter(function (t) { return now - t < 2000; }); taps.push(now);
    if (taps.length >= 5) { taps = []; runCommand('tty'); }
  });

  // ---------- Hero: a live field of heavy-tailed random walks ----------
  // The walks keep flowing to the left. The pointer pushes the lines aside like a lens,
  // and clicking the hero sends a ripple through them.
  var walks = null;
  var canvas = document.getElementById('walks');
  if (canvas) walks = (function () {
    var ctx = canvas.getContext('2d');
    var paths = [], hi = 0, progress = 1, W = 0, H = 0, seed = 7, heavy = true, r = null;
    var top = 0, bottom = 0, sigma = 1, step = 6, phase = 0, speed = 14;      // speed in px per second
    var mouse = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, ton: 0 }, ripples = [];
    var running = false, visible = true, last = 0;

    function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

    function nextY(y) {
      var u1 = r() || 1e-9, u2 = r();
      var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);   // Gaussian step
      var jump = r() < 0.012, c = Math.tan(Math.PI * (r() - 0.5));          // draw both so seeds line up
      if (heavy && jump) z += Math.max(-9, Math.min(9, c)) * 2.2;          // rare Cauchy jump
      y += z * sigma;
      if (y < top) y = 2 * top - y;              // reflect at the edges of the band
      if (y > bottom) y = 2 * bottom - y;
      return y;
    }
    function sample() {
      r = rng(seed); phase = 0;
      step = W < 600 ? 5 : 6;
      var n = W < 600 ? 22 : 34, steps = Math.ceil(W / step) + 2;
      // Keep the paths above the tagline: they may pass behind the name, but not the smaller text.
      var name = document.getElementById('hero-name'); top = H * 0.06; bottom = H * 0.56;
      if (name) {
        var nr = name.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
        bottom = Math.max(H * 0.25, nr.top - cr.top + nr.height * 0.55);
      }
      sigma = (bottom - top) * 0.02;
      var y0 = top + (bottom - top) * 0.55;
      paths = [];
      for (var i = 0; i < n; i++) {
        var y = y0 + (r() - 0.5) * H * 0.05, pts = [y];
        for (var s = 1; s < steps; s++) { y = nextY(y); pts.push(y); }
        paths.push(pts);
      }
      var best = -1; hi = 0;   // highlight the path with the widest range to start with
      paths.forEach(function (p, i) { var range = Math.max.apply(null, p) - Math.min.apply(null, p); if (range > best) { best = range; hi = i; } });
    }

    // How far the pointer lens and the ripples push a point at (x, y).
    function displace(x, y, now) {
      var d = 0;
      if (mouse.on > 0.01) {
        var dx = x - mouse.x, dy = y - mouse.y, g = Math.exp(-(dx * dx + dy * dy) / (2 * 75 * 75));
        d += (dy / (Math.abs(dy) + 10)) * 46 * g * mouse.on;
      }
      for (var k = 0; k < ripples.length; k++) {
        var rp = ripples[k], age = (now - rp.t) / 1000, rx = x - rp.x, ry = y - rp.y, dist = Math.sqrt(rx * rx + ry * ry);
        var front = age * 520, w = dist - front;
        d += 22 * Math.exp(-age * 1.6) * Math.exp(-(w * w) / (2 * 38 * 38)) * Math.sin(w / 14);
      }
      return d;
    }

    function drawPath(p, upto, color, width, now) {
      ctx.beginPath();
      for (var s = 0; s <= upto && s < p.length; s++) {
        var x = s * step - phase, y = p[s] + displace(x, p[s], now);
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }

    function draw(now) {
      now = now || performance.now();
      ctx.clearRect(0, 0, W, H);
      if (!paths.length) return;
      var upto = Math.max(1, Math.floor(progress * (paths[0].length - 1)));
      // fade the lines in from left to right so the text on the left stays readable
      var g = ctx.createLinearGradient(0, 0, W, 0), c = css('--path');
      g.addColorStop(0, hexA(c, 0.05)); g.addColorStop(0.45, hexA(c, 0.28)); g.addColorStop(1, hexA(c, 0.6));
      for (var i = 0; i < paths.length; i++) if (i !== hi) drawPath(paths[i], upto, g, 1, now);
      var a = css('--accent'), ga = ctx.createLinearGradient(0, 0, W, 0);
      ga.addColorStop(0, hexA(a, 0.15)); ga.addColorStop(0.5, hexA(a, 0.8)); ga.addColorStop(1, hexA(a, 1));
      ctx.save(); ctx.shadowColor = hexA(a, 0.45); ctx.shadowBlur = 10;
      drawPath(paths[hi], upto, ga, 2, now);
      ctx.restore();
      // a small marker that rides the highlighted path under the pointer
      if (mouse.on > 0.05 && progress >= 1) {
        var s = Math.max(0, Math.min(paths[hi].length - 1, Math.round((mouse.x + phase) / step)));
        var mx = s * step - phase, my = paths[hi][s] + displace(mx, paths[hi][s], now);
        ctx.beginPath(); ctx.arc(mx, my, 9 * mouse.on, 0, Math.PI * 2); ctx.fillStyle = hexA(a, 0.15 * mouse.on); ctx.fill();
        ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, Math.PI * 2); ctx.fillStyle = hexA(a, mouse.on); ctx.fill();
      }
    }

    function hexA(hex, alpha) {
      var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
      var n = parseInt(h, 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + alpha + ')';
    }

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // One loop does everything: the draw-in, the flow, the pointer lens and the ripples.
    var introStart = null, introDur = 1600;
    function tick(t) {
      if (!running) return;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
      if (introStart === null) introStart = t;
      var x = Math.min(1, (t - introStart) / introDur);
      progress = 1 - Math.pow(1 - x, 3);   // ease out
      if (x >= 1) {
        phase += speed * dt;
        while (phase >= step) {             // shift every path one step left and grow a new step on the right
          phase -= step;
          for (var i = 0; i < paths.length; i++) { var p = paths[i]; p.shift(); p.push(nextY(p[p.length - 1])); }
        }
      }
      mouse.on += (mouse.ton - mouse.on) * Math.min(1, dt * 6);
      mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 10);
      mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 10);
      ripples = ripples.filter(function (rp) { return t - rp.t < 2200; });
      draw(t);
      requestAnimationFrame(tick);
    }
    function start() { if (running || reduceMotion || !visible || document.hidden) return; running = true; last = 0; requestAnimationFrame(tick); }
    function stop() { running = false; }
    function restartIntro() { introStart = null; progress = 0; if (reduceMotion) { progress = 1; draw(); } else { stop(); start(); } }

    var hero = canvas.parentElement;
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var rect = canvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
      mouse.tx = x; mouse.ty = y; if (mouse.x < -1e3) { mouse.x = x; mouse.y = y; }
      mouse.ton = y < bottom + 60 ? 1 : 0;     // the lens only acts over the walks, not over the buttons
      if (paths.length && progress >= 1) {
        var s = Math.max(0, Math.min(paths[0].length - 1, Math.round((x + phase) / step))), best = Infinity, idx = hi;
        paths.forEach(function (p, i) { var d = Math.abs(p[s] - y); if (d < best) { best = d; idx = i; } });
        hi = idx;
      }
      if (reduceMotion) { mouse.x = x; mouse.y = y; mouse.on = 0; draw(); }
    });
    hero.addEventListener('pointerleave', function () { mouse.ton = 0; });
    hero.addEventListener('click', function (e) {
      if (reduceMotion || e.target.closest('a, button')) return;
      var rect = canvas.getBoundingClientRect();
      ripples.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() });
    });

    if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(canvas);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

    var resample = document.getElementById('resample');
    function resampleNow() { seed = (Math.random() * 1e9) | 0; sample(); restartIntro(); }
    if (resample) resample.addEventListener('click', resampleNow);

    // Gaussian vs heavy-tailed steps. Same seed, so you see the same walks with and without the jumps.
    var gBtn = document.getElementById('distGauss'), hBtn = document.getElementById('distHeavy'), cap = document.getElementById('walkCaption');

    function setHeavy(on) {
      heavy = on;
      if (gBtn) { gBtn.setAttribute('aria-pressed', String(!on)); hBtn.setAttribute('aria-pressed', String(on)); }
      if (cap) cap.textContent = on ? 'Sample paths of a random walk with heavy-tailed jumps.' : 'The same walks with Gaussian steps only: no big jumps.';
      sample(); restartIntro();
    }
    if (gBtn) { gBtn.addEventListener('click', function () { setHeavy(false); }); hBtn.addEventListener('click', function () { setHeavy(true); }); }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { var oldW = W; size(); if (Math.abs(W - oldW) > 40) sample(); draw(); }, 150);
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { draw(); });

    if (/[?&]random\b/.test(location.search)) seed = (Math.random() * 1e9) | 0;
    size(); sample();
    if (reduceMotion) { progress = 1; draw(); } else start();
    return { redraw: function () { draw(); }, resample: resampleNow, setHeavy: setHeavy };
  })();
})();
