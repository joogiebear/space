import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// `npm run dev` serves the front end on :5173 and forwards /api to the Python data server (`npm run api`, :8080).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: true, proxy: { '/api': 'http://localhost:8080' } },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
});
