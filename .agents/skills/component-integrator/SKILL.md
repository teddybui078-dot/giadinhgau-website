---
name: component-integrator
description: Use when the user pastes a third-party UI component prompt (21st.dev, Aceternity, MagicUI, ReactBits, shadcn registry, ibelick/motion-primitives, or any "here's a component, integrate it" blob containing one or more code blocks with file paths/filenames as headers). Handles the two states the user almost always lands in — "keep the component the same" (faithful integration) and "tweak X" (selective edit while preserving the component's identity). Triggers on phrases like "integrate this component," "here's a 21st dev prompt," "use this component," "copy this in," or when the user dumps a multi-file code blob with `npm install` instructions at the bottom.
---

# Component Integrator

You've been handed a component prompt from a registry-style source (21st.dev, Aceternity, MagicUI, shadcn registry, ReactBits, motion-primitives, or hand-rolled). Your job is to integrate it into the current project cleanly, then either keep it untouched or make the specific tweaks the user asks for — without breaking the design intent of the component.

## Recognize the format first

These prompts almost always share the same shape:

1. **Preamble** describing project requirements ("shadcn project structure, Tailwind, TypeScript").
2. **Main component code** in one or more fenced code blocks, usually with the filename on the first line of the block or as a header above it (e.g., `splite.tsx`, `demo.tsx`).
3. **Dependency components** in additional code blocks, often with a source/path hint as the header (`aceternity/spotlight`, `ibelick/spotlight`, `shadcn/card`, `kokonut/floating-orbs`).
4. **NPM install list** — a single command or backticked package names.
5. **Integration guidelines / "questions to ask" / "steps to integrate"** boilerplate at the bottom.

If you see two or more of these, treat the message as a component prompt and follow this skill. If only one code block with no install instructions, it's probably a snippet — handle it normally.

## Mode 1 — Keep the component the same (default)

The user wants the component dropped in, working, untouched. Resist the urge to "improve" it. Faithful integration is the win.

### Execution order (don't reorder these)

1. **Inventory the prompt.** List every file in the prompt (main + deps), the exact target paths, and the install command. Don't start writing yet.
2. **Verify the stack.** Check `package.json` for:
   - Tailwind version (v3 vs v4 — they configure differently)
   - TypeScript
   - The aliases (`@/components`, `@/lib/utils`)
   - Whether `cn` from `@/lib/utils` already exists
   - Whether `clsx` + `tailwind-merge` (or `class-variance-authority`) are installed
   If any of these are missing, fix the foundation **before** dropping the component in. A component that depends on `@/lib/utils` will fail silently otherwise.
3. **Install dependencies.** Run the install command verbatim. Add `--legacy-peer-deps` only if React 19 peer warnings actually block install. If npm cache is broken, set `npm_config_cache=/tmp/npm-cache-<project>` for the session.
4. **Place files in the canonical locations.** Don't invent new paths.
   - Primitives → `components/ui/<name>.tsx`
   - Demo/example components → `components/sections/<Name>Demo.tsx` or `components/demos/<Name>.tsx`
   - The default `components/ui/` directory matters because every shadcn-style import assumes it. If the project uses `src/components/`, mirror that.
5. **Add the file content verbatim.** Don't reformat, don't rename props, don't strip `"use client"` directives, don't add comments. The code as written is the spec.
6. **Substitute asset placeholders.** The prompt often says "fill image assets with Unsplash stock images" or shows `https://prod.spline.design/...`. Use the URLs in the prompt as-is unless the user has supplied their own assets.
7. **Wire one usage** in `app/page.tsx` or wherever the user pointed you. If they didn't point anywhere, ask — don't guess.
8. **Verify visually.** Start the dev server, hit the page, take a screenshot via chrome-devtools-mcp, and confirm the component renders without console errors. Component prompts frequently ship with broken or outdated package versions — catching it now saves a follow-up round.

### Hard rules for keep-the-same mode

- **Don't merge two components into one.** If the prompt ships `splite.tsx` *and* `demo.tsx`, both files exist. The demo wraps the primitive — that separation is the point.
- **Don't substitute "equivalent" packages.** If the prompt installs `framer-motion`, install `framer-motion`, even if the project already uses `motion`. Wait for the user to ask before consolidating.
- **Don't restyle.** The component's color, radius, padding, shadow and animation values are the design. Changing them defeats the purpose of using the registry.
- **Don't strip the `'use client'` directive** at the top of the file — Next.js will break otherwise.
- **Keep the imports the prompt uses.** If it imports `Spotlight` from a different path than you'd choose, leave it.

## Mode 2 — Tweak something

The user already has the component installed (or will, momentarily) and wants specific changes. Their instruction will usually be one of these shapes:

| User says | What it means |
| --- | --- |
| "Change the copy to X" | Replace text content only. Don't touch structure or styles. |
| "Make it [color]" | Swap the accent color token. Find every reference (CSS vars, Tailwind classes, gradient stops, glow colors) and update them together. |
| "Make it smaller / bigger" | Adjust the height/size prop or root container dimensions, not the inner content scale. |
| "Use a different [model/image/icon]" | Replace the asset URL or icon import. Leave everything else. |
| "Make it on-brand" | Map the component's tokens to the project's own design tokens (`text-flame-400` instead of `text-purple-500`, the project's font family, etc.). |
| "Move it to a different section" | Re-mount the component elsewhere. Don't refactor it. |
| "Animate it differently" | Edit only the motion props (`transition`, `initial`, `animate`, `whileHover`). Keep DOM structure intact. |
| "Add interactivity" | Wrap the existing component, don't fork it. Pass new props down. |

### The tweak protocol

1. **Identify the smallest possible change.** Most "tweaks" are 1–3 lines, not a rewrite. If you find yourself rewriting more than 30% of the file, stop and ask the user whether they want a fork instead.
2. **Preserve the component's identity.** Whatever made the user pick this component (the 3D scene, the spotlight effect, the orbit animation) stays untouched unless they explicitly named it as the thing to change.
3. **Touch every related token together.** If you change the accent from purple to flame-orange, every gradient stop, every `box-shadow` glow color, every focus ring, every hover state needs to update in the same edit. Half-migrated palettes look broken.
4. **Don't introduce new dependencies for a tweak.** If they want "a slightly different animation," edit the existing `motion` props — don't pull in GSAP.
5. **Verify the same way as Mode 1.** Reload, screenshot, confirm no regressions.

## When the prompt itself is half-broken

Registry prompts are frequently out of date. Watch for:

- **Tailwind v3 utilities used in a v4 project.** `bg-opacity-X` and `text-opacity-X` are deprecated — translate to `bg-white/10` syntax.
- **`framer-motion` imports.** New projects use `motion` (`import { motion } from "motion/react"`). Both work, but the project should stay consistent.
- **Old `next/image` props** (`layout`, `objectFit`) — Next 13+ removed these.
- **Missing `'use client'`** on components that use hooks. Add it if it's needed but missing.
- **Spline scenes that 404.** The URL in the prompt may have been deleted. If the network request fails, replace the scene URL with a different known-working one or swap for a custom R3F scene.
- **Aceternity/MagicUI utilities that assume CSS custom properties** the project doesn't define (`--radix-popover-content-transform-origin`). Either add the properties to `globals.css` or stub them.

Fix these silently in Mode 1. Call them out in Mode 2.

## Asking clarifying questions

In **auto mode**, don't ask — make the reasonable default choice (see the "Execution order" steps for what those are) and report what you assumed.

Outside auto mode, ask only when one of these is genuinely ambiguous:

- **Where should the component live on the page?** (If the prompt doesn't specify and there's no obvious slot.)
- **Which design tokens should it adopt?** (When the project has its own palette and the component uses Tailwind defaults like `purple-500`.)
- **Replace the demo content or keep it?** (If the prompt includes lorem-style demo content and the project clearly needs real copy.)

Never ask:
- What props will be passed in (the prompt or the demo file shows this).
- What the responsive behavior should be (the component declares its own breakpoints).
- Whether to install the listed dependencies (yes — that's the job).

## After integration

End your turn with three things:

1. **What you placed and where** — one line per file, with the absolute or repo-relative path.
2. **What you installed** — the exact package list with versions if you pinned any.
3. **A one-line verification result** — "renders cleanly at /, no console errors" or the specific issue if not.

If the user is in tweak mode, also include the **diff summary** — what specifically changed from the original component, in one short list.

## Anti-patterns

- Inlining a multi-file component into a single file "for simplicity." The separation is intentional.
- Renaming the component file because the original name (`splite.tsx`) seems like a typo. It might be; ship it anyway unless asked.
- Adding props the prompt didn't include because "they might be useful."
- Replacing demo imagery with your own taste. Use what the prompt ships with.
- Removing the `Suspense` boundary around lazy 3D imports. Component will SSR-crash without it.
- Wrapping the component in extra `<div>`s for "spacing." Add spacing via the parent that mounts the component, not inside the component file.
- Editing the component in place when the user wants a tweak you could've done by passing a prop (e.g., setting `className` from the outside).
