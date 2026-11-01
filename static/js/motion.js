// Sliding indicator under the nav links: one accent bar that follows the hovered link
// and rests under the current page. (Everything else on the site stays still on purpose.)
(function () {
  'use strict';
  var links = document.querySelector('.links');
  if (!links) return;
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
})();
