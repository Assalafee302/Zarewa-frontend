import { HELP_BOT_NAME, HELP_BOT_TAGLINE } from './helpBotBrand.js';

export const ZARE_CHAT_ROOM_ID = 'zare-ai';
export const ZARE_CHAT_USER_ID = 'zare-bot';

export function isZareChatRoomId(id) {
  return String(id || '').trim() === ZARE_CHAT_ROOM_ID;
}

export function isZareChatUserId(id) {
  return String(id || '').trim() === ZARE_CHAT_USER_ID;
}

export function zareChatStorageKey(userId) {
  return `zarewa.teamChat.zare.${String(userId || 'anon').trim() || 'anon'}`;
}

export function zareIntroMessage() {
  return {
    id: 'zare-intro',
    body: `Hi — I'm ${HELP_BOT_NAME}. Ask me how to use Zarewa, SOPs, and what to do next. I explain the steps; you still approve and post in the app.`,
    authorUserId: ZARE_CHAT_USER_ID,
    authorDisplayName: HELP_BOT_NAME,
    createdAtIso: new Date().toISOString(),
  };
}

export function loadZareChatMessages(userId) {
  try {
    const raw = sessionStorage.getItem(zareChatStorageKey(userId));
    const list = raw ? JSON.parse(raw) : null;
    if (Array.isArray(list) && list.length) return list;
  } catch {
    /* storage unavailable */
  }
  return [zareIntroMessage()];
}

export function saveZareChatMessages(userId, messages) {
  try {
    const list = Array.isArray(messages) ? messages.slice(-80) : [];
    sessionStorage.setItem(zareChatStorageKey(userId), JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export function previewFromZareMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const last = list[list.length - 1];
  if (!last) return null;
  return {
    preview: String(last.body || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    createdAtIso: last.createdAtIso || new Date().toISOString(),
    authorUserId: last.authorUserId || ZARE_CHAT_USER_ID,
  };
}

export function buildZareChatRoom({ lastMessage } = {}) {
  return {
    id: ZARE_CHAT_ROOM_ID,
    name: HELP_BOT_NAME,
    slug: 'zare',
    description: HELP_BOT_TAGLINE,
    scopeKind: 'dm',
    kind: 'dm',
    peerUserId: ZARE_CHAT_USER_ID,
    bot: true,
    unreadCount: 0,
    lastMessage: lastMessage || null,
  };
}

export function injectZareChatRoom(rooms, { lastMessage } = {}) {
  const rest = (Array.isArray(rooms) ? rooms : []).filter((r) => !isZareChatRoomId(r?.id));
  return [buildZareChatRoom({ lastMessage }), ...rest];
}

export function zareDirectoryEntry() {
  return {
    id: ZARE_CHAT_USER_ID,
    displayName: HELP_BOT_NAME,
    username: 'zare',
    bot: true,
  };
}

export function injectZareDirectory(users) {
  const rest = (Array.isArray(users) ? users : []).filter((u) => !isZareChatUserId(u?.id));
  return [zareDirectoryEntry(), ...rest];
}

export function zareHelpHistoryFromMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => m?.id !== 'zare-intro' && String(m?.body || '').trim())
    .map((m) => ({
      role: isZareChatUserId(m.authorUserId) ? 'assistant' : 'user',
      content: String(m.body || '').trim(),
    }));
}
