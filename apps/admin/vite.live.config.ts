// TEMPORARY: runs the dev server against the PRODUCTION API.
// Proxies /api so the browser sees a same-origin request, avoiding the need to
// add localhost to the production CORS allowlist. Delete when done.
import path from 'node:path';

import react from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vite';

const PRODUCTION_API = 'https://iaa-api.onrender.com';

export default defineConfig({
  resolve: {
    alias: {
      '@mui/material/Stack': path.resolve(__dirname, './src/components/Stack.tsx'),
    },
  },
  plugins: [react()] as PluginOption[],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: PRODUCTION_API,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
