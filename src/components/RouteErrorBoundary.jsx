import React from 'react';
import { attemptChunkReload } from '../lib/lazyWithRetry.js';
import { humanizeReactError } from '../lib/reactErrorMessage.js';

/**
 * Factory for route-level error boundaries with retry.
 * @param {{ title?: string; description?: string; moduleName?: string }} [defaults]
 */
export function createRouteErrorBoundary(defaults = {}) {
  const title = defaults.title || `${defaults.moduleName || 'This page'} temporarily unavailable`;
  const description =
    defaults.description ||
    'A screen error occurred while loading this page. Try again or refresh the browser. If this persists, contact support with the time and what you were doing.';

  return class RouteErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, info) {
      if (attemptChunkReload(error, 'route-error-boundary')) return;
      console.error('[Zarewa] route error', error, info?.componentStack);
    }

    handleRetry = () => {
      this.setState({ hasError: false, error: null });
    };

    render() {
      if (!this.state.hasError) return this.props.children;

      const message = humanizeReactError(this.state.error);
      const showDetail = import.meta.env.DEV;

      return (
        <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
          <h2 className="text-lg font-black text-zarewa-teal">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
          {showDetail && message ? (
            <pre className="mt-4 max-h-32 w-full overflow-auto rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-600 whitespace-pre-wrap break-words">
              {message}
            </pre>
          ) : null}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-xl bg-zarewa-teal px-5 py-2.5 text-sm font-bold text-white hover:brightness-105"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
  };
}

/** Pre-built boundaries for common modules */
export const AccountRouteErrorBoundary = createRouteErrorBoundary({ moduleName: 'Finance desk' });
export const OperationsRouteErrorBoundary = createRouteErrorBoundary({ moduleName: 'Operations' });
export const HrRouteErrorBoundary = createRouteErrorBoundary({ moduleName: 'HR' });
export const ExecutiveRouteErrorBoundary = createRouteErrorBoundary({ moduleName: 'Executive Command Centre' });
export const ReportsRouteErrorBoundary = createRouteErrorBoundary({ moduleName: 'Reports' });
export const SettingsRouteErrorBoundary = createRouteErrorBoundary({ moduleName: 'Settings' });
