import React from 'react';
import { HrGrievanceForm } from '../../components/hr/HrGrievancePanels';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
import { ProfileOverviewSection } from '../../components/profile/profileOverviewUi';

export default function MyProfileGrievance() {
  return (
    <ProfilePageBody>
      <ProfilePageIntro
        title="Raise a concern"
        description="Submit feedback or a workplace grievance. You may choose to remain anonymous — HR will review and respond through the appropriate channel."
      />
      <ProfileOverviewSection title="Your message" subtitle="Describe the issue and how HR should follow up">
        <HrGrievanceForm />
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
