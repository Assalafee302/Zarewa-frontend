import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, ClipboardList, FileText, Receipt, Wallet } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canAccessMyProfileHr } from '../../lib/hrAccess';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';

const QUICK_LINKS = [
  { to: HR_SELF_SERVICE_PATH.timeOff, label: 'Request leave', icon: CalendarDays },
  { to: HR_SELF_SERVICE_PATH.requests, label: 'My requests', icon: ClipboardList },
  { to: HR_SELF_SERVICE_PATH.payslips, label: 'Payslips', icon: Receipt },
  { to: HR_SELF_SERVICE_PATH.documents, label: 'Documents', icon: FileText },
  { to: HR_SELF_SERVICE_PATH.loans, label: 'Loans & credit', icon: Wallet },
];

/**
 * Workspace home shortcut strip for employee self-service HR.
 */
export default function MyHrWorkspaceCard() {
  const ws = useWorkspace();
  if (!canAccessMyProfileHr(ws?.permissions)) return null;

  return (
    <section
      className="rounded-2xl border border-teal-100/80 bg-gradient-to-br from-teal-50/90 to-white px-4 py-4 sm:px-5 sm:py-5 shadow-sm"
      aria-labelledby="my-hr-workspace-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="my-hr-workspace-heading" className="text-xs font-semibold text-[#134e4a]/70">
            My HR
          </p>
          <p className="mt-1 text-sm font-bold text-[#134e4a]">Leave, pay, and personal records</p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
            Request time off, download payslips, upload documents, and track your HR requests.
          </p>
        </div>
        <Link
          to={HR_SELF_SERVICE_PATH.overview}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#134e4a] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0f3d39]"
        >
          Open My HR
          <ChevronRight size={14} aria-hidden />
        </Link>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.to}>
              <Link
                to={link.to}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-[#134e4a] shadow-sm transition hover:border-teal-300 hover:bg-teal-50/80"
              >
                <Icon size={14} aria-hidden />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
