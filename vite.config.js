import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';

function resolveBuildId() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return `local-${Date.now().toString(36)}`;
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __ZAREWA_BUILD_ID__: JSON.stringify(resolveBuildId()),
  },
  build: {
    chunkSizeWarningLimit: 2400,
  },
  server: {
    host: true,
    /** Allow LAN hostnames (e.g. *.local); IPv4 Host headers are allowed by default. */
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.E2E_API_PORT || 8787}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.E2E_API_PORT || 8787}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: false,
    pool: 'forks',
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    setupFiles: './src/test/setup.js',
    testTimeout: 45_000,
  },
});
