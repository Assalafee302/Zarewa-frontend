import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lazyWithRetry } from './lib/lazyWithRetry';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginScreen from './components/auth/LoginScreen';
import UserOnboardingGate from './components/auth/UserOnboardingGate';
import ModuleRouteGuard from './components/ModuleRouteGuard';
import ManagerRouteGuard from './components/ManagerRouteGuard';
import HrMainRouteGuard from './components/hr/HrMainRouteGuard';
import FinanceDeskRouteGuard from './components/FinanceDeskRouteGuard';
import LegacyAccountsRouteGuard from './components/LegacyAccountsRouteGuard';
import DocumentTitleSync from './components/DocumentTitleSync';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { canAccessMyProfileHr } from './lib/hrAccess';
import { HR_SELF_SERVICE_BASE } from './lib/hrSelfServiceRoutes';
import ProfileRoutesLayout from './components/profile/ProfileRoutesLayout';
import PrintSessionCleanup from './components/PrintSessionCleanup';
import {
  Search,
  Bell,
  Command,
  Menu,
  ChevronDown,
  User,
  Settings as SettingsIcon,
  Lock,
  LogOut,
  RefreshCw,
  WifiOff,
  X,
} from 'lucide-react';
import { CustomersProvider } from './context/CustomersContext';
import { InventoryProvider } from './context/InventoryContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ConfirmProvider, useConfirmDialog } from './context/ConfirmProvider';
import {
  AccountRouteErrorBoundary,
  OperationsRouteErrorBoundary,
  ExecutiveRouteErrorBoundary,
  ReportsRouteErrorBoundary,
  SettingsRouteErrorBoundary,
  HrRouteErrorBoundary,
} from './components/RouteErrorBoundary';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { UnsavedWorkProvider, useUnsavedWorkRegistry, UNSAVED_LEAVE_MESSAGE } from './context/UnsavedWorkContext';
import { UnsavedWorkNavigationGuard } from './components/UnsavedWorkNavigationGuard';
import { useWorkspace } from './context/WorkspaceContext';
import { ZAREWA_LOGO_SRC } from './Data/companyQuotation';
import { BootstrapTruncatedBanner } from './components/workspace/BootstrapTruncatedBanner';
import { BranchWorkspaceBar } from './components/layout/BranchWorkspaceBar';
import {
  useHrNotifSummaryQuery,
  useManagementAttentionQuery,
  useOfficeSummaryQuery,
} from './hooks/useAppShellSummaries';
import { AiAskButton } from './components/AiAskButton';
import { buildWorkspaceNotifications, WORKSPACE_NOTIFICATION_DISPLAY_LIMIT } from './lib/workspaceNotifications';
import {
  dismissNotification,
  filterDismissedNotifications,
  loadNotificationDismissals,
  pruneExpiredDismissals,
} from './lib/notificationDismissal';
import { AiAssistantProvider, useAiAssistant } from './context/AiAssistantContext';
import { HelpChatProvider } from './context/HelpChatContext';
import { RoleTrainingReplayLayer } from './components/auth/RoleTrainingReplayLayer';
import SessionTimeoutWarning from './components/auth/SessionTimeoutWarning';
import { notificationPrompt } from './lib/aiAssistUi';
import { useWorkspaceSearch } from './lib/useWorkspaceSearch';
import { pushRecentWorkspaceSearch } from './lib/workspaceSearchRecent';
import { flattenSearchHits, WorkspaceSearchResults } from './components/workspace/WorkspaceSearchResults';
import {
  resolveGlobalSearchEnterFallback,
  resolveTransactionSearchHit,
} from './shared/lib/workspaceSearchCore.js';
import { userMayPerformManagerQuotationClearance } from './lib/workspaceGovernanceClient';
import { formatPersonName } from './lib/formatPersonName';
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'), { id: 'Dashboard' });
const ManagerDashboard = lazyWithRetry(() => import('./pages/ManagerDashboard'), { id: 'ManagerDashboard' });

const ExecutiveCommandCentre = lazyWithRetry(
  () => import('./pages/ExecutiveCommandCentre.jsx'),
  { id: 'ExecutiveCommandCentre' }
);

const AiAssistantDock = lazyWithRetry(
  () =>
    import('./components/AiAssistantDock.jsx').then((m) => ({ default: m.AiAssistantDock })),
  { id: 'AiAssistantDock' }
);
const WorkspaceCommandPalette = lazyWithRetry(
  () =>
    import('./components/workspace/WorkspaceCommandPalette.jsx').then((m) => ({
      default: m.WorkspaceCommandPalette,
    })),
  { id: 'WorkspaceCommandPalette' }
);

