import React from 'react';
import { HrFormModal } from '../hr/HrFormModal';
import ProfileOnboardingForm from './ProfileOnboardingForm';

/**
 * Popup shell for the employee profile completion form.
 */
export function ProfileOnboardingModal({ isOpen, onClose }) {
  return (
    <HrFormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete your profile"
      description="Fill in your personal details, save progress, then submit for HR review. Job title, salary, and org structure are maintained by HR."
      size="xl"
      trackId="profile-onboarding-form"
    >
      <ProfileOnboardingForm variant="modal" onSubmitted={onClose} />
    </HrFormModal>
  );
}
