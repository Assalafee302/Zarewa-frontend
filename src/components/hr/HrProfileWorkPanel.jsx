import React from 'react';
import { Link } from 'react-router-dom';
import { HR_EMPLOYEES, HR_REQUESTS } from '../../lib/hrRoutes';
import { hrStaffDocKindLabel } from '../../lib/hrStaffDocumentKinds';

/**
 * @param {{ queue?: { counts?: object; pendingDocuments?: object[]; profileChangeRequests?: object[]; incompleteProfiles?: object[] } }} props
 */
export function HrProfileWorkPanel({ queue }) {
  if (!queue) return null;
  const counts = queue.counts || {};
  const total =
    (counts.pendingDocumentVerifications || 0) +
    (counts.pendingProfileChanges || 0) +
    (counts.incompleteProfiles || 0);
  if (!total) return null;

  return (
    <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-violet-800">Profile work queue</h2>
          <p className="mt-1 text-xs text-slate-600">Documents to verify, profile changes, and incomplete employee files</p>
        </div>
        <Link to={HR_REQUESTS} className="text-[11px] font-bold uppercase text-[#134e4a] hover:underline">
          All requests →
        </Link>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white bg-white/80 p-3">
          <p className="text-xl font-black tabular-nums text-amber-800">{counts.pendingDocumentVerifications || 0}</p>
          <p className="text-[10px] font-bold uppercase text-slate-500">Docs to verify</p>
        </div>
        <div className="rounded-xl border border-white bg-white/80 p-3">
          <p className="text-xl font-black tabular-nums text-violet-800">{counts.pendingProfileChanges || 0}</p>
          <p className="text-[10px] font-bold uppercase text-slate-500">Profile changes</p>
        </div>
        <div className="rounded-xl border border-white bg-white/80 p-3">
          <p className="text-xl font-black tabular-nums text-red-800">{counts.incompleteProfiles || 0}</p>
          <p className="text-[10px] font-bold uppercase text-slate-500">Incomplete (&lt;60%)</p>
        </div>
      </div>

      {(queue.pendingDocuments || []).length ? (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pending documents</p>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
            {(queue.pendingDocuments || []).slice(0, 8).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">
                  <strong>{d.displayName}</strong> — {hrStaffDocKindLabel(d.docKind)}
                </span>
                <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(d.userId)}?tab=documents`} className="shrink-0 font-bold text-[#134e4a] hover:underline">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(queue.profileChangeRequests || []).length ? (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Profile change requests</p>
          <ul className="space-y-1.5">
            {(queue.profileChangeRequests || []).slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">
                  <strong>{r.displayName}</strong> — {r.title}
                </span>
                <Link to={HR_REQUESTS} className="shrink-0 font-bold text-[#134e4a] hover:underline">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(queue.incompleteProfiles || []).length ? (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Incomplete profiles</p>
          <ul className="space-y-1.5">
            {(queue.incompleteProfiles || []).slice(0, 6).map((s) => (
              <li key={s.userId} className="flex items-center justify-between gap-2 text-xs">
                <span>
                  <strong>{s.displayName}</strong> — {s.overallPct}%
                </span>
                <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(s.userId)}`} className="font-bold text-[#134e4a] hover:underline">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
