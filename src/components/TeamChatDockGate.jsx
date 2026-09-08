import React, { Suspense, Component, useCallback, useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAiAssistant } from '../context/AiAssistantContext';
import { appFabRightClass, appFabSlots } from '../lib/appFabLayout';
import { TEAM_CHAT_OPEN_EVENT } from '../lib/teamChatEvents';
import { isTeamChatEnabled } from '../lib/deskOptionalFeatures';

const TeamChatDock = lazyWithRetry(
  () => import('./workspace/v3/TeamChatDock.jsx').then((m) => ({ default: m.TeamChatDock })),
  { id: 'TeamChatDock' }
);

function TeamChatFabButton({ onClick, disabled = false, title = 'Chat' }) {
  const ws = useWorkspace();
  const ai = useAiAssistant();
  const user = ws?.session?.user;
  if (!user) return null;
  const aiDockVisible = Boolean(user.roleKey !== 'ceo' && ai?.available === true);
  const launcherClass = appFabRightClass(appFabSlots({ aiDockVisible }).chat);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`z-team-chat-launcher fixed z-[165] flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl border border-teal-200/60 bg-white text-teal-800 shadow-lg bottom-[max(1.25rem,env(safe-area-inset-bottom))] ${launcherClass}${disabled ? '' : ' transition hover:scale-[1.03] hover:bg-teal-50 active:scale-[0.98]'}`}
      aria-label="Chat"
      title={title}
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

/**
 * Defers the heavy team-chat bundle until the FAB is clicked or openTeamChat() fires.
 * Mirrors HelpChatDockGate so desk first paint does not pay for RoomList/RoomView.
 */
export function TeamChatDockGate() {
  const ws = useWorkspace();
  const user = ws?.session?.user;
  const [dockMounted, setDockMounted] = useState(false);
  const [openOnMount, setOpenOnMount] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState(null);
  const chatOn = isTeamChatEnabled();

  const mountDock = useCallback((opts = {}) => {
    if (!isTeamChatEnabled()) return;
    if (opts.roomId) setPendingRoomId(String(opts.roomId));
    if (opts.open !== false) setOpenOnMount(true);
    setDockMounted(true);
  }, []);

  useEffect(() => {
    if (!chatOn) return undefined;
    const onOpen = (ev) => {
      mountDock({ roomId: ev?.detail?.roomId, open: true });
    };
    window.addEventListener(TEAM_CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(TEAM_CHAT_OPEN_EVENT, onOpen);
  }, [chatOn, mountDock]);

  if (!chatOn || !user) return null;

  if (!dockMounted) {
    return <TeamChatFabButton onClick={() => mountDock({ open: true })} />;
  }

  return (
    <TeamChatDockErrorBoundary>
      <Suspense fallback={<TeamChatFabButton disabled title="Loading chat…" />}>
        <TeamChatDock initialOpen={openOnMount} initialRoomId={pendingRoomId} />
      </Suspense>
    </TeamChatDockErrorBoundary>
  );
}
