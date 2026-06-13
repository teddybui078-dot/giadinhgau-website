# Gia Đình Gấu · The Bear Family

A single-page family website — minimal, sleek, light-mode, warm and playful. The
hero is an **Apple-style scroll-scrubbed video**: as you scroll, the camera
pushes through a misty forest to a cabin, the door opens, and the **five-bear
family is revealed** inside. The bears hold full-screen, then the page content
scrolls up on cream.

## Stack

- **Vite** + **vanilla JS** (ES modules) — static, no framework, no SSR
- **GSAP** + **ScrollTrigger** — pinned hero + scroll-scrub
- Plain CSS with custom properties (tokens in [`src/css/tokens.css`](src/css/tokens.css))
- Apple system font stack · brand: bear-brown `#9B6B43`, cream `#FBF7F0`, ink `#2B2320`

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/  (base: './', deploys to any static host)
npm run preview    # serve the production build locally
```

## The scroll-scrubbed video (plays across the whole page)

The clip is a **fixed full-viewport backdrop**; [`src/js/heroVideo.js`](src/js/heroVideo.js)
maps whole-page scroll progress (top → bottom) to the clip's `currentTime` via the
renderer in [`src/js/scrubVideo.js`](src/js/scrubVideo.js) — which eases
`currentTime` in its own rAF loop and seeks at most once per *presented* frame
(`requestVideoFrameCallback`) so the scrub stays smooth. Content sections float
over the backdrop on translucent cards, so the camera pushes through the forest
to the cabin and reveals the family right as you reach the footer. The hero
wordmark fades over the first viewport. `?renderer=canvas` forces the canvas
fallback; `prefers-reduced-motion` (test with `?motion=reduce`) hides the video
and shows the finale frame as a static poster while content scrolls normally.

### Video assets (re-encoded for smooth scrubbing)

The clip **must be all-intra** (every frame a keyframe) or seeking stutters.
Re-encode the raw 4K source (gitignored at the repo root) into `public/video/`:

```bash
# desktop 1440² + mobile 864², audio stripped, all-intra, faststart
ffmpeg -i animationvid-v2-4k.mp4 -an -vf "scale=1440:1440:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 22 -g 1 -keyint_min 1 -sc_threshold 0 \
  -x264-params "no-scenecut=1" -movflags +faststart public/video/bear-house-desktop.mp4
ffmpeg -i animationvid-v2-4k.mp4 -an -vf "scale=864:864:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 24 -g 1 -keyint_min 1 -sc_threshold 0 \
  -x264-params "no-scenecut=1" -movflags +faststart public/video/bear-house-mobile.mp4
# posters: finale frame (poster) + opening frame (<video poster>)
ffmpeg -sseof -0.1 -i animationvid-v2-4k.mp4 -frames:v 1 -vf "scale=1200:1200:flags=lanczos" -q:v 3 public/img/bear-house-poster.jpg
ffmpeg -i animationvid-v2-4k.mp4 -frames:v 1 -vf "scale=1200:1200:flags=lanczos" -q:v 3 public/img/bear-house-first.jpg
```

To swap the clip, drop a new source mp4 at the root and re-run the commands above
(`pickSource()` in `scrubVideo.js` chooses mobile vs desktop by width).

## Project layout

```
index.html                 fixed .scrub-backdrop (video) + hero overlay + sections
src/
  main.js                  boot: CSS imports, reduced-motion branch, initHeroVideo
  js/
    heroVideo.js           ★ pin + scroll-scrub wiring, overlay fade, fallback
    scrubVideo.js          the rAF-lerp currentTime/canvas scrub engine
    reveal.js              section fade-ins on scroll
    reducedMotion.js       reads the pre-paint motion preference
  css/                     tokens · base · hero-video · sections · components
public/video/              bear-house-1080.mp4, bear-house-720.mp4 (all-intra)
public/img/                bear-house-poster.jpg (bears), bear-house-first.jpg (misty)
```

Content sections (Our Story, The Family, Memories, A Favorite Place, Footer)
fade in on scroll on the cream page below the hero.
