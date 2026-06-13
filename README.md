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

## The scroll-scrubbed hero

[`src/js/heroVideo.js`](src/js/heroVideo.js) pins a full-viewport stage and maps
scroll progress to the clip's `currentTime` via the renderer in
[`src/js/scrubVideo.js`](src/js/scrubVideo.js) — which eases `currentTime` in its
own rAF loop and seeks at most once per *presented* frame (`requestVideoFrame­
Callback`) so the scrub stays smooth. Tunables at the top of `heroVideo.js`:
`SCRUB_VH` (scroll length), `HOLD` (how long the bears hold), `FADE_OUT`
(wordmark fade). `?renderer=canvas` forces the canvas fallback. `prefers-reduced-
motion` (test with `?motion=reduce`) skips the video entirely and shows the
bears as a static poster while content scrolls normally.

### Video assets (re-encoded for smooth scrubbing)

The hero clip **must be all-intra** (every frame a keyframe) or seeking stutters.
Re-encode the raw source (`animation-video.mp4`, gitignored) into `public/video/`
with ffmpeg:

```bash
# desktop 1080² + mobile 720², audio stripped, all-intra, faststart
ffmpeg -i animation-video.mp4 -an -vf "scale=1080:1080:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 20 -g 1 -keyint_min 1 -sc_threshold 0 \
  -x264-params "no-scenecut=1" -movflags +faststart public/video/bear-house-1080.mp4
ffmpeg -i animation-video.mp4 -an -vf "scale=720:720:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 21 -g 1 -keyint_min 1 -sc_threshold 0 \
  -x264-params "no-scenecut=1" -movflags +faststart public/video/bear-house-720.mp4
# posters
ffmpeg -sseof -0.1 -i animation-video.mp4 -frames:v 1 -vf "scale=1080:1080:flags=lanczos" -q:v 3 public/img/bear-house-poster.jpg
ffmpeg -i animation-video.mp4 -frames:v 1 -vf "scale=1080:1080:flags=lanczos" -q:v 3 public/img/bear-house-first.jpg
```

To swap the clip, drop a new `animation-video.mp4` in the root and re-run the
commands above (`pickSource()` in `scrubVideo.js` chooses 720 vs 1080 by width).

## Project layout

```
index.html                 hero-video (track/stage/video/overlay/poster) + sections
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
