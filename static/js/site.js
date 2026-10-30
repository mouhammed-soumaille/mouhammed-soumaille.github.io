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
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    if (walks) walks.redraw();
    window.dispatchEvent(new Event('themechange'));
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
  var sel = 0, shown = [];
  function render() {
    var q = input.value.trim().toLowerCase();
    shown = index.filter(function (it) { return !q || (it.t + ' ' + it.k).toLowerCase().indexOf(q) >= 0; }).slice(0, 12);
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
  }
  // Type a word anywhere on the page (outside text boxes):
  //   "random" resamples the walks, "erdos" asks about your Erdős number,
  //   "lain" or "sudo" opens the hidden terminal at /tty/.
  var typed = '';
  document.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-12);
    if (/random$/.test(typed)) { typed = ''; runCommand('random'); toast('Fresh sample paths.'); }
    else if (/erdos$/.test(typed)) { typed = ''; toast('My Erdős number: ∞ (for now).'); }
    else if (/(lain|sudo)$/.test(typed)) {   // the hidden terminal
      typed = '';
      if (reduceMotion) { window.location.href = '/tty/'; return; }
      document.body.classList.add('glitch');
      setTimeout(function () { window.location.href = '/tty/'; }, 650);
    }
  });

  // ---------- Hero: heavy-tailed random walks ----------
  var walks = null;
  var canvas = document.getElementById('walks');
  if (canvas) walks = (function () {
    var ctx = canvas.getContext('2d');
    var paths = [], hi = 0, progress = 1, W = 0, H = 0, seed = 7, heavy = true;

    function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

    function sample() {
      var r = rng(seed), n = W < 600 ? 22 : 34, step = W < 600 ? 5 : 6, steps = Math.ceil(W / step) + 1;
      // Keep the paths above the tagline: they may pass behind the name, but not the smaller text.
      var name = document.getElementById('hero-name'), top = H * 0.06, bottom = H * 0.56;
      if (name) {
        var nr = name.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
        bottom = Math.max(H * 0.25, nr.top - cr.top + nr.height * 0.55);
      }
      var sigma = (bottom - top) * 0.02, y0 = top + (bottom - top) * 0.55;
      paths = [];
      for (var i = 0; i < n; i++) {
        var y = y0 + (r() - 0.5) * H * 0.05, pts = [y];
        for (var s = 1; s < steps; s++) {
          var u1 = r() || 1e-9, u2 = r();
          var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);   // Gaussian step
          var jump = r() < 0.012, c = Math.tan(Math.PI * (r() - 0.5));          // draw both so seeds line up
          if (heavy && jump) z += Math.max(-9, Math.min(9, c)) * 2.2;          // rare Cauchy jump
          y += z * sigma;
          if (y < top) y = 2 * top - y;              // reflect at the edges of the band
          if (y > bottom) y = 2 * bottom - y;
          pts.push(y);
        }
        paths.push({ pts: pts, step: step });
      }
      // highlight the path with the widest range by default
      var best = -1; hi = 0;
      paths.forEach(function (p, i) { var range = Math.max.apply(null, p.pts) - Math.min.apply(null, p.pts); if (range > best) { best = range; hi = i; } });
    }

    function drawPath(p, upto, color, width) {
      ctx.beginPath(); ctx.moveTo(0, p.pts[0]);
      for (var s = 1; s <= upto; s++) ctx.lineTo(s * p.step, p.pts[s]);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      if (!paths.length) return;
      var upto = Math.max(1, Math.floor(progress * (paths[0].pts.length - 1)));
      // fade the lines in from left to right so the text on the left stays readable
      var g = ctx.createLinearGradient(0, 0, W, 0), c = css('--path');
      g.addColorStop(0, hexA(c, 0.05)); g.addColorStop(0.45, hexA(c, 0.28)); g.addColorStop(1, hexA(c, 0.6));
      paths.forEach(function (p, i) { if (i !== hi) drawPath(p, upto, g, 1); });
      var ga = ctx.createLinearGradient(0, 0, W, 0), a = css('--accent');
      ga.addColorStop(0, hexA(a, 0.15)); ga.addColorStop(0.5, hexA(a, 0.75)); ga.addColorStop(1, hexA(a, 1));
      drawPath(paths[hi], upto, ga, 2);
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

    function animate() {
      if (reduceMotion) { progress = 1; draw(); return; }
      var start = null, dur = 1600;
      progress = 0;
      function frame(t) {
        if (start === null) start = t;
        var x = Math.min(1, (t - start) / dur);
        progress = 1 - Math.pow(1 - x, 3);   // ease out
        draw();
        if (x < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    // Hovering highlights the path closest to the pointer.
    var pending = false;
    canvas.parentElement.addEventListener('pointermove', function (e) {
      if (progress < 1 || pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        var rect = canvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
        var s = Math.max(0, Math.min(paths[0].pts.length - 1, Math.round(x / paths[0].step)));
        var best = Infinity, idx = hi;
        paths.forEach(function (p, i) { var d = Math.abs(p.pts[s] - y); if (d < best) { best = d; idx = i; } });
        if (idx !== hi) { hi = idx; draw(); }
      });
    });

    var resample = document.getElementById('resample');
    function resampleNow() { seed = (Math.random() * 1e9) | 0; sample(); animate(); }
    if (resample) resample.addEventListener('click', resampleNow);

    // Gaussian vs heavy-tailed steps. Same seed, so you see the same walks with and without the jumps.
    var gBtn = document.getElementById('distGauss'), hBtn = document.getElementById('distHeavy'), cap = document.getElementById('walkCaption');
    function setHeavy(on) {
      heavy = on;
      if (gBtn) { gBtn.setAttribute('aria-pressed', String(!on)); hBtn.setAttribute('aria-pressed', String(on)); }
      if (cap) cap.textContent = on ? 'Sample paths of a random walk with heavy-tailed jumps.' : 'The same walks with Gaussian steps only: no big jumps.';
      sample(); animate();
    }
    if (gBtn) { gBtn.addEventListener('click', function () { setHeavy(false); }); hBtn.addEventListener('click', function () { setHeavy(true); }); }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { var oldW = W; size(); if (Math.abs(W - oldW) > 40) sample(); progress = 1; draw(); }, 150);
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { draw(); });

    if (/[?&]random\b/.test(location.search)) seed = (Math.random() * 1e9) | 0;
    size(); sample(); animate();
    return { redraw: draw, resample: resampleNow, setHeavy: setHeavy };
  })();
})();
