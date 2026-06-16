import React from 'react';
import { Link } from 'react-router-dom';
import { HrAbsenceReportsPanel } from '../../components/hr/HrAbsenceReportsPanel';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { ProfileInlineAlert, ProfileOverviewSection } from '../../components/profile/profileOverviewUi';

export default function TeamHrAttendance() {
  return (
    <HrPageBody>
      <HrPageIntro
        title="Absence reports"
        description="Review absence reports for your branch. Salary figures are not shown on this screen."
      />

      <ProfileInlineAlert variant="info">
        Mark daily present, late, or absent from{' '}
        <Link to="/manager?inbox=attendance" className="font-bold text-[#134e4a] hover:underline">
          Management → Staff attendance
        </Link>
        .
      </ProfileInlineAlert>

      <ProfileOverviewSection title="Absence reports" subtitle="Branch-scoped absence submissions">
        <HrAbsenceReportsPanel branchScoped canReview={false} />
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
