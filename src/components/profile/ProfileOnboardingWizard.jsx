import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { useUserProfile } from '../../context/UserProfileContext';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { dismissOnboardingWizard, isOnboardingWizardDismissed } from '../../lib/profileOnboardingDismiss';
import { ProfileBanner } from './profilePageUi';

/**
 * Week-1 onboarding checklist from GET /api/hr/me → onboardingChecklist.
 */
export function ProfileOnboardingWizard({ className = '', column = false, onDismissed }) {
  const {
    onboardingChecklist,
    profileLocked,
    profileVerifiedAtIso,
    cohort,
    hasHrSelfService,
    user,
  } = useUserProfile();
  const [dismissed, setDismissed] = useState(() => isOnboardingWizardDismissed(user?.id));

  const steps = useMemo(() => {
    if (!onboardingChecklist || onboardingChecklist.complete) return [];

    const missing = onboardingChecklist.missing || [];
    const labels = onboardingChecklist.missingLabels || [];

    return missing.map((key, i) => {
      const label = labels[i] || key;
      let to = `${HR_SELF_SERVICE_PATH.employment}?form=1`;
      if (key === 'passportPhoto' || String(key).startsWith('doc:')) {
        to = HR_SELF_SERVICE_PATH.documents;
      }
      return { key, label, to };
    });
  }, [onboardingChecklist]);

  if (!hasHrSelfService || cohort === 'scholarship' || cohort === 'domestic') return null;
  if (!onboardingChecklist || onboardingChecklist.complete) return null;
  if (dismissed) return null;

  const total = steps.length;
  const doneHint = profileVerifiedAtIso
    ? 'HR has verified your file — finish any remaining items below.'
    : profileLocked
      ? 'Your profile is submitted. Complete uploads and identity fields HR still needs.'
      : 'Complete these steps so HR can verify your employment file.';

  const handleDismiss = () => {
    dismissOnboardingWizard(user?.id, 3);
    setDismissed(true);
    onDismissed?.();
  };

  if (column) {
    return (
      <div
        className={`flex h-full min-h-[12rem] flex-col overflow-hidden rounded-xl border border-teal-200 bg-teal-50 shadow-sm ${className}`}
      >
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-teal-100 px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-teal-950">
              Onboarding — {total} item{total === 1 ? '' : 's'} remaining
            </h3>
            <p className="mt-0.5 text-xs text-teal-800/90">{doneHint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleDismiss} className="z-btn-secondary !px-3 !py-1.5 !text-ui-xs">
              Remind me later
            </button>
            <Link
              to={`${HR_SELF_SERVICE_PATH.employment}?form=1`}
              className="z-btn-primary !px-3 !py-1.5 !text-ui-xs text-center"
            >
              Continue
            </Link>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <ol className="space-y-2">
            {steps.slice(0, 8).map((step) => (
              <li key={step.key}>
                <Link
                  to={step.to}
                  className="flex items-center gap-2 rounded-lg border border-teal-200/80 bg-white px-3 py-2 text-xs font-medium text-teal-950 no-underline transition hover:bg-teal-50/50"
                >
                  <Circle size={14} className="shrink-0 text-teal-600" aria-hidden />
                  <span className="min-w-0 flex-1">{step.label}</span>
                </Link>
              </li>
            ))}
          </ol>
          {steps.length > 8 ? (
            <p className="mt-2 text-ui-xs font-semibold text-teal-800/80">
              +{steps.length - 8} more in Employment & Documents
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ProfileBanner
      tone="teal"
      title={`Onboarding — ${total} item${total === 1 ? '' : 's'} remaining`}
      action={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="z-btn-secondary !px-4 !py-2 !text-ui-xs uppercase tracking-wide"
          >
            Remind me later
          </button>
          <Link
            to={`${HR_SELF_SERVICE_PATH.employment}?form=1`}
            className="z-btn-primary !px-4 !py-2 !text-ui-xs uppercase tracking-wide text-center"
          >
            Continue setup
          </Link>
        </div>
      }
      className={className}
    >
      <p className="mb-3">{doneHint}</p>
      <ol className="space-y-2">
        {steps.slice(0, 8).map((step) => (
          <li key={step.key}>
            <Link
              to={step.to}
              className="flex items-center gap-2 rounded-lg border border-teal-200/60 bg-white/60 px-3 py-2 text-xs font-medium text-teal-950 no-underline transition hover:bg-white"
            >
              <Circle size={14} className="shrink-0 text-teal-600" aria-hidden />
              <span className="min-w-0 flex-1">{step.label}</span>
            </Link>
          </li>
        ))}
      </ol>
      {steps.length > 8 ? (
        <p className="mt-2 text-ui-xs font-semibold uppercase tracking-wide opacity-80">
          +{steps.length - 8} more in Employment & Documents
        </p>
      ) : null}
    </ProfileBanner>
  );
}

/** Shown when onboarding checklist is complete. */
export function ProfileOnboardingCompleteChip({ onDark = false }) {
  const { onboardingChecklist, hasHrSelfService, cohort } = useUserProfile();
  if (!hasHrSelfService || cohort === 'scholarship' || cohort === 'domestic') return null;
  if (!onboardingChecklist?.complete) return null;

  if (onDark) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-ui-xs font-bold uppercase tracking-wide text-white ring-1 ring-white/30">
        <CheckCircle2 size={12} aria-hidden />
        Onboarding complete
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-ui-xs font-bold uppercase tracking-wide text-emerald-800">
      <CheckCircle2 size={12} aria-hidden />
      Onboarding complete
    </div>
  );
}
