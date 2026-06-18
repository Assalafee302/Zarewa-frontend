import React from 'react';
import { ModalFrame } from '../layout/ModalFrame';
import { useTrackedUnsavedForm } from '../../hooks/useTrackedUnsavedForm';
import ProfileOnboardingForm from './ProfileOnboardingForm';

/**
 * Popup shell for the employee profile completion form — fixed header/footer with scrollable body.
 */
export function ProfileOnboardingModal({ isOpen, onClose }) {
  const { captureEdited, wrapClose } = useTrackedUnsavedForm('profile-onboarding-form', { isOpen });
  const handleClose = onClose ? wrapClose(onClose) : undefined;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={handleClose}
      title="Complete your profile"
      description="Fill in your personal details, save progress, then submit for HR review."
      surface="plain"
      edgeToEdgeMobile
    >
      <div
        className="flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-none sm:max-h-[min(92dvh,900px)] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-xl"
        onInput={captureEdited}
        onChange={captureEdited}
      >
        <header className="hidden shrink-0 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 to-white px-4 py-4 pr-14 sm:block sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#134e4a]">Employment profile</p>
          <h2 className="mt-0.5 text-lg font-black tracking-tight text-slate-900 sm:text-xl">Complete your details</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
            Save progress as you go. Job title, salary, and org structure are maintained by HR.
          </p>
        </header>

        <ProfileOnboardingForm variant="modal" onSubmitted={onClose} />
      </div>
    </ModalFrame>
  );
}
