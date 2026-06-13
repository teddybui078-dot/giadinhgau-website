import './css/tokens.css';
import './css/base.css';
import './css/components.css';
import './css/sections.css';
import './css/bear.css';

import { prefersReducedMotion } from './js/reducedMotion.js';

async function boot() {
  // Tiny housekeeping that should run regardless of motion preference.
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const reduced = prefersReducedMotion();

  // The bear always initialises — it decides internally whether to travel with
  // scroll or just idle-bob in the corner (reduced motion / very small screens).
  const { initBear } = await import('./js/bear.js');
  const bear = initBear({ reduced });

  const { initReveals } = await import('./js/reveal.js');
  initReveals({ reduced });

  if (reduced) return;

  // Section heights settle after webfonts + lazy images land; the bear path's
  // gap alignment + ScrollTrigger's end depend on document height, so rebuild
  // the path once everything is in rather than on every image.
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => bear?.scheduleRefresh?.());
}

boot();
