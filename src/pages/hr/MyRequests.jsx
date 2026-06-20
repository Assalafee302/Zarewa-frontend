import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, FilePenLine, Wallet } from 'lucide-react';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { WorkPayHero } from '../../components/profile/WorkPayHero';
import { ProfilePageBody } from '../../components/profile/profilePageUi';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';

const QUICK_START = [
  { to: HR_SELF_SERVICE_PATH.timeOff + '?tab=leave', label: 'Apply for leave', icon: CalendarDays },
  { to: HR_SELF_SERVICE_PATH.loans, label: 'Apply for loan', icon: Wallet },
  { to: HR_SELF_SERVICE_PATH.employment, label: 'Update employment details', icon: FilePenLine },
];

export default function MyRequests() {
  return (
    <ProfilePageBody>
      <WorkPayHero
        eyebrow="My HR"
        title="My requests"
        description="Track leave, loan, and profile change requests. See where each one is in the approval chain."
      />

      <div className="flex flex-wrap gap-2">
        {QUICK_START.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-[#134e4a] shadow-sm hover:bg-teal-50/80"
            >
              <Icon size={14} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>

      <HrRequestsPanel
        allowedScopes={['mine']}
        defaultScope="mine"
        showStageBar
        selfService
        staffLinkBase="/my-profile"
      />
    </ProfilePageBody>
  );
}
