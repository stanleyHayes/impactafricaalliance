import path from 'node:path';

import react from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@mui/material/Stack': path.resolve(__dirname, './src/components/Stack.tsx'),
    },
  },
  // Cast guards against duplicate `vite` copies in the workspace producing
  // nominally-distinct Plugin types (a known npm monorepo hoisting quirk).
  plugins: [react()] as PluginOption[],
  server: { port: 5174 },
  preview: { port: 5174 },
  build: { outDir: 'dist', sourcemap: false },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/test/**', 'src/**/*.d.ts'],
    },
  },
});
