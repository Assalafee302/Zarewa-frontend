import React from 'react';
import { LifeBuoy } from 'lucide-react';
import { useAiAssistant } from '../context/AiAssistantContext';
import { useHelpChat } from '../context/HelpChatContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { HELP_BOT_NAME, HELP_BOT_TAGLINE } from '../lib/helpBotBrand';

/**
 * Lightweight Zare launcher — no help catalog imports (safe at app startup).
 */
export function ZareHelpFab({ loadError = '' }) {
  const help = useHelpChat();
  const ws = useWorkspace();
  const ai = useAiAssistant();
  const user = ws?.session?.user;

  if (!user || !help?.openZare) return null;

  const aiDockVisible = Boolean(user.roleKey !== 'ceo' && ai?.available === true);
  const launcherClass = aiDockVisible
    ? 'right-[calc(max(1.25rem,env(safe-area-inset-right))+4.25rem)]'
    : 'right-[max(1.25rem,env(safe-area-inset-right))]';

  return (
    <button
      type="button"
      onClick={() => {
        if (loadError) {
          window.location.reload();
          return;
        }
        help.openZare({
          autoSend: false,
          resetConversation: false,
          prompt: '',
        });
      }}
      className={`z-help-launcher fixed z-[165] flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl border border-teal-200/60 bg-gradient-to-br from-zarewa-teal via-[#0f766e] to-[#115e59] text-teal-50 transition hover:scale-[1.03] active:scale-[0.98] bottom-[max(1.25rem,env(safe-area-inset-bottom))] ${launcherClass}`}
      aria-label={`Open ${HELP_BOT_NAME}`}
      title={
        loadError
          ? `Zare help failed to load — click to retry (${loadError})`
          : `${HELP_BOT_NAME} — ${HELP_BOT_TAGLINE}`
      }
    >
      <LifeBuoy size={26} strokeWidth={2} aria-hidden />
    </button>
  );
}
