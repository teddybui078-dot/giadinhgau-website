# The Frontend Design Lab

This directory is where landing pages, product UI, and frontend experiments live. Skills are installed under `.agents/skills/` and are routed by the table at the bottom of this file. Read that table **before** picking a skill — the descriptions overlap, and grabbing the wrong one wastes the rest of the session.

---

## First-run setup — bootstrap a new directory with these skills

**Run this section the first time you open any directory that doesn't already have `.agents/skills/` populated.** If `.agents/skills/` exists and is non-empty, skip — the skills are already there.

This directory's skill set is defined in [`skills-lock.json`](skills-lock.json). Everything below restores parity with it.

### Quick path (preferred — uses the lockfile)

```bash
# 1. Copy this CLAUDE.md and skills-lock.json into the new directory's root.
#    Do this from inside the new project directory:
cp /Users/namanhbuiteddy/Documents/CLAUDECODE/Atlas/CLAUDE.md .
cp /Users/namanhbuiteddy/Documents/CLAUDECODE/Atlas/skills-lock.json .

# 2. Restore every skill listed in skills-lock.json from its source repo:
npx skills experimental_install

# 3. Confirm — should print 14 skills (or whatever the lockfile contains):
npx skills list
```

### Manual path (when the lockfile is missing or you only want some skills)

The skills come from three GitHub sources. Install with `npx skills add <source>`:

```bash
# 12 design + image skills from Leon's taste-skill repo
npx skills add Leonxlnx/taste-skill --all

# Emil Kowalski's design-engineering rules
npx skills add emilkowalski/skill --all

# Pascal Bakaus's "impeccable" frontend skill
npx skills add pbakaus/impeccable --all
```

`--all` is shorthand for `--skill '*' --agent '*' -y` — installs every skill in the repo, wires it into every detected agent (Claude Code, Codex, Cursor, etc.), and skips the y/n prompt.

### Locally-authored skills (not in any GitHub repo)

Some skills live only in this directory and aren't restored by the lockfile because they have no upstream source. Currently:

- `component-integrator` — handles 21st.dev / Aceternity / shadcn registry component prompts.

Copy these manually:

```bash
mkdir -p .agents/skills/component-integrator
cp /Users/namanhbuiteddy/Documents/CLAUDECODE/Atlas/.agents/skills/component-integrator/SKILL.md \
   .agents/skills/component-integrator/SKILL.md
```

When you author a new local skill, drop it under `.agents/skills/<name>/SKILL.md` (mirroring the structure of the others) and add a line to the "Locally-authored skills" list above so future setups grab it too.

### Verifying setup

```bash
ls .agents/skills/        # should show 14+ directories
npx skills list           # human-readable summary
```

If a skill is missing, re-run `npx skills experimental_install` or the matching manual command.

### npm cache gotcha

If `npm install` or `npx skills add` fails with an ENOENT in `~/.npm/_cacache/`, the user's npm cache has permission damage from a prior install. Don't `sudo chown` — just use a scratch cache for this session:

```bash
export npm_config_cache=/tmp/npm-cache-$(basename "$PWD")
```

Then re-run the failing command. This avoids touching system permissions and works for both `npm install` and `npx`.

---

## Reference project: `pointer/`

A Next.js 16 + Tailwind v4 landing page for "Pointer," a fast on-device writing AI. Stack: React 19, Motion (formerly Framer Motion), React Three Fiber + drei for 3D, `@phosphor-icons/react`, `clsx` + `tailwind-merge`. Dark theme on `--color-ink-950` with a single flame-orange accent. Use it as the working reference for everything below.

---

## What worked — patterns to reuse

These are the moves that landed. When you start a new frontend page in Atlas, lift these directly.

### Design tokens (Tailwind v4 in CSS, not JS)

Define palette + custom easings inside `@theme { ... }` in `globals.css`. Tailwind v4 doesn't need `tailwind.config.ts` — the CSS *is* the config. See [pointer/app/globals.css](pointer/app/globals.css).

```css
@theme {
  --color-ink-950: #07080b;       /* base; never use #000 */
  --color-flame-400: #ff6a1f;      /* single accent — no purple/blue glow */
  --ease-out-quint: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out-quint: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

**Rules of thumb that held up:**

- One accent color, desaturated. Built-in CSS easings (`ease-out`, `ease-in-out`) feel weak — use the custom curves above on every transition over 150 ms.
- Off-black, never `#000`.
- Geist for everything. No Inter, no serifs in product UI.

### Layout — the "double-bezel" card

