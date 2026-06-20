import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { SlideOverPanel } from '../layout';
import { hrRequestKindLabel, hrRequestStatusLabel } from '../../lib/hrFormat';
import { HrRequestPayloadSummary } from './HrRequestPayloadSummary';
import HrRequestStageBar from './HrRequestStageBar';
import { HrStatusBadge } from './HrStatusBadge';

/**
 * Read-only request detail for employee self-service (no approve/reject actions).
 */
export function MyRequestDetailSlideOver({ request, isOpen, onClose }) {
  if (!request) return null;

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={onClose}
      title="My request"
      description="Track status and approval progress"
      maxWidthClass="max-w-lg"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="z-meta-text font-semibold text-slate-500">{hrRequestKindLabel(request.kind)}</p>
            <h2 className="truncate text-base font-bold text-[#134e4a]">{request.title || 'Request'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <HrStatusBadge variant="request" status={request.status} label={hrRequestStatusLabel(request.status)} />
          </div>

          <HrRequestStageBar status={request.status} kind={request.kind} />

          <dl className="grid gap-2 text-xs text-slate-700">
            <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
              <dt className="font-semibold text-slate-500">Submitted</dt>
              <dd className="font-mono">{request.submittedAtIso?.slice(0, 10) || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
              <dt className="font-semibold text-slate-500">Last updated</dt>
              <dd className="font-mono">{request.updatedAtIso?.slice(0, 16)?.replace('T', ' ') || '—'}</dd>
            </div>
          </dl>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="z-meta-text mb-2 font-semibold text-slate-500">Request details</p>
            <HrRequestPayloadSummary request={request} />
          </div>

          {request.reviewNotes?.length ? (
            <div className="rounded-xl border border-slate-100 bg-white p-3">
              <p className="z-meta-text mb-2 font-semibold text-slate-500">Review history</p>
              <ul className="space-y-2 text-xs text-slate-700">
                {request.reviewNotes.map((n, i) => (
                  <li key={i} className="border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <span className="font-mono text-slate-500">{n.atIso?.slice(0, 16)?.replace('T', ' ') || '—'}</span>
                    <p className="mt-0.5">{n.note || n.action || 'Review recorded'}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {request.status === 'draft' ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              This request is still a draft. Open it below and tap <strong>Submit</strong> to send for approval.
            </p>
          ) : null}
        </div>

        <div className="border-t border-slate-200 px-4 py-3 sm:px-5">
          <Link
            to="/my-profile/requests"
            className="text-xs font-semibold text-[#134e4a] hover:underline"
            onClick={onClose}
          >
            Back to all requests
          </Link>
        </div>
      </div>
    </SlideOverPanel>
  );
}
