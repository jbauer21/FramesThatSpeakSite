/* =========================================================
   Frames That Speak — site interactions
   - Lightbox (focus-trapped, ESC closes, returns focus)
   - Scroll reveal (respects prefers-reduced-motion)
   - Active-section highlight in primary nav
   - Graceful image fallback for thumbnails (placeholder stays
     visible if file is missing)
   - Placeholder asset link guard (prevents 404 navigation)
   ========================================================= */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------- Thumb image hydration ---------
     If a real image exists at data-full, swap it in as the thumb.
     If it 404s, keep the typographic placeholder. */
  document.querySelectorAll('.thumb[data-full]').forEach(btn => {
    const src = btn.getAttribute('data-full');
    if (!src) return;
    const test = new Image();
    test.onload = () => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = ''; // decorative inside button; button has aria-label
      img.loading = 'lazy';
      img.decoding = 'async';
      btn.prepend(img);
      btn.dataset.hasImage = 'true';
    };
    test.onerror = () => { /* keep placeholder */ };
    test.src = src;
  });

  /* --------- Lightbox --------- */
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('.lb-img');
  const lbCaption = lb.querySelector('.lb-caption');
  const lbClose = lb.querySelector('.lb-close');
  let lastFocus = null;

  function openLightbox(src, caption) {
    lbImg.src = src;
    lbImg.alt = caption || '';
    lbCaption.textContent = caption || '';
    lb.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    lastFocus = document.activeElement;
    lbClose.focus();
    document.addEventListener('keydown', onKey);
  }

  function closeLightbox() {
    lb.hidden = true;
    lbImg.removeAttribute('src');
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
    if (e.key === 'Tab') {
      // Trivial focus trap: keep focus on close button
      e.preventDefault();
      lbClose.focus();
    }
  }

  document.querySelectorAll('.thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      // Only open if a real image hydrated
      if (btn.dataset.hasImage !== 'true') return;
      const src = btn.getAttribute('data-full');
      const caption = btn.getAttribute('aria-label') || '';
      openLightbox(src, caption);
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLightbox();
  });

  /* --------- Scroll reveal --------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll('.section, .hero-inner');
    targets.forEach(el => el.classList.add('reveal'));

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

    targets.forEach(el => io.observe(el));
  }

  /* --------- Active nav highlight --------- */
  const navLinks = document.querySelectorAll('.primary-nav a[href^="#"]');
  const sectionMap = new Map();
  navLinks.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    const sec = document.getElementById(id);
    if (sec) sectionMap.set(sec, a);
  });

  if ('IntersectionObserver' in window && sectionMap.size) {
    const navIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const link = sectionMap.get(entry.target);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.removeAttribute('aria-current'));
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

    sectionMap.forEach((_, sec) => navIO.observe(sec));
  }

  // Style hook for current nav item
  const style = document.createElement('style');
  style.textContent = `
    .primary-nav a[aria-current="true"] {
      color: var(--text);
      background: color-mix(in srgb, var(--gold) 14%, transparent);
      box-shadow: inset 0 -1px 0 var(--gold);
    }
  `;
  document.head.appendChild(style);

  /* --------- Placeholder link guard ---------
     Buttons that point at not-yet-uploaded assets get
     intercepted; they show their tooltip instead of 404'ing. */
  document.querySelectorAll('a[data-placeholder]').forEach(a => {
    a.addEventListener('click', async (e) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http')) return;
      // Probe with HEAD; if the asset doesn't exist, prevent navigation.
      e.preventDefault();
      try {
        const res = await fetch(href, { method: 'HEAD' });
        if (res.ok) {
          window.location.href = href;
        } else {
          flashTooltip(a);
        }
      } catch {
        flashTooltip(a);
      }
    });
  });

  function flashTooltip(el) {
    el.classList.add('is-flashing');
    el.setAttribute('aria-disabled', 'true');
    setTimeout(() => el.classList.remove('is-flashing'), 1400);
  }

  // Inject a tiny style for the flash state
  const flashStyle = document.createElement('style');
  flashStyle.textContent = `
    .btn.is-flashing::after { opacity: 1 !important; }
    .btn[aria-disabled="true"] { cursor: not-allowed; }
  `;
  document.head.appendChild(flashStyle);

})();