Every major card uses a nested outer-shell + inner-core pair with concentric radii. Outer wrapper has `p-1.5` and a hairline border; inner has its own bg and `rounded-[calc(2.25rem-0.375rem)]`. See the Hero spline card in [pointer/components/sections/Hero.tsx](pointer/components/sections/Hero.tsx) and the CTA card in [pointer/components/sections/CtaFooter.tsx](pointer/components/sections/CtaFooter.tsx). This single pattern is what makes the surfaces look like machined hardware instead of `<div>`s.

### Buttons — magnetic CTA + button-in-button

[pointer/components/ui/magnetic-button.tsx](pointer/components/ui/magnetic-button.tsx) — `useMotionValue` + `useSpring` for the pull-toward-cursor effect, kept outside the React render cycle. **Don't use `useState` for hover motion** — it tanks mobile perf. Pair every primary CTA with a nested trailing arrow inside its own circular pill (`group-hover:translate-x-0.5 -translate-y-[1px]`).

### Motion — what to animate, what not to

- Hero entrance: `opacity + y + filter: blur(8px) → blur(0)` over 0.6–0.85 s, stagger by 0.06–0.12 s. Never `scale(0)` — start from `scale(0.95)` minimum.
- Headings: wrap in `<Parallax strength={40}>` ([pointer/components/ui/scroll-reveal.tsx](pointer/components/ui/scroll-reveal.tsx)) so they drift opposite the body copy as the section scrolls through the viewport.
- Section dividers: animated SVG paths whose `pathLength` is bound to scroll position ([pointer/components/ui/section-divider.tsx](pointer/components/ui/section-divider.tsx)). Cheap, eye-catching, GPU-only.
- Hover spotlight on cards: store mouse position as CSS custom props (`--mx`, `--my`) on the parent, then `radial-gradient(circle at var(--mx) var(--my), ...)` on a pseudo-layer. See [pointer/components/sections/Bento.tsx](pointer/components/sections/Bento.tsx) `Tile` component.
- Scroll progress: 2 px gradient bar at the top, `scaleX` driven by `useScroll().scrollYProgress` through a spring. See [pointer/components/ui/scroll-progress.tsx](pointer/components/ui/scroll-progress.tsx).

### Live demo (the feature centerpiece)

[pointer/components/sections/LiveDemo.tsx](pointer/components/sections/LiveDemo.tsx) — instead of a video, the document literally rewrites itself as the section scrolls into view: red-squiggly errors crossfade with blur into green-underlined fixes, and a floating popover narrates each rewrite with a fake latency stamp. This is the highest-leverage section on the page; for a similar product, build the equivalent: show the thing doing the thing.

### 3D — React Three Fiber, not Spline

Started with Spline, switched to R3F because:
1. The custom mascot needs to relate to the product (Pointer = a fountain pen mascot).
2. Spline scenes are opaque binary blobs and impossible to iterate on quickly.
3. R3F gives precise control over materials, lights, and cursor coupling.

[pointer/components/ui/pointer-pen.tsx](pointer/components/ui/pointer-pen.tsx). Lessons from the failed first attempt:

- **No `MeshTransmissionMaterial` + HDR `<Environment>` combo on mid-range GPUs** — it lost the WebGL context. Use `MeshStandardMaterial` + 3–4 directional/point lights. Same look, no context loss.
- Cap DPR at `[1, 1.5]` not `[1, 2]`.
- `toneMapped={false}` on emissive materials blows out the canvas if intensities are >2 — keep them under 2.5 unless you also add a tone-mapping pass.
- Track mouse in a `useRef<Vector2>` updated from a `window` listener, then `THREE.MathUtils.damp` toward it inside `useFrame`. Direct `useState` will re-render every frame and kill perf.

### Page composition checklist

```
<AmbientBackground variant="page" />   // fixed, full-page, behind all content
<ScrollProgress />                     // top, 2px
<Nav />                                // floating glass pill that shrinks on scroll
<Hero />
<SectionDivider />
<LiveDemo />
<SectionDivider flip />
<Bento />                              // grid-flow-dense, asymmetric col-spans
<Marquee />                            // breaks visual rhythm between text sections
<SpeedComparison />                    // animated bars + count-up
<SectionDivider />
<Testimonials />                       // asymmetric, one large featured quote
<CtaFooter />
```

### Anti-patterns to stay clear of

- `transition: all` — name the properties.
- Centered hero with 6-line H1 — use editorial split, max-w wide, 2–3 lines.
- `backdrop-blur` on a scrolling container — only on fixed/sticky elements (nav, overlays).
- `grain-overlay` on scrolling content — only on `position: fixed; pointer-events: none`.
- Animating `width` / `height` / `top` / `left` — only `transform` and `opacity`.
- Names like "John Doe," "Acme," "Nexus" — use believable, varied real-world names.
- Generic stock photo avatars — use `picsum.photos/seed/{slug}` with `grayscale contrast-110`.

