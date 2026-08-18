/** Open the floating team-chat dock (Gmail / Messenger style). */
export const TEAM_CHAT_OPEN_EVENT = 'zarewa:open-team-chat';

/**
 * @param {{ roomId?: string }} [detail]
 */
export function openTeamChat(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TEAM_CHAT_OPEN_EVENT, { detail: detail || {} }));
}
