import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/rd/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    open: true,
  },
});
