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
export function ProfileOnboardingWizard({ className = '' }) {
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
      let to = HR_SELF_SERVICE_PATH.employment;
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
  };

  return (
    <ProfileBanner
      tone="teal"
      title={`Onboarding — ${total} item${total === 1 ? '' : 's'} remaining`}
      action={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="z-btn-secondary !px-4 !py-2 !text-[10px] uppercase tracking-wide"
          >
            Remind me later
          </button>
          <Link
            to={HR_SELF_SERVICE_PATH.employment}
            className="z-btn-primary !px-4 !py-2 !text-[10px] uppercase tracking-wide text-center"
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
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide opacity-80">
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
      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/30">
        <CheckCircle2 size={12} aria-hidden />
        Onboarding complete
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
      <CheckCircle2 size={12} aria-hidden />
      Onboarding complete
    </div>
  );
}
