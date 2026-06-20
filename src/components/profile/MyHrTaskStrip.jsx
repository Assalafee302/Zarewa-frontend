import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardList, Receipt, Wallet } from 'lucide-react';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';

const TASKS = [
  { to: `${HR_SELF_SERVICE_PATH.timeOff}?tab=leave`, label: 'Request leave', icon: CalendarDays },
  { to: HR_SELF_SERVICE_PATH.payslips, label: 'Payslips', icon: Receipt },
  { to: HR_SELF_SERVICE_PATH.requests, label: 'My requests', icon: ClipboardList, badgeKey: 'requests' },
  { to: HR_SELF_SERVICE_PATH.loans, label: 'Loans & credit', icon: Wallet },
];

/**
 * Primary employee self-service shortcuts — shown on My HR overview.
 * @param {{ pendingRequests?: number; className?: string }} props
 */
export function MyHrTaskStrip({ pendingRequests = 0, className = '' }) {
  return (
    <nav aria-label="My HR quick tasks" className={className}>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TASKS.map((task) => {
          const Icon = task.icon;
          const badge = task.badgeKey === 'requests' && pendingRequests > 0 ? pendingRequests : null;
          return (
            <li key={task.to}>
              <Link
                to={task.to}
                className="relative flex min-h-[72px] flex-col justify-center rounded-xl border border-teal-100 bg-white px-3 py-3 text-left shadow-sm transition hover:border-teal-200 hover:shadow-md no-underline"
              >
                <Icon size={18} className="text-[#134e4a]" aria-hidden />
                <span className="mt-2 text-xs font-semibold text-slate-900">{task.label}</span>
                {badge ? (
                  <span className="absolute right-2 top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
