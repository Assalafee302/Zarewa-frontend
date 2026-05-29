import { apiFetch } from './apiBase';

export function fetchHrNotifications(opts = {}) {
  const q = new URLSearchParams();
  if (opts.unreadOnly) q.set('unreadOnly', '1');
  const suffix = q.toString() ? `?${q}` : '';
  return apiFetch(`/api/hr/notifications${suffix}`);
}

export function markHrNotificationRead(notificationId) {
  return apiFetch(`/api/hr/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH' });
}

export function markAllHrNotificationsRead() {
  return apiFetch('/api/hr/notifications/mark-all-read', { method: 'POST' });
}
