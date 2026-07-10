import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import { useUserProfile } from '../../context/UserProfileContext';
import { HR_BTN_PRIMARY } from '../hr/hrFormStyles';
import ProfileOnboardingForm from './ProfileOnboardingForm';
import { ProfileOnboardingModal } from './ProfileOnboardingModal';
import { ProfileOnboardingStatus } from './ProfileOnboardingStatus';
import { ProfileOverviewSection } from './profileOverviewUi';

function useMissingFieldHint() {
  const { completeness, onboardingChecklist } = useUserProfile();
  return useMemo(() => {
    if (onboardingChecklist?.missing?.length) return onboardingChecklist.missing.length;
    return (completeness?.sections || []).filter((s) => s.pct < 100).length;
  }, [completeness?.sections, onboardingChecklist?.missing]);
}

/**
 * Employment page entry — summary card with button to open the profile form in a modal.
 */
export function ProfileOnboardingFormLauncher() {
  const { hr } = useUserProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const profileLocked = Boolean(hr?.profileLocked);
  const missingCount = useMissingFieldHint();

  const shouldAutoOpen = searchParams.get('form') === '1' && !profileLocked;
  const [open, setOpen] = useState(shouldAutoOpen);

  useEffect(() => {
    if (shouldAutoOpen) setOpen(true);
  }, [shouldAutoOpen]);

  const closeModal = () => {
    setOpen(false);
    if (searchParams.get('form') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('form');
      setSearchParams(next, { replace: true });
    }
  };

  if (!hr) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Your HR employment file is not open yet. Contact HR, then return here to complete your details.
      </p>
    );
  }

  if (profileLocked) {
    return (
      <ProfileOverviewSection
        title="Your submitted record"
        subtitle="Read-only view of your HR file"
      >
        <ProfileOnboardingForm />
      </ProfileOverviewSection>
    );
  }

  const hasProgress = missingCount > 0 && missingCount < 8;

  return (
    <>
      <ProfileOverviewSection
        title="Complete your profile"
        subtitle="Personal details for HR review — opens in a popup form"
      >
        <div className="space-y-4">
          <ProfileOnboardingStatus missingCount={missingCount} />

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setOpen(true)} className={`${HR_BTN_PRIMARY} inline-flex items-center gap-2`}>
              <PenLine size={16} aria-hidden />
              {hasProgress ? 'Continue profile form' : 'Open profile form'}
            </button>
          </div>
        </div>
      </ProfileOverviewSection>

      <ProfileOnboardingModal isOpen={open} onClose={closeModal} />
    </>
  );
}
