import React from 'react';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { ProfileOverviewSection } from '../../components/profile/profileOverviewUi';

export default function TeamHrRequests() {
  return (
    <HrPageBody>
      <HrPageIntro
        title="Endorsements"
        description="Endorse leave and loan requests after HQ HR review — then GM HR gives final approval."
      />
      <ProfileOverviewSection title="Endorsement queue" subtitle="Requests awaiting your branch endorsement">
        <HrRequestsPanel allowedScopes={['endorse_queue']} defaultScope="endorse_queue" staffLinkBase="/hr/staff" />
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
