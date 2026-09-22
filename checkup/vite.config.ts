import { defineConfig } from 'vitest/config';

// base: './' — GitHub Pages(하위 경로)와 file:// 로 연 index.html 양쪽에서 모두 동작해야 한다.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    target: 'es2020',
  },
  server: { port: 5173 },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
});
