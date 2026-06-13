# Gia Đình Gấu · The Bear Family

A single-page family website — minimal, sleek, light-mode, warm and playful. Its
signature feature is a small 3D bear that floats on top of the page and travels
a wavy path alongside you as you scroll (inspired by treehacks.com's scroll
creature), threading the whitespace between sections so it never covers text.

## Stack

- **Vite** + **vanilla JS** (ES modules) — static, no framework, no SSR
- **GSAP** + **ScrollTrigger** — scrub-driven scroll choreography
- Plain CSS with custom properties (tokens in [`src/css/tokens.css`](src/css/tokens.css))
- Apple system font stack · brand: bear-brown `#9B6B43`, cream `#FBF7F0`, ink `#2B2320`

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/  (base: './', deploys to any static host)
npm run preview    # serve the production build locally
```

## Project layout

```
index.html                 sections + #bear + pre-paint reduced-motion script
src/
  main.js                  boot: imports CSS, registers plugins, inits modules
  js/
    bear.js                ★ the scroll-companion bear (path, scrub, personality)
    reveal.js              section fade-ins on scroll
    reducedMotion.js       reads the pre-paint motion preference
  css/                     tokens · base · bear · sections · components
public/img/                bear.png (hoodie), bear-plain.png (footer)
scripts/cutout.mjs         turns the source renders into transparent sprites
```

## The bear

[`src/js/bear.js`](src/js/bear.js) has a block of tunable constants at the top
(waves' gutter dwell, band, crossing width, bear size, scrub). The path is
**section-aware**: the bear dwells in the empty gutter beside each section and
only crosses sides through the whitespace gap between sections (riding the
moving seam), which is what keeps it off the text. It's transform-only (GPU),
respects `prefers-reduced-motion` (parks in the corner with an idle bob), and
on phones (≤700px) it parks in the corner since a single-column layout has no
gutter to travel in. Test reduced motion with `?motion=reduce`.

### Swapping the companion sprite

The traveling bear is `public/img/bear.png` (the hooded bear). To swap it for
the plain bear, replace that file (or repoint the `<img class="bear-img">` src
in `index.html`). Re-cut either source render with:

```bash
node scripts/cutout.mjs <source>.png /tmp/out.png   # transparent flood-fill cutout
sips -Z 320 /tmp/out.png --out public/img/bear.png   # downscale, keeps alpha
```
