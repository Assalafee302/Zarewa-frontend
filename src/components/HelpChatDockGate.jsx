import React, { Suspense, lazy } from 'react';
import { useHelpChat } from '../context/HelpChatContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ZareHelpFab } from './ZareHelpFab';

const HelpChatDock = lazy(() =>
  import('./HelpChatDock.jsx').then((m) => ({ default: m.HelpChatDock }))
);

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
    <Suspense fallback={<ZareHelpFab />}>
      <HelpChatDock />
    </Suspense>
  );
}
