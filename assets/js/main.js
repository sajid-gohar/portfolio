(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => [...c.querySelectorAll(s)];

  // Theme toggle
  const root = document.documentElement, tbtn = document.getElementById('theme');
  const paint = () => { tbtn.firstElementChild.className = 'ph ph-' + (root.dataset.theme === 'dark' ? 'sun' : 'moon'); };
  paint();
  tbtn.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    paint();
  });

  // Reveal on scroll + count-up
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    $('[data-count]', e.target).forEach(count);
  }), { threshold: 0.15 });
  $('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 3) * 70 + 'ms'; io.observe(el); });
  function count(el) {
    const to = +el.dataset.count; if (reduce) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = (t) => { const p = Math.min((t - t0) / 1400, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  if (reduce) $('[data-count]').forEach((el) => (el.textContent = el.dataset.count));

  // 3D tilt + spotlight (direct style writes, no framework state)
  if (!reduce && matchMedia('(hover:hover)').matches) {
    $('.tilt').forEach((el) => {
      const max = +el.dataset.tilt || 8;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.classList.add('active');
        el.style.setProperty('--ry', ((x - 0.5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
      });
      el.addEventListener('pointerleave', () => { el.classList.remove('active'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
    // Magnetic buttons
    $('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  // Experience tabs with arrow-key support
  const tabs = $('[role=tab]');
  const select = (i, focus) => tabs.forEach((t, j) => {
    const on = i === j;
    t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    if (on && focus) t.focus();
  });
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select((i + k + tabs.length) % tabs.length, true); }
    });
  });

  // Marquee: duplicate once for a seamless loop
  const track = document.querySelector('.marquee-track');
  if (track) { track.append(...[...track.children].map((n) => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.querySelector('a').tabIndex = -1; return c; })); }
})();
