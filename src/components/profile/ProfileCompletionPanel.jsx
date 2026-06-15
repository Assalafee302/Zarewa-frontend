import React from 'react';
import { Link } from 'react-router-dom';
import { HrProfileCompleteness } from '../hr/HrProfileCompleteness';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';

const VERIFY_LABEL = {
  verified: { text: 'HR approved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  pending: { text: 'Awaiting HR review', cls: 'bg-amber-50 text-amber-900 border-amber-200' },
  rejected: { text: 'Rejected — re-upload', cls: 'bg-red-50 text-red-800 border-red-200' },
};

/**
 * @param {{
 *   completeness?: object;
 *   documentSummary?: object;
 *   pendingProfileRequests?: object[];
 *   onFixSection?: (tabId: string) => void;
 *   variant?: 'employee' | 'scholarship';
 * }} props
 */
export function ProfileCompletionPanel({
  completeness,
  documentSummary,
  pendingProfileRequests = [],
  onFixSection,
  variant = 'employee',
}) {
  if (variant === 'scholarship') {
    const docs = documentSummary || {};
    return (
      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
        <p className="text-sm font-black text-slate-900">Scholarship profile</p>
        <p className="mt-1 text-xs text-slate-600">Complete your school details, documents, and policies in HR self-service.</p>
        <ul className="mt-3 space-y-2">
          <li>
            <Link
              to={HR_SELF_SERVICE_PATH.school}
              className="flex min-h-11 items-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-900 no-underline active:bg-violet-50"
            >
              My school profile →
            </Link>
          </li>
          {(docs.pending || 0) > 0 || (docs.rejected || 0) > 0 ? (
            <li>
              <Link
                to={HR_SELF_SERVICE_PATH.documents}
                className="flex min-h-11 items-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-900 no-underline active:bg-violet-50"
              >
                Documents ({docs.pending || 0} pending, {docs.rejected || 0} rejected) →
              </Link>
            </li>
          ) : null}
          <li>
            <Link
              to={HR_SELF_SERVICE_PATH.policies}
              className="flex min-h-11 items-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-900 no-underline active:bg-violet-50"
            >
              Sign policies →
            </Link>
          </li>
        </ul>
      </div>
    );
  }

  if (!completeness?.sections?.length) return null;

  const docs = documentSummary || {};
  const nextSteps = [];

  if ((docs.pending || 0) > 0) {
    nextSteps.push({
      label: `${docs.pending} document(s) awaiting HR verification`,
      to: HR_SELF_SERVICE_PATH.documents,
    });
  }
  if ((docs.rejected || 0) > 0) {
    nextSteps.push({
      label: `${docs.rejected} document(s) rejected — upload again`,
      to: HR_SELF_SERVICE_PATH.documents,
    });
  }
  const policiesSection = completeness.sections.find((s) => s.id === 'policies');
  if (policiesSection && policiesSection.pct < 100) {
    nextSteps.push({ label: 'Sign company policies', to: HR_SELF_SERVICE_PATH.policies });
  }
  const documentsSection = completeness.sections.find((s) => s.id === 'documents');
  if (documentsSection && documentsSection.pct < 100) {
    nextSteps.push({ label: 'Upload missing onboarding documents', to: HR_SELF_SERVICE_PATH.documents });
  }

  return (
    <div className="space-y-4">
      <HrProfileCompleteness completeness={completeness} compact onFixSection={onFixSection} />

      {(docs.total || 0) > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Document HR status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {['verified', 'pending', 'rejected'].map((key) => {
              const count = docs[key] || 0;
              if (!count) return null;
              const meta = VERIFY_LABEL[key];
              return (
                <span key={key} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.cls}`}>
                  {count} {meta.text.toLowerCase()}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {nextSteps.length ? (
        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-teal-800/80">Complete your profile</p>
          <ol className="mt-2 space-y-2">
            {nextSteps.map((step) => (
              <li key={step.label}>
                <Link to={step.to} className="text-sm font-semibold text-[#134e4a] hover:underline">
                  → {step.label}
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate-600">
            Employment records (job title, salary, bank) are maintained by HR. Upload documents in HR self-service; HR
            verifies and updates official records.
          </p>
        </div>
      ) : null}

      {pendingProfileRequests.length ? (
        <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-bold">Pending profile change requests</p>
          <ul className="mt-1 space-y-1 text-xs">
            {pendingProfileRequests.map((r) => (
              <li key={r.id}>
                {r.title || 'Profile change'} — <span className="capitalize">{String(r.status || '').replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
