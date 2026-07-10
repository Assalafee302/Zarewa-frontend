import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import {
  fetchHrNotifications,
  markAllHrNotificationsRead,
  markHrNotificationRead,
} from '../../lib/hrNotifications';

/**
 * @param {{ compact?: boolean; onUnreadChange?: (n: number) => void }} props
 */
export function HrNotificationsPanel({ compact = false, onUnreadChange }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const applyUnread = useCallback(
    (n) => {
      setUnreadCount(n);
      onUnreadChange?.(n);
    },
    [onUnreadChange]
  );

  const { reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrNotifications();
    if (!ok || !data?.ok) {
      setNotifications([]);
      applyUnread(0);
      return { hasData: false };
    }
    setNotifications(data.notifications || []);
    applyUnread(data.unreadCount ?? 0);
    return { hasData: true };
  }, []);

  const onRead = async (id) => {
    const { ok, data } = await markHrNotificationRead(id);
    if (ok && data?.ok) {
      await reload();
    }
  };

  const onReadAll = async () => {
    const { ok, data } = await markAllHrNotificationsRead();
    if (ok && data?.ok) {
      await reload();
    }
  };

  const panel = (
    <div
      className={
        compact
          ? 'rounded-2xl border border-slate-100 bg-white p-4 shadow-sm'
          : 'rounded-2xl border border-slate-100 bg-white p-5 shadow-sm'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-zarewa-teal" aria-hidden />
          <h3 className="text-sm font-black text-zarewa-teal">HR notifications</h3>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-ui-xs font-bold text-amber-900">
              {unreadCount} new
            </span>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <button type="button" onClick={onReadAll} className="text-ui-xs font-bold uppercase text-zarewa-teal">
            Mark all read
          </button>
        ) : null}
      </div>
      {notifications.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No notifications yet.</p>
      ) : (
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                n.read ? 'border-slate-100 bg-slate-50/50' : 'border-teal-100 bg-teal-50/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-xs text-slate-600">{n.body}</p> : null}
                  <p className="mt-1 text-ui-xs text-slate-400">{n.createdAtIso?.slice(0, 16).replace('T', ' ')}</p>
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    onClick={() => onRead(n.id)}
                    className="shrink-0 text-ui-xs font-bold uppercase text-zarewa-teal"
                  >
                    Read
                  </button>
                ) : null}
              </div>
              {n.routePath ? (
                <Link to={n.routePath} className="mt-1 inline-block text-ui-xs font-bold uppercase text-zarewa-teal">
                  Open
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (!compact) return panel;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-zarewa-teal shadow-sm"
      >
        <Bell size={16} className="inline mr-1.5 -mt-0.5" aria-hidden />
        Notifications
        {unreadCount > 0 ? (
          <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-ui-xs text-white">{unreadCount}</span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[min(100vw-2rem,24rem)]">{panel}</div>
      ) : null}
    </div>
  );
}
