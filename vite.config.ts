import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// `npm run dev` serves the front end on :5173 and forwards /api to the Python data server (`npm run api`, :8080).
// VITE_BASE sets the public path for hosting under a sub-folder, e.g. /space/ on GitHub Pages.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: true, proxy: { '/api': 'http://localhost:8080' } },
  // satellite.js 7 ships a WebAssembly bulk-propagation worker that uses top-level await, which needs the ES worker format.
  worker: { format: 'es' },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'], setupFiles: ['src/test/setup.ts'] },
});
