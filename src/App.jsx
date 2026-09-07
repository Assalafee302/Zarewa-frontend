/**
 * Thin auth boot: WorkspaceProvider + login OR lazy desk shell.
 * Heavy ERP chrome lives in AppDesk.jsx and downloads only after sign-in.
 */
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RefreshCw, WifiOff } from 'lucide-react';
import { ToastProvider, useToast } from './context/ToastContext';
import { ConfirmProvider, useConfirmDialog } from './context/ConfirmProvider';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';

const LoginScreen = lazyWithRetry(() => import('./components/auth/LoginScreen'), { id: 'LoginScreen' });
const AppDesk = lazyWithRetry(() => import('./AppDesk.jsx'), { id: 'AppDesk' });

/** Minimal boot UI — matches index.html #zarewa-boot so the handoff feels instant. */
function BootScreen({ title = 'Preparing live workspace…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-6">
      <div className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 px-8 py-7 text-center shadow-xl">
        <img
          src="/zarewa-logo.png"
          alt=""
          className="mx-auto h-12 w-auto object-contain"
          width={120}
          height={48}
        />
        <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Zarewa</p>
        <p className="mt-3 text-xl font-black text-[#134e4a]">{title}</p>
        <div
          className="mx-auto mt-4 h-6 w-6 animate-spin rounded-full border-[3px] border-[#d3e8e5] border-t-[#134e4a]"
          role="status"
          aria-label="Loading"
        />
      </div>
    </div>
  );
}

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
          <p className="mt-3 rounded-lg border border-amber-200/80 bg-white/80 px-3 py-2 text-left font-mono text-[11px] text-amber-900/90 break-words">
            {ws.lastError}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={retrying}
            onClick={() => void handleReconnect()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#134e4a] px-4 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg hover:brightness-110 disabled:opacity-50"
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

function AuthGate() {
  const ws = useWorkspace();

  if (!ws || ws.status === 'checking') {
    return <BootScreen />;
  }

  if (ws.authRequired || (ws.status === 'offline' && !ws.snapshot)) {
    return (
      <Suspense fallback={<BootScreen title="Loading sign-in…" />}>
        <LoginScreen />
      </Suspense>
    );
  }

  return (
    <>
      <DegradedWorkspaceLock />
      <Suspense fallback={<BootScreen title="Opening your desk…" />}>
        <AppDesk />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <Router>
        <WorkspaceProvider>
          <ToastProvider>
            <ConfirmProvider>
              <Routes>
                <Route path="*" element={<AuthGate />} />
              </Routes>
            </ConfirmProvider>
          </ToastProvider>
        </WorkspaceProvider>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
