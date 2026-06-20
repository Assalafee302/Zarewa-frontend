import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageTabs } from '../../components/layout/PageTabs';
import { WorkPayHero } from '../../components/profile/WorkPayHero';
import { ProfilePageBody } from '../../components/profile/profilePageUi';
import { ProfileProbationBanner } from '../../components/profile/ProfileProbationBanner';
import MyLeave from './MyLeave';
import MyAttendance from './MyAttendance';

const TABS = [
  { id: 'leave', label: 'Leave' },
  { id: 'attendance', label: 'Attendance' },
];

export default function MyTimeOff() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab') || 'leave';
  const tab = TABS.some((t) => t.id === raw) ? raw : 'leave';

  return (
    <ProfilePageBody>
      <WorkPayHero
        variant="context"
        description="Apply for leave, check balances, see attendance marks, and request exceptions — one place for when you are in or out."
      />
      <ProfileProbationBanner />
      <PageTabs
        tabs={TABS}
        value={tab}
        onChange={(next) => {
          setSearchParams((prev) => {
            const nextParams = new URLSearchParams(prev);
            nextParams.set('tab', next);
            return nextParams;
          });
        }}
      />
      {tab === 'leave' ? <MyLeave staffLinkBase="/my-profile" embedded /> : null}
      {tab === 'attendance' ? <MyAttendance embedded /> : null}
    </ProfilePageBody>
  );
}
