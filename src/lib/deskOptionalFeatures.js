/**
 * Optional desk surfaces that are off by default for weaker networks.
 * Partner wallet and staff purchase credit are core finance — not gated here.
 *
 * Re-enable with Vite env:
 *   VITE_TEAM_CHAT=1
 *   VITE_AI_ASSISTANT=1
 *
 * On save-data / 2G–3G links, leave these off even if env is set — desks need the bandwidth.
 * Force-enable with VITE_TEAM_CHAT_FORCE=1 / VITE_AI_ASSISTANT_FORCE=1.
 */

import { isConstrainedNetwork } from './workspaceDomainPrefetch';

function envOn(name) {
  try {
    const raw = import.meta.env?.[name];
    return raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes';
  } catch {
    return false;
  }
}

/** Workspace team chat FAB / dock + realtime polls when open. */
export function isTeamChatEnabled() {
  if (!envOn('VITE_TEAM_CHAT')) return false;
  if (envOn('VITE_TEAM_CHAT_FORCE')) return true;
  return !isConstrainedNetwork();
}

/** Floating AI assistant dock + /api/ai/status on desk load. */
export function isAiAssistantEnabled() {
  if (!envOn('VITE_AI_ASSISTANT')) return false;
  if (envOn('VITE_AI_ASSISTANT_FORCE')) return true;
  return !isConstrainedNetwork();
}
