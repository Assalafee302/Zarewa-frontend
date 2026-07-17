import { apiFetch, apiUrl } from './apiBase.js';

function postBody(obj) {
  return JSON.stringify(obj ?? {});
}

function requireRoomId(roomId) {
  const id = String(roomId || '').trim();
  return id || null;
}

export async function fetchWorkspaceRooms() {
  const { ok, data } = await apiFetch('/api/workspace/rooms');
  if (!ok || !data?.ok) return { rooms: [], error: data?.error || 'Failed to load rooms' };
  return { rooms: Array.isArray(data.rooms) ? data.rooms : [], error: null };
}

export async function fetchRoomMessages(roomId, { limit = 80, signal } = {}) {
  const id = requireRoomId(roomId);
  if (!id) return { messages: [], pinned: [], error: 'Room id required' };
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 80));
  const { ok, data } = await apiFetch(
    `/api/workspace/rooms/${encodeURIComponent(id)}/messages?limit=${safeLimit}`,
    signal ? { signal } : {}
  );
  if (!ok || !data?.ok) return { messages: [], pinned: [], error: data?.error || 'Failed to load messages' };
  return {
    messages: Array.isArray(data.messages) ? data.messages : [],
    pinned: Array.isArray(data.pinned) ? data.pinned : [],
    threadId: data.threadId,
    error: null,
  };
}

/** Mark the room's unread cursor as read for the current user. */
export async function markRoomRead(roomId) {
  const id = requireRoomId(roomId);
  if (!id) return false;
  const { ok, data } = await apiFetch(`/api/workspace/rooms/${encodeURIComponent(id)}/read`, {
    method: 'POST',
    body: postBody({}),
  });
  return Boolean(ok && data?.ok);
}

export async function sendRoomMessage(roomId, body) {
  const id = requireRoomId(roomId);
  if (!id) return { message: null, error: 'Room id required' };
  const text = typeof body === 'string' ? body : body?.body;
  const attachments = typeof body === 'object' && Array.isArray(body?.attachments) ? body.attachments : [];
  if (!String(text || '').trim() && attachments.length === 0) {
    return { message: null, error: 'Message is required' };
  }
  const { ok, data } = await apiFetch(`/api/workspace/rooms/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    body: postBody({
      body: String(text || '').trim(),
      ...(attachments.length ? { attachments } : {}),
    }),
  });
  if (!ok || !data?.ok) return { message: null, error: data?.error || 'Send failed' };
  return { message: data.message || null, error: null };
}

export async function pinRoomWorkCard(roomId, payload) {
  const id = requireRoomId(roomId);
  if (!id) return { ok: false, error: 'Room id required' };
  const { ok, data } = await apiFetch(`/api/workspace/rooms/${encodeURIComponent(id)}/pin`, {
    method: 'POST',
    body: postBody(payload),
  });
  if (!ok || !data?.ok) return { ok: false, error: data?.error || 'Pin failed' };
  return { ok: true, pinned: data.pinned, error: null };
}

export async function createWorkspaceDm(peerUserId) {
  const peer = String(peerUserId || '').trim();
  if (!peer) return { ok: false, room: null, error: 'Peer user is required' };
  const { ok, data } = await apiFetch('/api/workspace/rooms/dm', {
    method: 'POST',
    body: postBody({ peerUserId: peer }),
  });
  if (!ok || !data?.ok) return { ok: false, room: null, error: data?.error || 'DM create failed' };
  return { ok: true, room: data.room, reused: Boolean(data.reused), error: null };
}

export async function fetchWorkspaceActivity({ limit = 50 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const { ok, data } = await apiFetch(`/api/workspace/activity?limit=${safeLimit}`);
  if (!ok || !data?.ok) return { events: [], error: data?.error || 'Failed to load activity' };
  return { events: Array.isArray(data.events) ? data.events : [], error: null };
}

export async function markWorkspaceActivityRead() {
  const { ok, data } = await apiFetch('/api/workspace/activity/read', {
    method: 'POST',
    body: postBody({}),
  });
  return Boolean(ok && data?.ok);
}

export async function fetchWorkspacePresence() {
  const { ok, data } = await apiFetch('/api/workspace/presence');
  if (!ok || !data?.ok) return { presence: [], error: data?.error || 'Failed' };
  return { presence: Array.isArray(data.presence) ? data.presence : [], error: null };
}

export async function postPresenceHeartbeat({ status = 'online' } = {}) {
  const { ok, data } = await apiFetch('/api/workspace/presence/heartbeat', {
    method: 'POST',
    body: postBody({ status }),
  });
  return Boolean(ok && data?.ok);
}

export async function promoteRoomMessage(roomId, { kind, excerpt, messageId }) {
  const id = requireRoomId(roomId);
  if (!id) return { ok: false, error: 'Room id required', result: null };
  if (!String(excerpt || '').trim()) {
    return { ok: false, error: 'Excerpt is required', result: null };
  }
  const { ok, data } = await apiFetch(`/api/workspace/rooms/${encodeURIComponent(id)}/promote`, {
    method: 'POST',
    body: postBody({ kind, excerpt: String(excerpt).trim(), messageId }),
  });
  if (!ok || !data?.ok) return { ok: false, error: data?.error || 'Promote failed', result: null };
  return { ok: true, error: null, result: data };
}

/**
 * Open SSE stream; returns EventSource or null.
 * Requires same-origin cookie session — always pass withCredentials: true.
 */
export function openWorkspaceRealtime({ onEvent, onError, onOpen } = {}) {
  try {
    if (typeof EventSource === 'undefined') return null;
    const url = apiUrl('/api/workspace/realtime');
    const es = new EventSource(url, { withCredentials: true });
    es.onopen = () => {
      onOpen?.();
    };
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        onEvent?.(payload);
      } catch {
        /* ignore malformed */
      }
    };
    es.onerror = (err) => {
      onError?.(err);
    };
    return es;
  } catch {
    return null;
  }
}

/** @returns {boolean} Whether the browser EventSource supports credentialed cookies. */
export function workspaceRealtimeSupportsCredentials() {
  try {
    return typeof EventSource !== 'undefined';
  } catch {
    return false;
  }
}