const Sales = lazyWithRetry(() => import('./pages/Sales'), { id: 'Sales' });
const Procurement = lazyWithRetry(() => import('./pages/Procurement'), { id: 'Procurement' });
const MaterialPricingWorkbookPage = lazyWithRetry(() => import('./pages/MaterialPricingWorkbookPage'), {
  id: 'MaterialPricingWorkbookPage',
});
const SupplierProfile = lazyWithRetry(() => import('./pages/SupplierProfile'), { id: 'SupplierProfile' });
const TransportAgentProfile = lazyWithRetry(() => import('./pages/TransportAgentProfile'), { id: 'TransportAgentProfile' });
const CoilProfile = lazyWithRetry(() => import('./pages/CoilProfile'), { id: 'CoilProfile' });
const Operations = lazyWithRetry(() => import('./pages/Operations'), { id: 'Operations' });
const MaterialExceptions = lazyWithRetry(() => import('./pages/MaterialExceptions'), { id: 'MaterialExceptions' });
const Account = lazyWithRetry(() => import('./pages/Account'), { id: 'Account' });
const CashierDesk = lazyWithRetry(() => import('./pages/CashierDesk'), { id: 'CashierDesk' });
const AccountingDesk = lazyWithRetry(() => import('./pages/AccountingDesk'), { id: 'AccountingDesk' });
const Customers = lazyWithRetry(() => import('./pages/Customers'), { id: 'Customers' });
const CustomerDashboard = lazyWithRetry(() => import('./pages/CustomerDashboard'), { id: 'CustomerDashboard' });
const Reports = lazyWithRetry(() => import('./pages/Reports'), { id: 'Reports' });
const OfficeDesk = lazyWithRetry(() => import('./pages/OfficeDesk'), { id: 'OfficeDesk' });
const Settings = lazyWithRetry(() => import('./pages/Settings'), { id: 'Settings' });
const EditApprovalsPage = lazyWithRetry(() => import('./pages/EditApprovalsPage'), { id: 'EditApprovalsPage' });
const NotFound = lazyWithRetry(() => import('./pages/NotFound'), { id: 'NotFound' });
const AccessDenied = lazyWithRetry(() => import('./pages/AccessDenied'), { id: 'AccessDenied' });
const BusinessIntelligence = lazyWithRetry(() => import('./pages/BusinessIntelligence'), { id: 'BusinessIntelligence' });
const WorkspaceMonitoring = lazyWithRetry(() => import('./pages/WorkspaceMonitoring'), { id: 'WorkspaceMonitoring' });
const PriceListAdmin = lazyWithRetry(() => import('./pages/PriceListAdmin'), { id: 'PriceListAdmin' });
const PricingPolicyAdmin = lazyWithRetry(() => import('./pages/PricingPolicyAdmin'), { id: 'PricingPolicyAdmin' });
const HelpChatDockGate = lazyWithRetry(
  () => import('./components/HelpChatDockGate.jsx').then((m) => ({ default: m.HelpChatDockGate })),
  { id: 'HelpChatDockGate' }
);
const HumanResources = lazyWithRetry(() => import('./pages/hr/HumanResources'), { id: 'HumanResources' });
const MyProfile = lazyWithRetry(() => import('./pages/hr/MyProfile'), { id: 'MyProfile' });
const TeamHr = lazyWithRetry(() => import('./pages/hr/TeamHr'), { id: 'TeamHr' });
const UserProfile = lazyWithRetry(() => import('./pages/UserProfile'), { id: 'UserProfile' });
const ExecutiveHr = lazyWithRetry(() => import('./pages/hr/ExecutiveHr'), { id: 'ExecutiveHr' });

function ExecutiveHrLegacyRedirect() {
  const loc = useLocation();
  const rest = loc.pathname.replace(/^\/hr\/executive\/?/, '') || 'payroll';
  return <Navigate to={`/executive-hr/${rest}${loc.search}${loc.hash}`} replace />;
}