---

## Skill routing — which `.agents/skills/*` to load

The skill library has 14 design skills with overlapping descriptions. Use this table as the index — load **one** skill that matches the task, not three.

### By task type

| You are doing… | Load skill |
| --- | --- |
| **Planning a new landing page from scratch** (no code yet) | `impeccable` — it's the catch-all for design/redesign/critique with the broadest mandate |
| **Implementing a landing page section** (writing JSX + Tailwind right now) | `design-taste-frontend` — has the exact tokens, motion rules, and bias-correction directives |
| **Adding GSAP scroll choreography, pinning, scrubbing, horizontal scroll** | `gpt-taste` — only skill that actually requires GSAP + AIDA structure |
| **Auditing or upgrading an existing project's UI** | `redesign-existing-projects` — built for "make this not look AI-generated anymore" |
| **Building dense product UI / dashboards / app shells** | `impeccable` first; `industrial-brutalist-ui` only if the brand is engineering/security/military |
| **Animating UI primitives** (buttons, dropdowns, tooltips, drawers, popovers) | `emil-design-eng` — opinionated rules on easings, durations, transform-origins, spring vs duration |
| **Writing/editing motion code that already exists** | `emil-design-eng` |
| **User pastes a 21st.dev / Aceternity / MagicUI / shadcn registry component prompt** | `component-integrator` — handles both "keep it the same" and "tweak X" flows |
| **Modifying or restyling a third-party component already in the project** | `component-integrator` (Mode 2: tweak) |
| **Creating a brand identity kit / logo board / visual world** | `brandkit` (image generation only) |
| **Generating reference imagery for a website before coding** | `imagegen-frontend-web` (one image per section, never composite) |
| **Generating mobile app screen concepts** | `imagegen-frontend-mobile` (image generation only) |
| **Recreating a website from a screenshot or mockup** | `image-to-code` |
| **Writing a `DESIGN.md` for a Google Stitch project** | `stitch-design-taste` |
| **Editorial / warm / serif minimalist site (no gradients, no glow)** | `minimalist-ui` |
| **Long file output that hits token limits or returns placeholders** | `full-output-enforcement` (stack on top of another skill) |

### Decision shortcuts

- **One skill is almost always enough.** Stacking three motion skills produces conflicting rules. Pick the most specific one for the task in front of you.
- **`impeccable` vs `design-taste-frontend`:** `impeccable` is broader and more about *judgment* (what to fix, why); `design-taste-frontend` is more *prescriptive* (use this easing, this token, this class). Brainstorm with the first, implement with the second.
- **`design-taste-frontend` vs `gpt-taste`:** Both are implementation-tier. `design-taste-frontend` defaults to Framer Motion + Tailwind. `gpt-taste` defaults to GSAP + ScrollTrigger and mandates an AIDA structure. Pick by motion library, not by aesthetic.
- **`emil-design-eng` is a co-skill, not a primary.** It rarely composes a whole page on its own — load it when you're polishing an interaction (dropdown timing, button feel, drawer easing, tooltip delay).
- **Aesthetic-modifier skills (`minimalist-ui`, `industrial-brutalist-ui`):** Only load when the brand actually calls for that vibe. Don't apply brutalist styling to a consumer app.
- **Anything ending in `-imagegen` writes zero code.** Use only when you need design references generated before/during implementation.

### Superpowers skills (the `superpowers:*` family)

These are process skills, not visual ones. Default behavior:

| Situation | Skill |
| --- | --- |
| Starting any new feature or page | `superpowers:brainstorming` (before code) |
| Bug, test failure, or unexpected behavior | `superpowers:systematic-debugging` |
| Multi-step plan with checkpoints | `superpowers:writing-plans` then `superpowers:executing-plans` |
| Before claiming done / before PR | `superpowers:verification-before-completion` |
| 2+ independent tasks at once | `superpowers:dispatching-parallel-agents` |

---

## Stack defaults for new projects in this directory

- Next.js 16 (App Router, Turbopack). Read `node_modules/next/dist/docs/` before writing code — v16 has breaking changes from common training data.
- React 19, TypeScript 5+.
- Tailwind v4 via `@tailwindcss/postcss`. Theme tokens in `globals.css` under `@theme {}`, never `tailwind.config.ts`.
- Motion (`motion` package, ESM import `motion/react`). The legacy `framer-motion` import path still works but prefer the new one.
- `@phosphor-icons/react/dist/ssr` for icons.
- React Three Fiber + `@react-three/drei` for 3D. Skip Spline.
- npm with `--legacy-peer-deps` because React 19 hasn't fully propagated through every transitive dep. If npm cache is broken, set `npm_config_cache=/tmp/npm-cache-pointer` for the session.
