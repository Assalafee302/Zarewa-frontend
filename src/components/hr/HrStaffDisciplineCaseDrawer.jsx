import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { SlideOverPanel } from '../layout';
import { HR_DISCIPLINE_EXIT } from '../../lib/hrRoutes';
import { statusMeta } from '../../lib/hrDisciplineCases';

const TONE_CLASS = {
  slate: 'bg-slate-100 text-slate-700',
  amber: 'bg-amber-100 text-amber-900',
  teal: 'bg-teal-100 text-teal-800',
  red: 'bg-red-100 text-red-800',
  emerald: 'bg-emerald-100 text-emerald-800',
};

/**
 * Inline discipline case preview on employee profile.
 */
export function HrStaffDisciplineCaseDrawer({ caseItem, isOpen, onClose }) {
  if (!caseItem) return null;
  const meta = statusMeta(caseItem.status);

  return (
    <SlideOverPanel isOpen={isOpen} onClose={onClose} title={caseItem.caseNumber || caseItem.id || 'Discipline case'}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-ui-xs font-bold uppercase ${TONE_CLASS[meta.tone] || TONE_CLASS.slate}`}>
            {meta.label || caseItem.status}
          </span>
          <span className="text-xs text-slate-500">{caseItem.caseType?.replace(/_/g, ' ') || 'Case'}</span>
        </div>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Opened</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{caseItem.openedAtIso?.slice(0, 10) || '—'}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Severity</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{caseItem.severity || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-bold uppercase tracking-wide text-slate-400">Summary</dt>
            <dd className="mt-0.5 text-slate-700">{caseItem.summary || caseItem.title || 'No summary recorded.'}</dd>
          </div>
        </dl>
        <Link
          to={`${HR_DISCIPLINE_EXIT}?tab=accountability&caseId=${encodeURIComponent(caseItem.id)}`}
          className="inline-flex rounded-xl border border-zarewa-teal/30 bg-zarewa-teal/5 px-3 py-2 text-xs font-bold uppercase text-zarewa-teal no-underline hover:bg-zarewa-teal/10"
        >
          Open full case workflow →
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold uppercase text-slate-600"
        >
          <X size={14} aria-hidden />
          Close
        </button>
      </div>
    </SlideOverPanel>
  );
}