/** Blocks the whole app when bootstrap falls back to cached session (API unreachable). */
function DegradedWorkspaceLock() {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const { confirm } = useConfirmDialog();
  const [retrying, setRetrying] = useState(false);
  const wsRef = useRef(ws);
  useEffect(() => {
    wsRef.current = ws;
  });

  useEffect(() => {
    if (!ws?.usingCachedData) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [ws?.usingCachedData]);

  if (!ws?.usingCachedData) return null;

  const handleReconnect = async () => {
    setRetrying(true);
    try {
      await ws.refresh?.({ forceReconnect: true });
    } finally {
      setRetrying(false);
    }
    window.setTimeout(() => {
      if (wsRef.current?.usingCachedData) {
        showToast(
          'Still offline. Ensure the API server is running and your network is stable, then use Refresh page.',
          { variant: 'error' }
        );
      }
    }, 0);
  };

  const handleSignOut = async () => {
    const ok = await confirm({
      title: 'Sign out',
      message: 'Sign out? Unsaved changes in this tab may be lost.',
    });
    if (!ok) return;
    try {
      await ws?.logout?.();
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/85 p-6 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="degraded-workspace-title"
      aria-describedby="degraded-workspace-desc"
    >
      <div className="max-w-md rounded-2xl border border-amber-200/90 bg-amber-50 px-6 py-7 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
          <WifiOff size={28} strokeWidth={2} aria-hidden />
        </div>
        <h1 id="degraded-workspace-title" className="mt-4 text-lg font-black text-amber-950">
          System offline
        </h1>
        <p id="degraded-workspace-desc" className="mt-2 text-sm font-medium leading-relaxed text-amber-950/90">
          This tab is showing your last workspace sync only. Nothing new can be saved until the live server responds.
          Reconnect the API, then try again or refresh the page.
        </p>
        {ws?.lastError ? (
          <p className="mt-3 rounded-lg border border-amber-200/80 bg-white/80 px-3 py-2 text-left font-mono text-ui-xs text-amber-900/90 break-words">
            {ws.lastError}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={retrying}
            onClick={() => void handleReconnect()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zarewa-teal px-4 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg hover:brightness-110 disabled:opacity-50"
          >
            <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} aria-hidden />
            {retrying ? 'Reconnecting…' : 'Try reconnect'}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wide text-amber-950 shadow-sm hover:bg-amber-100/80"
          >
            Refresh page
          </button>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-4 text-xs font-semibold text-amber-900/80 underline underline-offset-2 hover:text-amber-950"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function HomeRoute() {
  const ws = useWorkspace();
  const rk = String(ws?.session?.user?.roleKey || '').toLowerCase();
  if (rk === 'ceo' || rk === 'md') {
    return <Navigate to="/exec" replace />;
  }
  if (rk === 'sales_manager' || rk === 'branch_manager') {
    return <Navigate to="/manager" replace />;
  }
  if (rk === 'cashier') {
    return <Navigate to="/accounts" replace />;
  }
  if (rk === 'finance_manager') {
    return <Navigate to="/accounting" replace />;
  }
  if (rk === 'hr_admin' || rk === 'gmhr') {
    return <Navigate to="/hr" replace />;
  }
  return <Dashboard />;
}

function AppShell() {
  const { confirm } = useConfirmDialog();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasUnsavedWork } = useUnsavedWorkRegistry();
  const ws = useWorkspace();
  const ai = useAiAssistant();
  const signedInUserId = String(ws?.session?.user?.id || '').trim();
  const [notificationDismissals, setNotificationDismissals] = useState(() =>
    pruneExpiredDismissals(loadNotificationDismissals(signedInUserId))
  );
  const wsHasPermission = ws?.hasPermission;
  const wsCanAccessModule = ws?.canAccessModule;
  const wsSnapshot = ws?.snapshot;
  const wsApiOnline = ws?.apiOnline;
  const canSeeOfficeModule = Boolean(ws?.canAccessModule?.('office'));
  const canSeeHrModule = Boolean(ws?.canAccessModule?.('hr') || ws?.canAccessModule?.('team_hr'));
  const canFetchMgmtAttention = useMemo(() => {
    const has = (p) => Boolean(wsHasPermission?.(p));
    return (
      has('*') ||
      has('audit.view') ||
      has('refunds.approve') ||
      has('sales.manage') ||
      has('quotations.manage')
    );
  }, [wsHasPermission]);
  const { data: officeSummary = null } = useOfficeSummaryQuery(canSeeOfficeModule);
  const { data: hrNotifSummary = null } = useHrNotifSummaryQuery(canSeeHrModule);
  const { data: managementAttention = null } = useManagementAttentionQuery(canFetchMgmtAttention);

  useEffect(() => {
    setNotificationDismissals(pruneExpiredDismissals(loadNotificationDismissals(signedInUserId)));
  }, [signedInUserId]);

  const notificationItemsRaw = useMemo(
    () =>
      buildWorkspaceNotifications({
        snapshot: wsSnapshot,
        hasPermission: (p) => wsHasPermission?.(p),
        canAccessModule: (m) => wsCanAccessModule?.(m),
        officeSummary,
        hrNotifSummary,
        managementAttention,
      }),
    [
      wsSnapshot,
      wsHasPermission,
      wsCanAccessModule,
      officeSummary,
      hrNotifSummary,
      managementAttention,
    ]
  );
  const notificationItems = useMemo(
    () => filterDismissedNotifications(notificationItemsRaw, notificationDismissals),
    [notificationItemsRaw, notificationDismissals]
  );
  const visibleNotificationItems = useMemo(
    () => notificationItems.slice(0, WORKSPACE_NOTIFICATION_DISPLAY_LIMIT),
    [notificationItems]
  );
  const hiddenNotificationCount = Math.max(0, notificationItems.length - visibleNotificationItems.length);
  const urgentNotifCount = useMemo(
    () =>
      notificationItems.filter((n) => n.severity === 'critical' || n.severity === 'warning').length,
    [notificationItems]
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const searchRef = useRef(null);
  const [headerSearch, setHeaderSearch] = useState('');
  const [searchActiveIdx, setSearchActiveIdx] = useState(0);
  const wsHasPerm = useCallback((p) => wsHasPermission?.(p), [wsHasPermission]);
  const wsCanAccessMod = useCallback((m) => wsCanAccessModule?.(m), [wsCanAccessModule]);
  const { hits: searchHits, busy: searchBusy, fromCache: searchFromCache } = useWorkspaceSearch({
    query: headerSearch,
    apiOnline: wsApiOnline,
    snapshot: wsSnapshot,
    hasPermission: wsHasPerm,
    canAccessModule: wsCanAccessMod,
    roleKey: ws?.session?.user?.roleKey,
    limit: 18,
  });
  const flatSearchHits = useMemo(() => flattenSearchHits(searchHits), [searchHits]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('zarewa.sidebarCollapsed') === '1';
    } catch {
      return false;
    }
  });
  const signedInUser = ws?.session?.user;
  const userName = formatPersonName(signedInUser?.displayName ?? 'Zarewa Admin');
  const userRole = signedInUser?.roleLabel ?? 'Superuser';
  const userInitials = useMemo(() => {
    const raw = String(userName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (raw.length >= 2) return `${raw[0][0]}${raw[1][0]}`.toUpperCase();
    if (raw.length === 1 && raw[0].length >= 2) return raw[0].slice(0, 2).toUpperCase();
    if (raw.length === 1) return raw[0].slice(0, 1).toUpperCase();
    return 'ZA';
  }, [userName]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    const onOpenPalette = () => setCommandPaletteOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('zarewa:open-command-palette', onOpenPalette);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('zarewa:open-command-palette', onOpenPalette);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('zarewa.sidebarCollapsed', sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!notifOpen) return;
    const onDocClick = () => setNotifOpen(false);
    const t = window.setTimeout(() => document.addEventListener('click', onDocClick), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('click', onDocClick);
    };
  }, [notifOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDocClick = () => setUserMenuOpen(false);
    const t = window.setTimeout(() => document.addEventListener('click', onDocClick), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('click', onDocClick);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userMenuOpen]);

  useEffect(() => {
    setSearchActiveIdx(0);
  }, [headerSearch, flatSearchHits.length]);

  useEffect(() => {
    if (!notifOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notifOpen]);

  useEffect(() => {
    const main = document.getElementById('main-content');
    main?.focus?.({ preventScroll: true });
  }, [location.pathname]);

  const guardedNavigate = useCallback(
    async (to, opts) => {
      if (
        hasUnsavedWork &&
        !(await confirm({ title: 'Unsaved changes', message: UNSAVED_LEAVE_MESSAGE }))
      ) {
        return;
      }
      navigate(to, opts);
    },
    [hasUnsavedWork, navigate, confirm]
  );

  const snoozeNotificationForToday = useCallback(
    (notificationId) => {
      const next = dismissNotification(signedInUserId, notificationId, { untilEndOfDay: true });
      setNotificationDismissals(next);
    },
    [signedInUserId]
  );

  const openManagerIntelFromSearch = userMayPerformManagerQuotationClearance(ws?.session?.user);

  const goSearchHit = useCallback(
    (hit) => {
      const resolved = resolveTransactionSearchHit(hit, {
        openManagerIntel: openManagerIntelFromSearch,
      });
      if (resolved?.path) {
        pushRecentWorkspaceSearch({
          label: resolved.label || hit?.label,
          path: resolved.path,
          state: resolved.state,
        });
        guardedNavigate(resolved.path, { state: resolved.state || {} });
      }
      setHeaderSearch('');
      setSearchActiveIdx(0);
    },
    [guardedNavigate, openManagerIntelFromSearch]
  );

  const runGlobalSearch = (e) => {
    e?.preventDefault?.();
    const q = headerSearch.trim();
    if (!q) return;
    const activeHit = flatSearchHits[searchActiveIdx] || flatSearchHits[0];
    if (activeHit) {
      goSearchHit(activeHit);
      return;
    }
    const fallback = resolveGlobalSearchEnterFallback(q, {
      openManagerIntel: openManagerIntelFromSearch,
    });
    if (fallback) {
      guardedNavigate(fallback.path, { state: fallback.state || {} });
    }
    setHeaderSearch('');
    setSearchActiveIdx(0);
  };

  const askAiAboutSearch = useCallback(() => {
    const q = headerSearch.trim();
    ai?.openAssistant?.({
      mode: 'search',
      prompt: q
        ? `Summarize the most relevant workspace results for "${q}" and tell me where I should go next.`
        : 'What needs my attention today across the workspace, and where should I start?',
      pageContext: {
        source: q ? 'header-search' : 'app-shell',
        searchQuery: q,
        resultCount: searchHits.length,
      },
      autoSend: true,
    });
    setHeaderSearch('');
    setSearchActiveIdx(0);
  }, [ai, headerSearch, searchHits.length]);

  return (
    <div className="flex min-h-screen min-h-dvh min-w-0 w-full max-w-full z-app-bg font-sans selection:bg-teal-100 selection:text-zarewa-teal">
      <UnsavedWorkNavigationGuard />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-xl focus:bg-zarewa-teal focus:text-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:shadow-xl"
      >
        Skip to main content
      </a>

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[45] bg-slate-900/50 backdrop-blur-[2px] lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <Sidebar
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
      />

      <div
        className={`relative z-0 flex-1 min-h-screen min-w-0 ml-0 pt-[max(4.25rem,calc(env(safe-area-inset-top)+3.25rem))] sm:pt-10 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-6 lg:px-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] transition-[margin] duration-300 ease-out ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {ws?.usingCachedData ? (
          <div
            className="sticky top-0 z-40 -mx-4 sm:-mx-6 lg:mx-0 mb-4 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs sm:text-sm font-semibold text-amber-950"
            role="status"
          >
            Offline — last workspace sync (read-only). Reconnect to post changes.
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="lg:hidden fixed z-[55] flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200/80 bg-white/95 text-zarewa-teal shadow-md backdrop-blur-sm transition hover:border-teal-200 hover:shadow-lg left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))]"
          aria-label="Open navigation menu"
        >
          <Menu size={22} strokeWidth={2} />
        </button>

        <div className="relative z-30 -mx-4 min-w-0 max-sm:overflow-x-clip sm:sticky sm:top-0 sm:-mx-6 lg:mx-0 mb-4 max-sm:mb-3 sm:mb-8 py-2 pl-2 pr-2 max-sm:pl-14 sm:px-0 sm:py-0">
          <div className="flex min-w-0 flex-col gap-2 px-2 py-2 max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none sm:z-toolbar-shell sm:gap-3 sm:px-4 sm:py-3 sm:flex-row sm:items-center sm:justify-between max-sm:pt-1">
            {ws?.session?.user?.roleKey === 'ceo' ? (
              <p className="flex-1 min-w-0 text-[12px] text-gray-500 sm:max-w-[520px] max-sm:order-2">
                Global search is hidden for the executive read-only role.
              </p>
            ) : (
              <>
                <div className="flex min-w-0 flex-1 flex-row items-stretch gap-2 max-sm:order-2 sm:max-w-[520px] sm:items-center sm:gap-3">
                <form
                  className="relative group min-w-0 flex-1 sm:max-w-none"
                  onSubmit={runGlobalSearch}
                >
                  <Search
                    className="absolute left-3.5 sm:left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-zarewa-teal transition-colors pointer-events-none z-[1]"
                    size={16}
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={headerSearch}
                    onChange={(e) => setHeaderSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (headerSearch.trim().length < 2 || !flatSearchHits.length) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSearchActiveIdx((i) => Math.min(i + 1, flatSearchHits.length - 1));
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSearchActiveIdx((i) => Math.max(i - 1, 0));
                      }
                    }}
                    placeholder="Search pages, customers, refs…"
                    autoComplete="off"
                    aria-label="Global search"
                    aria-autocomplete="list"
                    aria-expanded={headerSearch.trim().length >= 2}
                    aria-controls={headerSearch.trim().length >= 2 ? 'global-search-results' : undefined}
                    aria-activedescendant={
                      headerSearch.trim().length >= 2 && flatSearchHits[searchActiveIdx]
                        ? `global-search-option-${searchActiveIdx}`
                        : undefined
                    }
                    enterKeyHint="search"
                    className="w-full min-h-10 rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-12 text-[15px] font-medium shadow-sm outline-none transition focus:border-teal-300/60 focus:ring-2 focus:ring-teal-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/25 sm:z-toolbar-shell sm:min-h-12 sm:py-3 sm:pl-12 sm:pr-14 sm:text-[13px] sm:focus:ring-4"
                  />
                  <button
                    type="button"
                    onClick={() => setCommandPaletteOpen(true)}
                    className="pointer-events-auto absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-gray-100 bg-gray-50/90 px-2 py-1 sm:flex hover:bg-gray-100"
                    aria-label="Open command palette"
                    title="Command palette (Ctrl+K)"
                  >
                    <Command size={10} className="text-gray-400" />
                    <span className="text-ui-xs font-black text-gray-400">K</span>
                  </button>
                  {headerSearch.trim().length >= 2 ? (
                    <div className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-[min(22rem,55dvh)] sm:max-h-80 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white py-1 text-left shadow-lg">
                      <WorkspaceSearchResults
                        hits={searchHits}
                        query={headerSearch}
                        activeIndex={searchActiveIdx}
                        onSelect={goSearchHit}
                        onActiveIndexChange={setSearchActiveIdx}
                        busy={searchBusy}
                        fromCache={searchFromCache}
                        variant="dropdown"
                      />
                    </div>
                  ) : null}
                </form>

                {ai?.available && ai.canUseMode('search') ? (
                  <button
                    type="button"
                    onClick={askAiAboutSearch}
                    aria-label="Ask AI about workspace search"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-100/90 bg-white text-zarewa-teal shadow-sm transition hover:border-teal-200 hover:bg-teal-50/50 active:scale-[0.98] sm:h-12 sm:w-auto sm:gap-2 sm:rounded-2xl sm:px-3 sm:self-center"
                    title={
                      headerSearch.trim()
                        ? 'Ask AI to explain this workspace query'
                        : 'Ask AI to summarize what matters in the workspace'
                    }
                  >
                    <Command size={14} className="text-teal-600" aria-hidden />
                    <span className="hidden text-ui-xs font-black uppercase tracking-wider sm:inline">
                      Ask AI
                    </span>
                  </button>
                ) : null}
                </div>

                <p className="hidden text-xs text-gray-400 sm:block sm:max-w-[220px] sm:text-right lg:max-w-none">
                  <span className="font-semibold text-gray-500">Tip:</span> ↑↓ to browse, Enter to open, Ctrl+K for palette.
                </p>
              </>
            )}

            <div className="flex w-full min-w-0 max-w-full flex-row flex-wrap items-center gap-2 max-sm:justify-end sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-4 lg:gap-5 max-sm:order-1">
              <div className="w-full min-w-0 basis-full max-sm:order-last max-sm:pt-1 sm:basis-auto sm:w-auto sm:order-none sm:pt-0">
                <BranchWorkspaceBar />
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
                <div className="relative flex shrink-0 items-center gap-2">
                  <button
                  type="button"
                  aria-expanded={notifOpen}
                  aria-haspopup="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen(false);
                    setNotifOpen((o) => !o);
                  }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/80 bg-white/95 shadow-sm transition hover:border-teal-100 hover:shadow-md active:scale-[0.98] sm:h-12 sm:w-12 sm:rounded-2xl sm:border-gray-100/90"
                  aria-label="Notifications"
                  title="Notifications"
                >
                    <Bell size={20} className="text-gray-400" />
                    {notificationItems.length > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-ui-xs font-black text-white">
                        {urgentNotifCount || notificationItems.length}
                      </span>
                    ) : null}
                  </button>
                  {notifOpen ? (
                    <div
                      className="fixed inset-x-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-[70] mt-0 max-h-[min(70dvh,28rem)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-xl shadow-slate-900/10 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:max-h-[min(70vh,420px)]"
                      role="menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-ui-xs font-black uppercase tracking-widest text-gray-400">
                        Action alerts
                      </p>
                      <AiAskButton
                        mode="search"
                        prompt="Summarize the alerts I can see, explain why they matter, and tell me what to do first."
                        pageContext={{
                          source: 'notifications',
                          notificationCount: notificationItems.length,
                          urgentCount: urgentNotifCount,
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-teal-100 bg-teal-50 px-2 py-1 text-ui-xs font-black uppercase tracking-wide text-zarewa-teal"
                        onAfterOpen={() => setNotifOpen(false)}
                      >
                        Ask AI
                      </AiAskButton>
                    </div>
                    {notificationItems.length === 0 ? (
                      <p className="text-xs text-gray-600 rounded-lg bg-gray-50 px-3 py-2">
                        No action alerts — order sign-off, cash approvals, ops issues, and items assigned to you
                        appear here when something needs attention.
                      </p>
                    ) : (
                      <ul className="space-y-2 text-xs text-gray-700">
                        {visibleNotificationItems.map((n) => (
                          <li key={n.id}>
                            <div
                              className={`rounded-lg border px-3 py-3 transition sm:py-2 ${
                                n.severity === 'critical'
                                  ? 'bg-rose-50 border-rose-200'
                                  : n.severity === 'warning'
                                    ? 'bg-amber-50 border-amber-100'
                                    : 'bg-slate-50 border-slate-100'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <button
                                  type="button"
                                  className="min-w-0 flex-1 text-left"
                                  onClick={() => {
                                    snoozeNotificationForToday(n.id);
                                    guardedNavigate(n.path, { state: n.state || {} });
                                    setNotifOpen(false);
                                  }}
                                >
                                  {n.category ? (
                                    <span className="text-ui-xs font-black uppercase tracking-wide text-slate-400 block mb-0.5">
                                      {n.category}
                                    </span>
                                  ) : null}
                                  <span className="font-bold text-zarewa-teal block">{n.title}</span>
                                  <span className="text-xs text-gray-600 mt-0.5 block leading-snug">{n.detail}</span>
                                </button>
                                <button
                                  type="button"
                                  aria-label="Dismiss until tomorrow"
                                  title="Dismiss until tomorrow"
                                  className="shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-white/80 hover:text-gray-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    snoozeNotificationForToday(n.id);
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              {ai?.available && ai.canUseMode('search') ? (
                                <AiAskButton
                                  mode="search"
                                  prompt={notificationPrompt(n)}
                                  pageContext={{
                                    source: 'notification-item',
                                    notificationId: n.id,
                                    targetPath: n.path,
                                  }}
                                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-white/80 bg-white/70 px-2 py-1 text-ui-xs font-black uppercase tracking-wide text-zarewa-teal"
                                  onAfterOpen={() => setNotifOpen(false)}
                                >
                                  Ask AI
                                </AiAskButton>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {hiddenNotificationCount > 0 ? (
                      <button
                        type="button"
                        className="mt-3 w-full rounded-lg border border-teal-100 bg-teal-50/80 px-3 py-2 text-left text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal"
                        onClick={() => {
                          const fallbackPath = canFetchMgmtAttention ? '/manager?inbox=attention' : '/';
                          guardedNavigate(fallbackPath);
                          setNotifOpen(false);
                        }}
                      >
                        +{hiddenNotificationCount} more alert{hiddenNotificationCount === 1 ? '' : 's'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="mt-4 text-ui-xs font-bold uppercase text-zarewa-teal"
                      onClick={() => setNotifOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                ) : null}
                </div>

                <div className="relative flex shrink-0">
                  <button
                    type="button"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                    aria-label={`Signed in as ${userName}. Open account menu.`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotifOpen(false);
                      setUserMenuOpen((o) => !o);
                    }}
                    className="flex min-w-0 max-w-full items-center gap-2 rounded-zarewa border border-gray-100/90 bg-white/95 py-1.5 pl-1.5 pr-2 text-left shadow-sm transition hover:border-teal-200 hover:shadow-md max-sm:flex-none max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none sm:flex-initial sm:gap-3 sm:pr-3"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zarewa-teal text-xs font-black text-[#2dd4bf] shadow-inner sm:h-9 sm:w-9">
                      {userInitials}
                    </span>
                    <div className="hidden min-w-0 sm:block sm:flex-initial sm:max-w-[11rem]">
                      <p className="truncate text-ui-xs font-black uppercase leading-none tracking-tighter text-zarewa-teal">
                        {userName}
                      </p>
                      <p className="mt-0.5 truncate text-ui-xs font-bold uppercase leading-none tracking-widest text-gray-400">
                        {userRole}
                      </p>
                    </div>
                    <ChevronDown
                      size={16}
                      aria-hidden
                      className={`hidden shrink-0 text-gray-400 transition sm:block ${userMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {userMenuOpen ? (
                    <div
                      className="fixed inset-x-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-[70] mt-0 max-h-[min(72dvh,32rem)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-100 bg-white text-left shadow-xl shadow-slate-900/10 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(20rem,calc(100vw-2rem))] sm:max-h-[min(70vh,28rem)]"
                      role="menu"
                      aria-label="Account menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="border-b border-gray-100 bg-slate-50/80 px-4 py-3">
                        <p className="truncate text-sm font-black text-zarewa-teal">{userName}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-600">{userRole}</p>
                        {signedInUser?.username ? (
                          <p className="mt-1.5 truncate font-mono text-xs text-slate-500">
                            @{signedInUser.username}
                          </p>
                        ) : null}
                        {signedInUser?.email ? (
                          <p className="mt-1 truncate text-xs text-slate-500">{signedInUser.email}</p>
                        ) : null}
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] font-semibold text-slate-800 transition hover:bg-teal-50/80"
                          onClick={() => {
                            setUserMenuOpen(false);
                            guardedNavigate(
                              canAccessMyProfileHr(ws?.permissions) ? HR_SELF_SERVICE_BASE : '/me'
                            );
                          }}
                        >
                          <User size={16} className="shrink-0 text-gray-400" aria-hidden />
                          {canAccessMyProfileHr(ws?.permissions) ? 'Account & HR' : 'Account'}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] font-semibold text-slate-800 transition hover:bg-teal-50/80"
                          onClick={() => {
                            setUserMenuOpen(false);
                            guardedNavigate('/settings');
                          }}
                        >
                          <SettingsIcon size={16} className="shrink-0 text-gray-400" aria-hidden />
                          All settings
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] font-semibold text-slate-800 transition hover:bg-teal-50/80"
                          onClick={() => {
                            setUserMenuOpen(false);
                            guardedNavigate('/me/account#security');
                          }}
                        >
                          <Lock size={16} className="shrink-0 text-gray-400" aria-hidden />
                          Password & security
                        </button>
                      </div>
                      <div className="border-t border-gray-100 py-1">
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] font-semibold text-red-700 transition hover:bg-red-50/80"
                          onClick={async () => {
                            setUserMenuOpen(false);
                            const signOutMsg = hasUnsavedWork
                              ? 'You have unsaved changes. Sign out without saving?'
                              : 'Sign out of this workspace?';
                            const ok = await confirm({ title: 'Sign out', message: signOutMsg });
                            if (!ok) return;
                            try {
                              await ws?.logout?.();
                            } catch {
                              /* ignore */
                            }
                          }}
                        >
                          <LogOut size={16} className="shrink-0" aria-hidden />
                          Sign out
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <main id="main-content" className="min-h-0 min-w-0 w-full max-w-full outline-none" tabIndex={-1}>
          <div className="px-3 pt-3 sm:px-4">
            <BootstrapTruncatedBanner bootstrapMeta={ws?.snapshot?.bootstrapMeta} />
          </div>
          <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/workspace/monitoring" element={<WorkspaceMonitoring />} />
            <Route path="/exec" element={<ExecutiveRouteErrorBoundary><ExecutiveCommandCentre /></ExecutiveRouteErrorBoundary>} />
            <Route path="/exec/m" element={<Navigate to="/exec?tab=decide" replace />} />
            <Route path="/price-list" element={<PriceListAdmin />} />
            <Route path="/pricing-policy" element={<PricingPolicyAdmin />} />
            <Route
              path="/sales"
              element={
                <ModuleRouteGuard moduleKey="sales">
                  <Sales />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/customers"
              element={
                <ModuleRouteGuard moduleKey="sales">
                  <Customers />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/customers/:customerId"
              element={
                <ModuleRouteGuard moduleKey="sales">
                  <CustomerDashboard />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/procurement"
              element={
                <ModuleRouteGuard moduleKey="procurement">
                  <Procurement />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/procurement/pricing"
              element={
                <ModuleRouteGuard moduleKey="procurement">
                  <MaterialPricingWorkbookPage />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/procurement/suppliers/:supplierId"
              element={
                <ModuleRouteGuard moduleKey="procurement">
                  <SupplierProfile />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/procurement/transport-agents/:agentId"
              element={
                <ModuleRouteGuard moduleKey="procurement">
                  <TransportAgentProfile />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/operations"
              element={
                <ModuleRouteGuard moduleKey="operations">
                  <OperationsRouteErrorBoundary>
                    <Operations />
                  </OperationsRouteErrorBoundary>
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/operations/coils/:coilNo"
              element={
                <ModuleRouteGuard moduleKey="operations">
                  <CoilProfile />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/operations/material-exceptions"
              element={
                <ModuleRouteGuard moduleKey="operations">
                  <MaterialExceptions />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/deliveries"
              element={
                <Navigate
                  to="/operations"
                  replace
                  state={{
                    focusOpsTab: 'production',
                    opsNotice:
                      'Customer deliveries desk is not available on Operations yet. Use Production line for job completion; delivery confirm will land here when shipped.',
                  }}
                />
              }
            />
            <Route
              path="/cashier"
              element={
                <ModuleRouteGuard moduleKey="finance">
                  <FinanceDeskRouteGuard desk="cashier">
                    <CashierDesk />
                  </FinanceDeskRouteGuard>
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/accounting"
              element={
                <ModuleRouteGuard moduleKey="finance">
                  <FinanceDeskRouteGuard desk="accounting">
                    <AccountingDesk />
                  </FinanceDeskRouteGuard>
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/accounts"
              element={
                <ModuleRouteGuard moduleKey="finance">
                  <LegacyAccountsRouteGuard>
                    <AccountRouteErrorBoundary>
                      <Account />
                    </AccountRouteErrorBoundary>
                  </LegacyAccountsRouteGuard>
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/accounts/bank-reconciliation"
              element={
                <ModuleRouteGuard moduleKey="finance">
                  <Navigate to="/accounts?tab=receipts" replace />
                </ModuleRouteGuard>
              }
            />
            <Route path="/accounting/*" element={<Navigate to="/accounting" replace />} />
            <Route
              path="/reports"
              element={
                <ModuleRouteGuard moduleKey="reports">
                  <ReportsRouteErrorBoundary>
                    <Reports />
                  </ReportsRouteErrorBoundary>
                </ModuleRouteGuard>
              }
            />
            <Route path="/analytics" element={<BusinessIntelligence />} />
            <Route
              path="/office"
              element={
                <ModuleRouteGuard moduleKey="office">
                  <OfficeDesk />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/edit-approvals"
              element={
                <ModuleRouteGuard moduleKey="edit_approvals">
                  <EditApprovalsPage />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/settings/*"
              element={
                <ModuleRouteGuard moduleKey="settings">
                  <SettingsRouteErrorBoundary>
                    <Settings />
                  </SettingsRouteErrorBoundary>
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/manager"
              element={
                <ModuleRouteGuard moduleKey="sales">
                  <ManagerRouteGuard>
                    <ManagerDashboard />
                  </ManagerRouteGuard>
                </ModuleRouteGuard>
              }
            />
            <Route element={<ProfileRoutesLayout />}>
              <Route
                path="/me/*"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <UserProfile />
                  </Suspense>
                }
              />
              <Route
                path="/my-profile/*"
                element={
                  <ModuleRouteGuard moduleKey="my_profile_hr">
                    <Suspense fallback={<LoadingScreen />}>
                      <MyProfile />
                    </Suspense>
                  </ModuleRouteGuard>
                }
              />
            </Route>
            <Route
              path="/executive-hr/*"
              element={
                <ModuleRouteGuard moduleKey="executive_hr">
                  <Suspense fallback={<LoadingScreen />}>
                    <ExecutiveHr />
                  </Suspense>
                </ModuleRouteGuard>
              }
            />
            <Route path="/hr/executive/*" element={<ExecutiveHrLegacyRedirect />} />
            <Route
              path="/team-hr/*"
              element={
                <ModuleRouteGuard moduleKey="team_hr">
                  <Suspense fallback={<LoadingScreen />}>
                    <TeamHr />
                  </Suspense>
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/hr/*"
              element={
                <ModuleRouteGuard moduleKey="hr">
                  <HrMainRouteGuard>
                    <HrRouteErrorBoundary>
                    <Suspense fallback={<LoadingScreen />}>
                      <HumanResources />
                    </Suspense>
                    </HrRouteErrorBoundary>
                  </HrMainRouteGuard>
                </ModuleRouteGuard>
              }
            />
            <Route path="/hr-next/*" element={<Navigate to="/hr" replace />} />
            <Route
              path="/access-denied"
              element={
                <Suspense fallback={<LoadingScreen />}>
                  <AccessDenied />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </main>
      </div>
      <Suspense fallback={null}>
        <WorkspaceCommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          ws={ws}
          hasPermission={wsHasPerm}
          initialQuery={headerSearch}
        />
      </Suspense>
      <Suspense fallback={null}>
        <HelpChatDockGate />
      </Suspense>
      <RoleTrainingReplayLayer />
      <SessionTimeoutWarning />
      <Suspense fallback={null}>
        <AiAssistantDock />
      </Suspense>
      <DegradedWorkspaceLock />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen z-app-bg flex items-center justify-center px-6">
      <div className="rounded-[28px] border border-white/70 bg-white/90 px-8 py-7 text-center shadow-xl backdrop-blur-xl">
        <img
          src={ZAREWA_LOGO_SRC}
          alt=""
          className="mx-auto h-12 w-auto object-contain object-center"
          width={120}
          height={48}
        />
        <p className="mt-3 text-ui-xs font-black uppercase tracking-[0.18em] text-slate-400">Zarewa</p>
        <p className="mt-3 text-xl font-black text-zarewa-teal">Preparing live workspace…</p>
      </div>
    </div>
  );
}

function AuthGate() {
  const ws = useWorkspace();

  if (!ws) {
    return <LoadingScreen />;
  }

  if (ws.status === 'checking') {
    return <LoadingScreen />;
  }

  if (ws.authRequired || (ws.status === 'offline' && !ws.snapshot)) {
    return <LoginScreen />;
  }

  return (
    <UnsavedWorkProvider>
      <UserOnboardingGate>
        <InventoryProvider>
          <CustomersProvider>
            <AppShell />
          </CustomersProvider>
        </InventoryProvider>
      </UserOnboardingGate>
    </UnsavedWorkProvider>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <Router>
        <WorkspaceProvider>
          <ToastProvider>
            <ConfirmProvider>
            <HelpChatProvider>
              <AiAssistantProvider>
                <DocumentTitleSync />
                <PrintSessionCleanup />
                <Routes>
                  <Route path="*" element={<AuthGate />} />
                </Routes>
              </AiAssistantProvider>
            </HelpChatProvider>
            </ConfirmProvider>
          </ToastProvider>
        </WorkspaceProvider>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
