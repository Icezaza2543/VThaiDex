import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev only: VTHAIDEX_SNAPSHOT_FILE=<snapshot.json> serves every /api route from a local snapshot through the real
// handlers (useful before a new snapshot or API is deployed). Without it, /api is proxied to production.
const snapshotFile = process.env.VTHAIDEX_SNAPSHOT_FILE;
const localApi = {
  name: 'local-api',
  configureServer(server) {
    if (!snapshotFile) return;
    const storage = { readCurrentSnapshot: async () => JSON.parse(readFileSync(snapshotFile, 'utf8')) };
    const cursorSecret = Buffer.alloc(32, 1).toString('base64url');
    server.middlewares.use(async (req, res, next) => {
      const route = req.url.split('?')[0];
      const handlers = {
        '/api/stats': async (r) => (await import('./api/stats.js')).handleStats(r, { storage }),
        '/api/creators': async (r) => (await import('./api/creators.js')).handleCreators(r, { storage, cursorSecret }),
        '/api/spotlight': async (r) => (await import('./api/spotlight.js')).handleSpotlight(r, { storage }),
        '/api/discover': async (r) => (await import('./api/discover.js')).handleDiscover(r, { storage, cursorSecret }),
      };
      if (!handlers[route]) return next();
      const response = await handlers[route](new Request(`http://localhost${req.url}`));
      res.statusCode = response.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(await response.text());
    });
  },
};

const pages = ['index', 'analytics', 'directory', 'discover', 'about', 'contribute', 'terms', 'terms-of-use', 'privacy', 'data-license'];

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi],
  // Local dev/preview read the live public API; Vercel serves /api itself in production.
  server: snapshotFile ? {} : { proxy: { '/api': { target: 'https://vthaidex.vercel.app', changeOrigin: true } } },
  preview: { proxy: { '/api': { target: 'https://vthaidex.vercel.app', changeOrigin: true } } },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000, // the lazy three.js universe chunk
    rollupOptions: {
      input: Object.fromEntries(pages.map((page) => [page, resolve(import.meta.dirname, `${page}.html`)])),
    },
  },
});
