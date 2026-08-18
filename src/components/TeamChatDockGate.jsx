import React, { Suspense, Component } from 'react';
import { MessageSquare } from 'lucide-react';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAiAssistant } from '../context/AiAssistantContext';
import { appFabRightClass, appFabSlots } from '../lib/appFabLayout';

const TeamChatDock = lazyWithRetry(
  () => import('./workspace/v3/TeamChatDock.jsx').then((m) => ({ default: m.TeamChatDock })),
  { id: 'TeamChatDock' }
);

function TeamChatFabFallback() {
  const ws = useWorkspace();
  const ai = useAiAssistant();
  const user = ws?.session?.user;
  if (!user) return null;
  const aiDockVisible = Boolean(user.roleKey !== 'ceo' && ai?.available === true);
  const launcherClass = appFabRightClass(appFabSlots({ aiDockVisible }).chat);
  return (
    <button
      type="button"
      disabled
      className={`z-team-chat-launcher fixed z-[165] flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl border border-teal-200/60 bg-white text-teal-800 shadow-lg bottom-[max(1.25rem,env(safe-area-inset-bottom))] ${launcherClass}`}
      aria-label="Chat"
      title="Chat"
    >
      <MessageSquare size={24} strokeWidth={2} aria-hidden />
    </button>
  );
}

class TeamChatDockErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Zarewa] Team chat dock failed to load', error, info?.componentStack);
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

export function TeamChatDockGate() {
  const ws = useWorkspace();
  const user = ws?.session?.user;
  if (!user) return null;

  return (
    <TeamChatDockErrorBoundary>
      <Suspense fallback={<TeamChatFabFallback />}>
        <TeamChatDock />
      </Suspense>
    </TeamChatDockErrorBoundary>
  );
}
