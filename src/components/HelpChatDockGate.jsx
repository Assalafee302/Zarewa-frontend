import React, { Suspense, Component } from 'react';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { useHelpChat } from '../context/HelpChatContext';
import { useWorkspace } from '../context/WorkspaceContext';

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
    if (this.state.error) return null;
    return this.props.children;
  }
}

/**
 * Defers the heavy Zare help bundle until openZare() (in-page Ask Zare / transaction help).
 * No floating launcher — Zare lives in Chat.
 */
export function HelpChatDockGate() {
  const { dockMounted } = useHelpChat() || {};
  const ws = useWorkspace();
  const user = ws?.session?.user;

  if (!user || !dockMounted) return null;

  return (
    <HelpChatDockErrorBoundary>
      <Suspense fallback={null}>
        <HelpChatDock />
      </Suspense>
    </HelpChatDockErrorBoundary>
  );
}
