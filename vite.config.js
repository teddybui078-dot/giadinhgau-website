import { defineConfig } from 'vite';

// base: './' so the built dist/ works from any static host or subpath
// (GitHub Pages, Netlify, plain file server) without rewriting asset URLs.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    cssMinify: true,
  },
});
