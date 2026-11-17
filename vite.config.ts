import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from https://<user>.github.io/great-london-getaway/
// so production builds (and `vite preview` of them) use that sub-path. The dev server stays at '/'.
const REPO_BASE = '/great-london-getaway/';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? REPO_BASE : '/',
  server: { host: true },
  preview: { host: true },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
