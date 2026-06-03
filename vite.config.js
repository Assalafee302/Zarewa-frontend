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

const ZAREWA_BUILD_ID = resolveBuildId();

/** Lets IT confirm deployed HTML matches the built bundle (View Source → zarewa-build meta). */
function zarewaBuildMetaPlugin() {
  return {
    name: 'zarewa-build-meta',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta name="zarewa-build" content="${ZAREWA_BUILD_ID}" />`
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), zarewaBuildMetaPlugin()],
  define: {
    __ZAREWA_BUILD_ID__: JSON.stringify(ZAREWA_BUILD_ID),
  },
  build: {
    chunkSizeWarningLimit: 2400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('react-dom')) return 'vendor-react-dom';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('/react/')) return 'vendor-react';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('firebase')) return 'vendor-firebase';
            return;
          }
          // Route pages stay in their own lazy chunks.
          if (id.includes('/src/pages/')) return undefined;
          // Everything else (App shell, components, lib, contexts) — never the entry index.
          if (id.includes('/src/')) return 'app-shell';
        },
      },
    },
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
