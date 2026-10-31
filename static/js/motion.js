// Motion layer: scroll reveals, tilting cards, the sliding nav indicator, magnetic buttons
// and a reading-progress bar. Everything here is decoration: the site works without it,
// and none of it runs for people who ask their system for reduced motion.
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------- Sliding indicator under the nav links (runs even with reduced motion; it just doesn't animate) ----------
  var links = document.querySelector('.links');
  if (links) {
    var ind = document.createElement('span'); ind.className = 'nav-ind'; ind.setAttribute('aria-hidden', 'true');
    links.appendChild(ind);
    var active = links.querySelector('a.active');
    function moveTo(a) {
      if (!a) { ind.style.opacity = '0'; return; }
      ind.style.opacity = '1';
      ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
      ind.style.width = a.offsetWidth + 'px';
    }
    moveTo(active);
    links.classList.add('has-ind');
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('mouseenter', function () { moveTo(a); });
      a.addEventListener('focus', function () { moveTo(a); });
    });
    links.addEventListener('mouseleave', function () { moveTo(active); });
    window.addEventListener('resize', function () { moveTo(active); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveTo(active); });
  }

  if (reduce) return;
  root.classList.add('motion');

  // ---------- Reading-progress bar ----------
  var bar = document.createElement('div'); bar.className = 'scroll-prog'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var ticking = false;
  function prog() {
    ticking = false;
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(prog); } }, { passive: true });
  prog();

  // ---------- Reveal things as they scroll into view, in a light stagger ----------
  var groups = [
    '.sec > h2', '.sec .body > :not(.news):not(.tiles):not(.desk):not(.interests)',
    '.news > li', '.tiles > .tile', '.desk > li', '.interests > li', '#rows > .row', '.page-head-inner > *', '.lab-item'
  ];
  var items = [];
  groups.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.closest('.hero') || el.classList.contains('rv')) return;
      var sib = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--d', Math.min(sib, 8) * 70 + 'ms');
      el.classList.add('rv'); items.push(el);
    });
  });
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else items.forEach(function (el) { el.classList.add('in'); });
  // anything revealed by "Show older news" or a filter should just appear
  document.addEventListener('click', function () { setTimeout(function () { items.forEach(function (el) { if (!el.hidden && el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); }); }, 30); });

  if (!finePointer) return;

  // ---------- Cards tilt towards the pointer, with a soft light that follows it ----------
  document.querySelectorAll('.tile, .lab-item .fig, .desk > li').forEach(function (card) {
    var raf = 0, px = 0, py = 0, tilt = card.classList.contains('tile');
    card.classList.add('glow');
    card.addEventListener('pointermove', function (e) {
      var b = card.getBoundingClientRect(); px = (e.clientX - b.left) / b.width; py = (e.clientY - b.top) / b.height;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        card.style.setProperty('--mx', (px * 100) + '%'); card.style.setProperty('--my', (py * 100) + '%');
        if (tilt) card.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * 7).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 9).toFixed(2) + 'deg) translateY(-4px)';
      });
    });
    card.addEventListener('pointerleave', function () { if (tilt) card.style.transform = ''; });
  });

  // ---------- Buttons lean a little towards the pointer ----------
  document.querySelectorAll('.btn, .hero-actions .plain').forEach(function (btn) {
    btn.addEventListener('pointermove', function (e) {
      var b = btn.getBoundingClientRect(), x = e.clientX - b.left - b.width / 2, y = e.clientY - b.top - b.height / 2;
      btn.style.transform = 'translate(' + (x * 0.18).toFixed(1) + 'px,' + (y * 0.25).toFixed(1) + 'px)';
    });
    btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
  });
})();
