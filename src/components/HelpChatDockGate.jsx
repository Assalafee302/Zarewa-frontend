import React, { Suspense, Component } from 'react';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { useHelpChat } from '../context/HelpChatContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ZareHelpFab } from './ZareHelpFab';

const HelpChatDock = lazyWithRetry(
  () => import('./HelpChatDock.jsx').then((m) => ({ default: m.HelpChatDock })),
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
