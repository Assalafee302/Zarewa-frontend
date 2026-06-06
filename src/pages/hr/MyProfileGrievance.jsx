import React from 'react';
import { HrGrievanceForm } from '../../components/hr/HrGrievancePanels';
import { HrPageIntro } from '../../components/hr/hrPageUi';

export default function MyProfileGrievance() {
  return (
    <div className="space-y-4">
      <HrPageIntro
        title="Raise a concern"
        description="Submit feedback or a workplace grievance. You may choose to remain anonymous — HR will review and respond through the appropriate channel."
      />
      <HrGrievanceForm />
    </div>
  );
}
