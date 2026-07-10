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

function srcPath(id) {
  return id.replace(/\\/g, '/');
}

function inSrc(id, segment) {
  return srcPath(id).includes(segment);
}

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
          const path = srcPath(id);

          if (path.includes('node_modules')) {
            // Keep all lucide in app-shell — micro vendor-lucide / per-icon chunks imported
            // the icon factory back from app-shell ("Cannot access 'Q' before initialization).
            if (path.includes('lucide-react')) return 'app-shell';
            if (path.includes('xlsx')) return 'vendor-xlsx';
            if (path.includes('@tanstack/react-query')) return 'vendor-tanstack';
            if (path.includes('react-dom')) return 'vendor-react-dom';
            if (path.includes('react-router')) return 'vendor-router';
            if (path.includes('/react/')) return 'vendor-react';
            if (path.includes('framer-motion')) return 'vendor-motion';
            if (path.includes('@radix-ui')) return 'vendor-radix';
            if (path.includes('recharts')) return 'vendor-recharts';
            return;
          }

          // Profile shell + My Profile routes in one chunk — splitting my-profile-hub out
          // made profile-ui import the hub back ("Cannot access 'WB' before initialization).
          if (
            inSrc(path, '/src/components/profile/') ||
            inSrc(path, '/src/pages/hr/MyProfile.jsx') ||
            inSrc(path, '/src/pages/hr/useMyProfileCohort')
          ) {
            return 'profile-ui';
          }

          // Shell-only HR guard (App.jsx) — rest of HR is route-lazy.
          if (inSrc(path, '/src/components/hr/HrMainRouteGuard')) return 'app-shell';
          if (inSrc(path, '/src/components/hr/')) return 'hr-ui';

          // Root sales modals (Sales.jsx lazyWithRetry) — keep with refund/management previews.
          if (
            /[/]src[/]components[/](QuotationModal|ReceiptModal|CuttingListModal|RefundModal|AdvancePaymentModal)[.]jsx/.test(
              path
            )
          ) {
            return 'sales-modals';
          }
          if (inSrc(path, '/src/components/refund/')) return 'sales-modals';
          if (inSrc(path, '/src/components/management/')) return 'desk-shared-ui';

          if (inSrc(path, '/src/components/LiveProductionMonitor')) return 'operations-ui';
          if (inSrc(path, '/src/components/production/')) return 'operations-ui';
          if (inSrc(path, '/src/components/material/')) return 'operations-ui';
          if (inSrc(path, '/src/components/operations/')) return 'operations-ui';

          if (inSrc(path, '/src/components/settings/')) return 'settings-ui';
          if (inSrc(path, '/src/components/exec/')) return 'exec-ui';
          if (inSrc(path, '/src/components/branchManager/')) return 'manager-ui';
          if (inSrc(path, '/src/components/dashboard/')) return 'manager-ui';
          if (inSrc(path, '/src/components/customers/')) return 'sales-ui';
          if (inSrc(path, '/src/components/account/')) return 'finance-ui';
          if (inSrc(path, '/src/components/finance/')) return 'finance-ui';
          if (inSrc(path, '/src/components/procurement/')) return 'procurement-ui';
          if (inSrc(path, '/src/components/reports/')) return 'reports-ui';
          if (inSrc(path, '/src/components/office/')) return 'office-ui';
          if (inSrc(path, '/src/components/sales/')) return 'sales-ui';

          if (inSrc(path, '/src/components/HelpChatDock')) return 'help-chat-ui';
          if (inSrc(path, '/src/components/AiAssistantDock')) return 'ai-assistant-ui';
          if (
            inSrc(path, '/src/lib/helpKnowledge') ||
            inSrc(path, '/src/lib/helpOperationalCatalog') ||
            inSrc(path, '/src/lib/helpRecommend') ||
            inSrc(path, '/src/lib/helpSynthesize')
          ) {
            return 'help-chat-ui';
          }

          if (
            inSrc(path, '/src/lib/coilExcelImport') ||
            inSrc(path, '/src/lib/standardReportsDownload') ||
            inSrc(path, '/src/lib/reportsPackRows') ||
            inSrc(path, '/src/hooks/useReportsExport')
          ) {
            return 'vendor-xlsx';
          }

          // Workspace widgets used by App shell header/search stay in app-shell.
          if (inSrc(path, '/src/components/workspace/')) {
            if (
              inSrc(path, 'BootstrapTruncatedBanner') ||
              inSrc(path, 'WorkspaceSearchResults')
            ) {
              return 'app-shell';
            }
            return 'office-ui';
          }

          // Route pages stay in their own lazy chunks.
          if (inSrc(path, '/src/pages/')) return undefined;
          // App shell, contexts, shared lib, layout — never the entry index.
          if (inSrc(path, '/src/')) return 'app-shell';
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
