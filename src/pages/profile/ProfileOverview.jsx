import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canAccessMyProfileHr } from '../../lib/hrAccess';
import { ProfileHeroCard } from '../../components/profile/ProfileHeroCard';
import { ProfileActionGrid } from '../../components/profile/ProfileActionGrid';

export default function ProfileOverview() {
  const ws = useWorkspace();
  const showHrRequests = canAccessMyProfileHr(ws?.permissions);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    if (!showHrRequests) return;
    let cancelled = false;
    (async () => {
      setLoadingRequests(true);
      const { ok, data } = await apiFetch('/api/hr/requests?scope=mine&limit=5');
      if (!cancelled) {
        setRequests(ok && data?.ok ? data.requests || [] : []);
        setLoadingRequests(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showHrRequests]);

  const pending = requests.filter(
    (r) => !['approved', 'rejected', 'cancelled', 'draft'].includes(String(r.status || '').toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ProfileHeroCard />

      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900">Quick actions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Shortcuts based on your role and permissions</p>
          </div>
          <Link
            to="/me/actions"
            className="text-[11px] font-bold uppercase text-[#134e4a] hover:underline"
          >
            View all →
          </Link>
        </div>
        <ProfileActionGrid compact />
      </section>

      {showHrRequests ? (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-slate-900">Recent requests</h3>
            <Link to="/my-profile/leave" className="text-[11px] font-bold uppercase text-[#134e4a] hover:underline">
              New request →
            </Link>
          </div>
          {loadingRequests ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-500">No requests submitted yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{r.title || r.kind || 'Request'}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{String(r.kind || '').replace(/_/g, ' ')}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      r.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-800'
                        : r.status === 'rejected'
                          ? 'bg-red-50 text-red-800'
                          : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {String(r.status || 'pending').replace(/_/g, ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {pending.length > 0 ? (
            <p className="mt-3 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
              {pending.length} request{pending.length === 1 ? '' : 's'} awaiting review.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/me/account"
          className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 no-underline hover:border-teal-200 hover:bg-teal-50/40 transition-colors"
        >
          <p className="text-sm font-bold text-slate-900">Account details</p>
          <p className="mt-1 text-xs text-slate-600">Update how you appear in Zarewa</p>
        </Link>
        <Link
          to="/me/security"
          className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 no-underline hover:border-teal-200 hover:bg-teal-50/40 transition-colors"
        >
          <p className="text-sm font-bold text-slate-900">Password & security</p>
          <p className="mt-1 text-xs text-slate-600">Change your sign-in password</p>
        </Link>
      </section>
    </div>
  );
}
