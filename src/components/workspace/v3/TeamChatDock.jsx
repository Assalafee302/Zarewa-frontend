import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Minus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { useAiAssistant } from '../../../context/AiAssistantContext';
import { useOptionalToast } from '../../../context/ToastContext';
import { resolveDeskProfile } from '../../../lib/workspaceDeskNav';
import { appFabRightClass, appFabSlots } from '../../../lib/appFabLayout';
import { TEAM_CHAT_OPEN_EVENT } from '../../../lib/teamChatEvents';
import { useWorkspaceTeamChat } from '../../../hooks/useWorkspaceTeamChat';
import CreateOfficeRecordWizard from '../CreateOfficeRecordWizard';
import RoomList from './RoomList';
import RoomView from './RoomView';

const CREATE_KIND_MAP = {
  memo: 'general_internal',
  expense: 'expense_support',
  material: 'procurement_request',
};

/**
 * Gmail / Messenger-style team chat: FAB in the bottom-right stack, compact panel above it.
 */
export function TeamChatDock() {
  const ws = useWorkspace();
  const ai = useAiAssistant();
  const navigate = useNavigate();
  const { show: showToast } = useOptionalToast();
  const user = ws?.session?.user;
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState(null);

  const chat = useWorkspaceTeamChat({ open });
  const { setActiveRoomId, activeRoomId } = chat;
  const deskProfile = resolveDeskProfile({
    roleKey: user?.roleKey,
    permissions: ws?.permissions,
  });

  const aiDockVisible = Boolean(user && user.roleKey !== 'ceo' && ai?.available === true);
  const launcherClass = appFabRightClass(appFabSlots({ aiDockVisible }).chat);

  const openDock = useCallback((roomId) => {
    setOpen(true);
    if (roomId) setActiveRoomId(String(roomId));
  }, [setActiveRoomId]);

  useEffect(() => {
    const onOpen = (ev) => {
      openDock(ev?.detail?.roomId);
    };
    window.addEventListener(TEAM_CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(TEAM_CHAT_OPEN_EVENT, onOpen);
  }, [openDock]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const tag = String(e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (activeRoomId) {
        setActiveRoomId(null);
        return;
      }
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, activeRoomId, setActiveRoomId]);

  const handlePromote = async (kind, excerpt, messageId) => {
    if (!excerpt?.trim()) {
      showToast?.('Add message text before converting', { variant: 'warning' });
      return;
    }
    if (kind === 'memo' || kind === 'expense' || kind === 'material') {
      setCreatePrefill({
        recordType: CREATE_KIND_MAP[kind] || kind,
        body: excerpt,
        subject: String(excerpt).slice(0, 80),
      });
      setCreateOpen(true);
      return;
    }
    await chat.handlePromoteApi(kind, excerpt, messageId);
  };

  if (!user) return null;

  const unread = chat.unreadCount;
  const unreadLabel = unread > 99 ? '99+' : String(unread);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`z-team-chat-launcher fixed z-[165] flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl border border-teal-200/60 bg-white text-teal-800 shadow-lg transition hover:scale-[1.03] hover:bg-teal-50 active:scale-[0.98] bottom-[max(1.25rem,env(safe-area-inset-bottom))] ${launcherClass}`}
        aria-label={open ? 'Close chat' : unread > 0 ? `Open chat, ${unread} unread` : 'Open chat'}
        aria-pressed={open}
        title="Chat"
      >
        <MessageSquare size={24} strokeWidth={2} aria-hidden />
        {!open && unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unreadLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="z-team-chat-panel fixed z-[168] flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+4.75rem)] right-[max(1.25rem,env(safe-area-inset-right))] h-[min(36rem,calc(100dvh-8rem))]"
          role="dialog"
          aria-label="Team chat"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-zarewa-teal px-3 py-2.5 text-white">
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight">Chat</p>
              <p className="truncate text-[11px] font-medium text-teal-100/90">
                {chat.activeRoom ? chat.activeRoom.name || `#${chat.activeRoom.slug}` : 'Team messages'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/90 hover:bg-white/10"
                aria-label="Minimize chat"
                title="Minimize"
              >
                <Minus size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => {
                  chat.setActiveRoomId(null);
                  setOpen(false);
                }}
                className="rounded-lg p-1.5 text-white/90 hover:bg-white/10"
                aria-label="Close chat"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            {chat.activeRoom ? (
              <RoomView
                room={chat.activeRoom}
                messages={chat.messages}
                pinnedCards={chat.pinnedCards}
                loading={chat.messagesLoading}
                sending={chat.sending}
                onSend={chat.handleSend}
                onPromote={chat.activeRoom.bot ? undefined : handlePromote}
                hasMore={chat.hasEarlierMessages}
                loadingEarlier={chat.loadingEarlier}
                onLoadEarlier={() => {
                  const oldest = chat.messages[0]?.createdAtIso;
                  if (oldest) void chat.loadMessages(chat.activeRoomId, { beforeIso: oldest });
                }}
                onMuteRoom={chat.activeRoom.bot ? undefined : chat.handleMuteRoom}
                onArchiveRoom={chat.activeRoom.bot ? undefined : chat.handleArchiveRoom}
                onEditMessage={chat.activeRoom.bot ? undefined : chat.handleEditMessage}
                onDeleteMessage={chat.activeRoom.bot ? undefined : chat.handleDeleteMessage}
                directory={chat.dmDirectory || []}
                presenceByUser={chat.presenceByUser}
                currentUserId={chat.userId}
                onBack={() => chat.setActiveRoomId(null)}
                alwaysShowBack
                composerDisabled={chat.readOnly}
                composerDisabledReason={
                  chat.readOnly ? 'Read-only snapshot — reconnect to send messages.' : undefined
                }
                deskProfile={deskProfile}
                onOpenCard={(card) => {
                  if (card.workItemId) {
                    setOpen(false);
                    navigate('/', { state: { workItemId: card.workItemId } });
                  }
                }}
              />
            ) : (
              <RoomList
                rooms={chat.filteredRooms}
                activeRoomId={chat.activeRoomId}
                loading={chat.roomsLoading && chat.rooms.length === 0}
                searchQuery={chat.roomQuery}
                onSearchQueryChange={chat.setRoomQuery}
                onSelectRoom={(r) => chat.setActiveRoomId(r.id)}
                onRetry={() => {
                  chat.setDmLoadFailed(false);
                  void chat.loadRooms();
                }}
                onStartDm={chat.handleStartDm}
                dmDirectory={chat.dmDirectory}
                dmCreating={chat.dmCreating}
                presenceByUser={chat.presenceByUser}
                currentUserId={chat.userId}
                onMuteRoom={chat.handleMuteRoom}
                onArchiveRoom={chat.handleArchiveRoom}
              />
            )}
          </div>
        </div>
      ) : null}

      <CreateOfficeRecordWizard
        open={createOpen}
        initialPrefill={createPrefill}
        onClose={() => {
          setCreateOpen(false);
          setCreatePrefill(null);
        }}
        onCreated={() => {
          setCreatePrefill(null);
          showToast?.('Record created', { variant: 'success' });
        }}
      />
    </>
  );
}

export default TeamChatDock;
