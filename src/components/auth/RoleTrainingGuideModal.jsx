import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, CheckCircle2, ExternalLink } from 'lucide-react';
import { trainingGuideForRole } from '../../lib/roleTrainingGuide';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { ZAREWA_LOGO_SRC } from '../../Data/companyQuotation';

/**
 * Role-based onboarding wizard after first password change.
 * @param {{ onFinished?: () => void }} props
 */
export default function RoleTrainingGuideModal({ onFinished }) {
  const navigate = useNavigate();
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const user = ws?.session?.user;
  const guide = useMemo(() => trainingGuideForRole(user?.roleKey), [user?.roleKey]);
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const steps = guide.steps;
  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;

  const finish = async () => {
    setBusy(true);
    try {
      const r = await ws?.completeTraining?.();
      if (!r?.ok) {
        showToast(r?.error || 'Could not save training completion.', { variant: 'error' });
        return;
      }
      onFinished?.();
      showToast('Welcome to Zarewa. You can reopen this guide anytime from Help.');
    } finally {
      setBusy(false);
    }
  };

  const goQuickLink = (path) => {
    void finish().then(() => {
      if (path) navigate(path);
    });
  };

  return (
    <div className="min-h-screen z-app-bg flex items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-2xl rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-training-title"
      >
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <div className="flex items-start gap-4">
            <img src={ZAREWA_LOGO_SRC} alt="" className="h-9 w-auto shrink-0" width={90} height={36} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700/80 flex items-center gap-1.5">
                <BookOpen size={14} aria-hidden />
                Role training · {user?.roleLabel || user?.roleKey}
              </p>
              <h1 id="role-training-title" className="mt-1 text-xl font-black text-[#134e4a] sm:text-2xl">
                {guide.title}
              </h1>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{guide.subtitle}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-[#134e4a]' : 'bg-slate-200'}`}
                aria-hidden
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-7">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <h2 className="mt-2 text-lg font-black text-slate-900">{step.heading}</h2>
          <p className="mt-3 text-sm text-slate-700 leading-relaxed">{step.body}</p>
          {Array.isArray(step.tips) && step.tips.length ? (
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {step.tips.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-teal-600 font-bold">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {isLast && guide.quickLinks?.length ? (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Shortcuts for your role</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {guide.quickLinks.map((link) => (
                  <button
                    key={link.path}
                    type="button"
                    disabled={busy}
                    onClick={() => goQuickLink(link.path)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#134e4a] hover:bg-teal-50 disabled:opacity-60"
                  >
                    {link.label}
                    <ExternalLink size={12} aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <button
            type="button"
            disabled={busy || stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft size={16} aria-hidden />
            Back
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!isLast ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#134e4a] px-5 py-2.5 text-xs font-black text-white"
              >
                Next
                <ChevronRight size={16} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void finish()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#134e4a] px-5 py-2.5 text-xs font-black text-white"
              >
                <CheckCircle2 size={16} aria-hidden />
                {busy ? 'Saving…' : 'Finish and open workspace'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
