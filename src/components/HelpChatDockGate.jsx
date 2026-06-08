import React, { Suspense, Component, useEffect } from 'react';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { useHelpChat } from '../context/HelpChatContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ZareHelpFab } from './ZareHelpFab';
import { debugBootLog } from '../lib/debugBoot.js';

const HelpChatDock = lazyWithRetry(
  () =>
    import('./HelpChatDock.jsx')
      .then((m) => {
        debugBootLog('HelpChatDockGate.jsx:dock-import-ok', 'HelpChatDock chunk loaded', {}, 'E');
        return { default: m.HelpChatDock };
      })
      .catch((err) => {
        debugBootLog(
          'HelpChatDockGate.jsx:dock-import-fail',
          'HelpChatDock chunk failed',
          { message: String(err?.message || err), stack: String(err?.stack || '').slice(0, 600) },
          'E'
        );
        throw err;
      }),
  { id: 'HelpChatDock' }
);

class HelpChatDockErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Zarewa] Zare help dock failed to load', error, info?.componentStack);
    debugBootLog(
      'HelpChatDockGate.jsx:boundary',
      'HelpChatDock render error',
      {
        message: String(error?.message || error),
        stack: String(error?.stack || '').slice(0, 600),
      },
      'E'
    );
  }

  render() {
    if (this.state.error) {
      return <ZareHelpFab loadError={String(this.state.error?.message || this.state.error)} />;
    }
    return this.props.children;
  }
}

/**
 * Defers the heavy Zare help bundle until the user opens Zare (avoids startup TDZ/crash).
 */
export function HelpChatDockGate() {
  const { dockMounted } = useHelpChat() || {};
  const ws = useWorkspace();
  const user = ws?.session?.user;

  useEffect(() => {
    if (!user) return;
    debugBootLog(
      'HelpChatDockGate.jsx:mount',
      'HelpChatDockGate active for user',
      { dockMounted: Boolean(dockMounted) },
      'E'
    );
  }, [user, dockMounted]);

  if (!user) return null;

  if (!dockMounted) {
    return <ZareHelpFab />;
  }

  return (
    <HelpChatDockErrorBoundary>
      <Suspense fallback={<ZareHelpFab />}>
        <HelpChatDock />
      </Suspense>
    </HelpChatDockErrorBoundary>
  );
}
