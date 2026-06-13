/* AB360WEB front-end interactions */
(function () {
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Nav scroll state + burger */
  var nav = document.getElementById('nav');
  var onScroll = function () { nav && nav.classList.toggle('scrolled', scrollY > 30); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var burger = document.getElementById('burger'), links = document.getElementById('navlinks');
  if (burger && links) burger.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });

  /* GSAP animations (graceful if CDN blocked) */
  if (!reduced && window.gsap) {
    gsap.registerPlugin(window.ScrollTrigger);

    /* Hero split-text headline */
    document.querySelectorAll('[data-split]').forEach(function (el) {
      var text = el.textContent; el.textContent = '';
      text.split(' ').forEach(function (w, i) {
        var s = document.createElement('span'); s.className = 'char'; s.textContent = w + '\u00A0'; el.appendChild(s);
      });
      gsap.fromTo(el.querySelectorAll('.char'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .05, ease: 'power3.out', delay: .15 });
    });

    /* Hero elements */
    gsap.fromTo('[data-h]', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .12, ease: 'power2.out', delay: .4 });

    /* Scroll reveals */
    document.querySelectorAll('.reveal').forEach(function (el) {
      gsap.fromTo(el, { y: 26, opacity: 0 }, {
        y: 0, opacity: 1, duration: .7, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 86%' }
      });
    });

    /* Parallax glows */
    gsap.to('.g1', { yPercent: 18, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.g2', { yPercent: -14, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  } else {
    document.querySelectorAll('.reveal,[data-h]').forEach(function (el) { el.style.opacity = 1; el.style.translate = 'none'; });
  }

  /* Animated counters */
  var counters = document.querySelectorAll('.count');
  if ('IntersectionObserver' in window && counters.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        var to = parseInt(e.target.dataset.to || '0', 10), t0 = null;
        var step = function (ts) {
          if (!t0) t0 = ts; var p = Math.min((ts - t0) / 1400, 1);
          e.target.textContent = Math.floor(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-IN');
          if (p < 1) requestAnimationFrame(step);
        };
        reduced ? e.target.textContent = to.toLocaleString('en-IN') : requestAnimationFrame(step);
      });
    }, { threshold: .6 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* Magnetic buttons */
  if (!reduced) document.querySelectorAll('.magnetic').forEach(function (b) {
    b.addEventListener('mousemove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * .18 + 'px,' + (e.clientY - r.top - r.height / 2) * .3 + 'px)';
    });
    b.addEventListener('mouseleave', function () { b.style.transform = ''; });
  });

  /* Tilt cards */
  if (!reduced && matchMedia('(pointer:fine)').matches) document.querySelectorAll('.tilt').forEach(function (c) {
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = 'translateY(-6px) rotateX(' + (-y * 6) + 'deg) rotateY(' + (x * 6) + 'deg)';
    });
    c.addEventListener('mouseleave', function () { c.style.transform = ''; });
  });

  /* Lead forms (AJAX) */
  document.querySelectorAll('[data-lead]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Sending…';
      var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.source = form.dataset.source || 'website'; data.page = location.pathname;
      fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.ok) {
            form.querySelectorAll('label,.grid2,button,.tiny').forEach(function (el) { el.style.display = 'none'; });
            var ok = form.querySelector('.form-ok'); if (ok) ok.hidden = false;
            try { localStorage.setItem('ab_lead', '1'); } catch (e) {}
            var pop = document.getElementById('popup'); if (pop) pop.hidden = true;
          } else { throw 0; }
        })
        .catch(function () {
          var er = form.querySelector('.form-err'); if (er) er.hidden = false;
          btn.disabled = false; btn.textContent = 'Try again';
        });
    });
  });

  /* Popup (after 18s, once per day, never after a lead) */
  var pop = document.getElementById('popup');
  if (pop) {
    var can = true;
    try { can = !localStorage.getItem('ab_lead') && localStorage.getItem('ab_pop') !== new Date().toDateString(); } catch (e) {}
    if (can) setTimeout(function () {
      pop.hidden = false;
      try { localStorage.setItem('ab_pop', new Date().toDateString()); } catch (e) {}
    }, 18000);
    var x = document.getElementById('popupx');
    if (x) x.addEventListener('click', function () { pop.hidden = true; });
    pop.addEventListener('click', function (e) { if (e.target === pop) pop.hidden = true; });
  }

  /* Analytics beacon */
  try {
    if (!location.pathname.startsWith('/admin')) {
      navigator.sendBeacon ?
        navigator.sendBeacon('/api/track', new Blob([JSON.stringify({ path: location.pathname })], { type: 'application/json' })) :
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: location.pathname }), keepalive: true });
    }
  } catch (e) {}
})();
