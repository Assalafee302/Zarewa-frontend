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

/**
 * Vite 8 / Rolldown: use codeSplitting.groups (manualChunks is deprecated / ineffective).
 * Higher priority wins. Keep React out of desk/AI chunks so login does not download them.
 */
const codeSplittingGroups = [
  { name: 'vendor-react-dom', test: /node_modules[/\\](?:react-dom|scheduler)[/\\]/, priority: 40 },
  { name: 'vendor-react', test: /node_modules[/\\](?:react|react-is|use-sync-external-store)[/\\]/, priority: 35 },
  { name: 'vendor-router', test: /node_modules[/\\]react-router/, priority: 34 },
  { name: 'vendor-tanstack', test: /node_modules[/\\]@tanstack/, priority: 30 },
  // Light shared deps MUST beat xlsx/recharts. Otherwise Rolldown parks lucide/clsx inside those
  // heavy chunks and the login screen statically imports ~900KB just for icons and cn().
  { name: 'vendor-lucide', test: /node_modules[/\\]lucide-react[/\\]/, priority: 29 },
  { name: 'vendor-cn', test: /node_modules[/\\](?:clsx|tailwind-merge)[/\\]/, priority: 29 },
  { name: 'vendor-motion', test: /node_modules[/\\]framer-motion[/\\]/, priority: 28 },
  { name: 'vendor-radix', test: /node_modules[/\\]@radix-ui[/\\]/, priority: 28 },
  { name: 'vendor-recharts', test: /node_modules[/\\]recharts[/\\]/, priority: 27 },
  { name: 'vendor-xlsx', test: /node_modules[/\\]xlsx[/\\]/, priority: 27 },

  // Auth-critical session runtime — must NOT be absorbed into desk-shell or login downloads the desk.
  {
    name: 'workspace-runtime',
    // Only auth-needed UI (ConfirmDialog + button). Do NOT match all of components/ui —
    // that forced modal/card (framer-motion) onto the login critical path.
    test: /[/\\]src[/\\](?:App\.jsx|main\.jsx|context[/\\]WorkspaceContext|context[/\\]ToastContext|context[/\\]ConfirmProvider|components[/\\]layout[/\\]AppErrorBoundary|components[/\\]ui[/\\](?:ConfirmDialog|button)|lib[/\\](?:utils|apiBase|lazyWithRetry|queryClient|connectivityResilience|bootstrapConnectError|bootstrapPollMerge|workspaceDomainPrefetch|pendingPasswordChange|customerLedgerStore|moduleAccess|editApprovalUi|hrAccess|reportsAccess|normalizeWorkspacePersonNames|formatPersonName|workspaceBranchCreate|workspaceSanitize|reactErrorMessage|appConfirm)|Data[/\\]companyQuotation|shared[/\\]lib[/\\](?:moduleAccess|workspaceSanitize|formatNgn))/,
    priority: 25,
  },

  { name: 'auth-ui', test: /[/\\]src[/\\]components[/\\]auth[/\\](?:LoginScreen|PasswordField)/, priority: 22 },

  // AppDesk and its static desk chrome only — do not include AppErrorBoundary (auth boot imports it).
  {
    name: 'desk-shell',
    test: /[/\\]src[/\\](?:AppDesk\.jsx|components[/\\]layout[/\\](?:Sidebar|BranchWorkspaceBar|DocumentTitleSync|PrintSessionCleanup|UnsavedWorkNavigationGuard|RouteErrorBoundary)|context[/\\](?:InventoryContext|CustomersContext|AiAssistantContext|HelpChatContext|UnsavedWorkContext)|components[/\\]auth[/\\](?:UserOnboardingGate|ModuleRouteGuard|ManagerRouteGuard|FinanceDeskRouteGuard|LegacyAccountsRouteGuard|RoleTrainingReplayLayer|SessionTimeoutWarning)|hooks[/\\]useAppShellSummaries|lib[/\\](?:workspaceNotifications|useWorkspaceSearch|notificationDismissal)|components[/\\]AiAskButton|components[/\\]hr[/\\]HrMainRouteGuard|components[/\\]workspace[/\\](?:BootstrapTruncatedBanner|WorkspaceSearchResults))/,
    priority: 20,
  },

  { name: 'profile-ui', test: /[/\\]src[/\\](?:components[/\\]profile[/\\]|pages[/\\]hr[/\\]MyProfile|pages[/\\]hr[/\\]useMyProfileCohort)/, priority: 18 },
  { name: 'hr-ui', test: /[/\\]src[/\\]components[/\\]hr[/\\]/, priority: 17 },
  {
    name: 'sales-modals',
    test: /[/\\]src[/\\]components[/\\](?:sales[/\\](?:QuotationModal|ReceiptModal|CuttingListModal|RefundModal|AdvancePaymentModal|QuotationPrintView|CuttingListReportPrintView|cuttingListReportConstants|QuotationPriceExceptionPanel)|refund[/\\])/,
    priority: 16,
  },
  { name: 'desk-shared-ui', test: /[/\\]src[/\\]components[/\\]management[/\\]/, priority: 15 },
  {
    name: 'operations-ui',
    test: /[/\\]src[/\\]components[/\\](?:LiveProductionMonitor|production[/\\]|material[/\\]|operations[/\\])/,
    priority: 15,
  },
  { name: 'settings-ui', test: /[/\\]src[/\\]components[/\\]settings[/\\]/, priority: 14 },
  { name: 'exec-ui', test: /[/\\]src[/\\]components[/\\]exec[/\\]/, priority: 14 },
  {
    name: 'manager-ui',
    test: /[/\\]src[/\\]components[/\\](?:branchManager[/\\]|dashboard[/\\])/,
    priority: 14,
  },
  { name: 'sales-ui', test: /[/\\]src[/\\]components[/\\](?:customers[/\\]|sales[/\\])/, priority: 13 },
  { name: 'finance-ui', test: /[/\\]src[/\\]components[/\\](?:account[/\\]|finance[/\\])/, priority: 13 },
  { name: 'procurement-ui', test: /[/\\]src[/\\]components[/\\]procurement[/\\]/, priority: 13 },
  { name: 'reports-ui', test: /[/\\]src[/\\]components[/\\]reports[/\\]/, priority: 13 },
  { name: 'office-ui', test: /[/\\]src[/\\]components[/\\](?:office[/\\]|workspace[/\\])/, priority: 12 },
  {
    name: 'help-chat-ui',
    test: /[/\\]src[/\\](?:components[/\\]HelpChatDock|lib[/\\]help(?:Knowledge|OperationalCatalog|Recommend|Synthesize)|shared[/\\]lib[/\\]helpSynthesize)/,
    priority: 11,
  },
];

export default defineConfig({
  plugins: [react(), tailwindcss(), zarewaBuildMetaPlugin()],
  define: {
    __ZAREWA_BUILD_ID__: JSON.stringify(ZAREWA_BUILD_ID),
  },
  build: {
    chunkSizeWarningLimit: 900,
    sourcemap: false,
    minify: 'esbuild',
    modulePreload: {
      resolveDependencies(filename, deps) {
        // Auth boot: React + session runtime + light UI vendors. Never desk/AI/xlsx/charts/motion.
        return deps.filter((d) =>
          /(?:rolldown-runtime|vendor-react|vendor-router|vendor-tanstack|vendor-lucide|vendor-cn|vendor-radix|workspace-runtime|index-)[^/]*\.(?:js|css)$/.test(
            d
          )
        );
      },
    },
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: codeSplittingGroups,
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
