import React, { useEffect, useState } from 'react';
import { fetchStaffActivitySummary } from '../../lib/hrStaffExtras';

function fmt(iso) {
  if (!iso) return '—';
  return iso.slice(0, 16).replace('T', ' ');
}

function actionLabel(action) {
  return String(action || 'update').replace(/^hr\./, '').replace(/\./g, ' · ');
}

export function HrStaffActivityStrip({ userId, onOpenTab }) {
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await fetchStaffActivitySummary(userId);
      if (cancelled) return;
      setActivity(ok && data?.ok ? data.activity : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!activity) return null;

  const items = [
    activity.lastProfileUpdate
      ? { label: 'Profile updated', value: fmt(activity.lastProfileUpdate), tab: 'employment' }
      : null,
    activity.profileVerifiedAt
      ? { label: 'Profile verified', value: fmt(activity.profileVerifiedAt), tab: 'documents' }
      : null,
    activity.lastAudit
      ? {
          label: 'Last HR action',
          value: `${actionLabel(activity.lastAudit.action)} · ${fmt(activity.lastAudit.atIso)}`,
          tab: 'audit',
        }
      : null,
    activity.lastIdCard
      ? {
          label: 'ID card',
          value: `${activity.lastIdCard.status} · ${fmt(activity.lastIdCard.updatedAtIso)}`,
          tab: null,
        }
      : null,
    activity.lastLeave
      ? {
          label: 'Leave request',
          value: `${activity.lastLeave.kind} · ${activity.lastLeave.status} · ${fmt(activity.lastLeave.updatedAtIso)}`,
          tab: 'leave',
        }
      : null,
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => item.tab && onOpenTab?.(item.tab)}
          className={`rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-left text-xs ${
            item.tab ? 'hover:border-[#134e4a]/30 hover:bg-teal-50/50' : ''
          }`}
        >
          <p className="font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
          <p className="mt-0.5 font-medium text-slate-700">{item.value}</p>
        </button>
      ))}
    </div>
  );
}
