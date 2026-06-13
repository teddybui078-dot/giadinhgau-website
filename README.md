# giadinhgau-website

Frontend project for **Gia Đình Gấu**. Built in the Frontend Design Lab — see [`CLAUDE.md`](CLAUDE.md) for the design system, motion patterns, stack defaults, and skill routing.

## Status

Foundation set up. The site itself has not been scaffolded yet.

## Stack defaults

- **Next.js 16** (App Router, Turbopack)
- **React 19** + TypeScript 5+
- **Tailwind v4** via `@tailwindcss/postcss` — theme tokens live in `globals.css` under `@theme {}`, not `tailwind.config.ts`
- **Motion** (`motion/react`) for animation
- **@phosphor-icons/react** for icons
- **React Three Fiber** + `@react-three/drei` for 3D

## Design skills

15 design/skill packs are installed under [`.agents/skills/`](.agents/skills/) and pinned in [`skills-lock.json`](skills-lock.json). Restore them in a fresh checkout with:

```bash
npx skills experimental_install
npx skills list   # should show 15 skills
```

## Environment

Copy [`.env.example`](.env.example) to `.env` and fill in real values. `.env` is gitignored — never commit secrets.
