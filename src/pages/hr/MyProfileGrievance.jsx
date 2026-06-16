import React from 'react';
import { HrGrievanceForm } from '../../components/hr/HrGrievancePanels';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { ProfileOverviewSection } from '../../components/profile/profileOverviewUi';

export default function MyProfileGrievance() {
  return (
    <HrPageBody>
      <HrPageIntro
        title="Raise a concern"
        description="Submit feedback or a workplace grievance. You may choose to remain anonymous — HR will review and respond through the appropriate channel."
      />
      <ProfileOverviewSection title="Your message" subtitle="Describe the issue and how HR should follow up">
        <HrGrievanceForm />
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
