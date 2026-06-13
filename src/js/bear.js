import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ──────────────────────────────────────────────────────────────────────────
   THE SCROLL COMPANION BEAR

   The bear floats fixed on top of the page and travels a wavy path as you
   scroll, tied to ScrollTrigger scrub (scroll up = retrace). Transform-only
   (GPU); nothing here reads/writes layout during scroll.

   Position is computed by posAt(progress) and applied through a scrubbed proxy
   tween's onUpdate. (We drive the path ourselves rather than via MotionPath
   because MotionPath parameterises by arc-length — constant speed along the
   curve — which desyncs the bear from the section boundaries. Driving by scroll
   progress keeps the maths below in lock-step with the layout, which is what
   lets us guarantee the bear threads the gaps and never covers text.)

   To keep the promise "never covers text", the path is SECTION-AWARE:
     • Each section's text sits in an offset column, leaving an empty gutter on
       one side (alternating). The bear DWELLS in that gutter while the section
       is on screen — horizontally clear of the text the whole time, at any
       height.
     • The bear only crosses sides DURING the whitespace gap between sections,
       riding exactly on the moving seam (boundary − scroll) so it threads the
       gap instead of crossing over a paragraph.

   ── Tune here ──────────────────────────────────────────────────────────────
   marginVw      min gap kept from each screen edge (% vw)
   bandTopVh /   vertical band (% vh) the bear floats within while dwelling
   bandBotVh
   vDrift,       gentle up/down arcs + their size as it rides down a section
   driftAmt
   crossProgress half-width (in scroll progress) of each side-to-side crossing
   bearW         bear width in px (height follows the sprite's aspect ratio)
   scrub         seconds the bear takes to glide to the scroll position
   ────────────────────────────────────────────────────────────────────────── */
const CONFIGS = {
  desktop: { mq: 1024, marginVw: 4.5, bandTopVh: 22, bandBotVh: 80, vDrift: 3, driftAmt: 0.2, crossProgress: 0.06, bearW: 120, scrub: 0.8 },
  tablet:  { mq: 700,  marginVw: 3.5, bandTopVh: 24, bandBotVh: 80, vDrift: 3, driftAmt: 0.2, crossProgress: 0.07, bearW: 90,  scrub: 0.9 },
};
// At/below this width the layout is a single full-width column with no gutter,
// so the bear parks in the corner with an idle bob instead of covering text.
const CORNER_MAX_WIDTH = 700;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoother = (u) => u * u * u * (u * (u * 6 - 15) + 10);

const pickConfig = (w) => (w > CONFIGS.desktop.mq ? CONFIGS.desktop : CONFIGS.tablet);

/* Measure each section's empty-gutter centre + scroll extent. x comes straight
   from getBoundingClientRect (no horizontal scroll); y is made document-
   absolute by adding scrollY, so this is correct at any scroll position. */
function measurePlan(cfg, vw, halfW) {
  const margin = (vw * cfg.marginVw) / 100;
  const sections = [...document.querySelectorAll('[data-panel]')];
  return sections.map((sec) => {
    const content = sec.querySelector('.panel__content, .hero__content, .site-footer__inner') || sec;
    const cb = content.getBoundingClientRect();
    const r = sec.getBoundingClientRect();
    const top = r.top + window.scrollY;
    // content-right panels leave the LEFT gutter empty; everything else (hero,
    // content-left, centred footer) leaves the RIGHT gutter empty
    const bearLeft = sec.classList.contains('panel--right');
    let cx = bearLeft ? (margin + cb.left) / 2 : (cb.right + (vw - margin)) / 2;
    cx = clamp(cx, margin + halfW, vw - margin - halfW);
    return { cx, top };
  });
}

/* Returns posAt(progress) -> {x, y} translate for the #bear wrapper. */
function makePosAt(cfg, vw, vh, bw, bh) {
  const halfW = bw / 2;
  const halfH = bh / 2;
  const plan = measurePlan(cfg, vw, halfW);
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  const bandTop = (vh * cfg.bandTopVh) / 100;
  const bandBot = (vh * cfg.bandBotVh) / 100;
  const bandMid = (bandTop + bandBot) / 2;
  const bandH = bandBot - bandTop;
  const tw = cfg.crossProgress;

  const crossings = [];
  for (let i = 0; i < plan.length - 1; i++) {
    const boundaryDocY = plan[i + 1].top; // seam = top of next section
    const pc = clamp((boundaryDocY - vh / 2) / maxScroll, 0, 1);
    crossings.push({ pc, boundaryDocY, from: plan[i].cx, to: plan[i + 1].cx });
  }

  function posAt(p) {
    let slot = 0;
    for (const c of crossings) if (p >= c.pc) slot++;
    let cx = plan[slot].cx;
    let crossCy = 0;
    let seam = 0;
    for (const c of crossings) {
      if (Math.abs(p - c.pc) <= tw) {
        const u = (p - (c.pc - tw)) / (2 * tw);
        cx = lerp(c.from, c.to, smoother(u));
        // saturate fast so the bear is locked to the seam for the whole time
        // it's over content-x; releases only at the edges (safe in a gutter)
        crossCy = Math.min(1, Math.sin(Math.PI * u) * 1.9);
        seam = c.boundaryDocY - p * maxScroll;
        break;
      }
    }
    let cy = bandMid + bandH * cfg.driftAmt * Math.sin(p * Math.PI * cfg.vDrift);
    cy = lerp(cy, seam, crossCy);
    return { x: clamp(cx, halfW, vw - halfW) - halfW, y: clamp(cy, bandTop, bandBot) - halfH };
  }

  return { posAt, maxScroll };
}

export function initBear({ reduced }) {
  const bear = document.getElementById('bear');
  if (!bear) return null;
  const img = bear.querySelector('.bear-img');

  let travelTween = null;
  let personality = null;
  let mode = null; // 'travel' | 'corner'
  let resizeTimer = 0;
  let lastWidth = window.innerWidth;

  function startPersonality() {
    if (personality) return;
    // Infinite tweens on the INNER img (separate node) so they never collide
    // with the position transform on the outer #bear wrapper.
    personality = gsap.timeline();
    personality.to(img, { rotation: 4.5, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
    personality.to(img, { y: -11, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
  }

  function killTravel() {
    travelTween?.scrollTrigger?.kill();
    travelTween?.kill();
    travelTween = null;
  }

  function buildTravel() {
    const cfg = pickConfig(window.innerWidth);
    bear.style.width = cfg.bearW + 'px';
    const bw = bear.offsetWidth;
    const bh = bear.offsetHeight;
    const { posAt, maxScroll } = makePosAt(cfg, window.innerWidth, window.innerHeight, bw, bh);

    const proxy = { p: 0 };
    const place = () => {
      const { x, y } = posAt(proxy.p);
      gsap.set(bear, { x, y });
    };
    travelTween = gsap.to(proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: cfg.scrub,
        invalidateOnRefresh: true,
      },
      onUpdate: place,
    });
    place(); // position immediately so it never flashes in the corner
    bear.classList.add('is-ready');

    if (import.meta.env?.DEV) {
      window.__posAt = posAt;
      window.__bearMeta = { bw, bh, maxScroll };
    }
  }

  function enterTravel() {
    if (mode === 'travel') return;
    mode = 'travel';
    bear.classList.remove('bear--corner');
    gsap.set(img, { rotation: 0, y: 0 });
    buildTravel();
    startPersonality();
  }

  function enterCorner() {
    if (mode === 'corner') return;
    mode = 'corner';
    killTravel();
    personality?.kill();
    personality = null;
    gsap.set(bear, { clearProps: 'transform' });
    gsap.set(img, { clearProps: 'transform' });
    bear.style.width = '';
    bear.classList.add('bear--corner', 'is-ready');
  }

  function apply() {
    const w = window.innerWidth;
    if (reduced || w <= CORNER_MAX_WIDTH) enterCorner();
    else enterTravel();
  }

  function rebuild() {
    if (reduced || window.innerWidth <= CORNER_MAX_WIDTH) {
      enterCorner();
      return;
    }
    mode = null;
    enterTravel();
    ScrollTrigger.refresh();
  }

  ScrollTrigger.config({ ignoreMobileResize: true });

  // Rebuild only when WIDTH changes (ignore mobile URL-bar height jitter).
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        rebuild();
      }, 160);
    },
    { passive: true }
  );

  apply();

  return {
    // late-loading images change section heights → the seam alignment depends
    // on them, so rebuild (not just refresh) once they settle
    scheduleRefresh() {
      if (mode === 'travel') rebuild();
    },
  };
}
