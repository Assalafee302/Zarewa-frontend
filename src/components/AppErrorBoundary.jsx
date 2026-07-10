import React from 'react';
import { attemptChunkReload } from '../lib/lazyWithRetry.js';
import { humanizeReactError } from '../lib/reactErrorMessage.js';

/**
 * Catches render errors so users see a recovery screen instead of a blank page.
 */
export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (attemptChunkReload(error, 'error-boundary')) return;
    console.error('[Zarewa] UI error', error, info?.componentStack);
    const payload = {
      message: String(error?.message || error),
      stack: String(error?.stack || '').slice(0, 800),
      componentStack: String(info?.componentStack || '').slice(0, 400),
    };
    try {
      sessionStorage.setItem('zarewa.boot.error', JSON.stringify({ ...payload, build: typeof __ZAREWA_BUILD_ID__ !== 'undefined' ? __ZAREWA_BUILD_ID__ : '', at: Date.now() }));
    } catch {
      /* ignore */
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const message = humanizeReactError(error);
    const showDetail = import.meta.env.DEV;
    const stackHint = (() => {
      if (!showDetail) return '';
      try {
        const raw = sessionStorage.getItem('zarewa.boot.error');
        if (!raw) return '';
        const parsed = JSON.parse(raw);
        return String(parsed?.componentStack || '').trim();
      } catch {
        return '';
      }
    })();

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6" role="alert">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
          <h1 className="text-lg font-black text-red-900">Zarewa could not load</h1>
          <p className="mt-2 text-sm text-slate-700 leading-relaxed">
            Something crashed while starting the app. Try a hard refresh (Ctrl+Shift+R). If this
            continues after deploy, ask IT to copy the entire <code className="text-xs">dist/</code>{' '}
            folder in one step (all <code className="text-xs">assets/*</code> plus{' '}
            <code className="text-xs">index.html</code>), confirm the API is running, and check View
            Source for <code className="text-xs">zarewa-build</code> matching the git commit they deployed.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-red-800 whitespace-pre-wrap break-words">
            {message}
          </pre>
          {showDetail && stackHint ? (
            <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-slate-50 p-3 text-ui-xs text-slate-600 whitespace-pre-wrap break-words">
              {stackHint}
            </pre>
          ) : null}
          {typeof __ZAREWA_BUILD_ID__ !== 'undefined' ? (
            <p className="mt-2 text-ui-xs text-slate-500">
              Build: <code>{__ZAREWA_BUILD_ID__}</code>
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 w-full z-btn-primary py-3"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
