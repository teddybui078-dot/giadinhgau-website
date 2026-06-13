import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';

// base: './' so the built dist/ works from any static host or subpath
// (GitHub Pages, Netlify, plain file server) without rewriting asset URLs.
//
// Multi-page build: every .html file in the project root becomes its own entry,
// so the home page plus the interior pages (story/family/memories/place) are all
// emitted. Auto-discovered so adding a page needs no config change.
const root = fileURLToPath(new URL('.', import.meta.url));
const input = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), fileURLToPath(new URL(f, import.meta.url))])
);

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    cssMinify: true,
    rollupOptions: { input },
  },
});
