import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { SlideOverPanel } from '../layout';
import { contractBadge, docExpiryBadge, probationBadge, profilePct, profilePctBadge, resolveBranchLabel, STAFF_CHIP } from '../../lib/hrStaffDirectoryUi';
import { payrollGroupLabel } from '../../lib/hrFormat';
import { HrStaffAvatar } from './HrStaffAvatar';
import { HrStatusBadge } from './HrStatusBadge';
import { HR_BTN_SECONDARY } from './hrFormStyles';

/**
 * Mini staff preview from directory — open full profile without leaving list context.
 */
export function HrStaffQuickPreviewSlideOver({
  staff,
  staffBasePath,
  branchNames = new Map(),
  isOpen,
  onClose,
}) {
  const [row, setRow] = useState(staff);

  useEffect(() => {
    setRow(staff);
  }, [staff]);

  if (!row) return null;

  const pct = profilePct(row);
  const pctBadge = profilePctBadge(pct);
  const probation = probationBadge(row);
  const contract = contractBadge(row);
  const doc = docExpiryBadge(row);
  const profilePath = `${staffBasePath}/${encodeURIComponent(row.userId)}`;

  return (
    <SlideOverPanel isOpen={isOpen} onClose={onClose} title="Staff preview" description="Quick staff summary" maxWidthClass="max-w-md">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <p className="text-ui-xs font-medium text-slate-500">Staff preview</p>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-4">
          <div className="flex items-center gap-3">
            <HrStaffAvatar staff={row} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-900">{row.displayName || row.userId}</h2>
              {row.employeeNo ? <p className="z-stencil text-xs text-slate-700">{row.employeeNo}</p> : null}
              <p className="text-xs text-slate-600">{row.jobTitle || '—'}</p>
              <HrStatusBadge status={row.status} variant="staff" className="mt-1" />
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {probation ? (
              <span className={`${STAFF_CHIP} ${probation.cls}`}>{probation.label}</span>
            ) : null}
            {contract ? (
              <span className={`${STAFF_CHIP} ${contract.cls}`}>{contract.label}</span>
            ) : null}
            {doc ? (
              <span className={`${STAFF_CHIP} ${doc.cls}`}>{doc.label}</span>
            ) : null}
            {pct < 90 ? (
              <span className={`${STAFF_CHIP} ${pctBadge.cls}`}>
                Profile {pctBadge.label}
              </span>
            ) : null}
          </div>

          <dl className="grid gap-2 text-xs text-slate-700">
            {[
              ['Employee no.', row.employeeNo],
              ['Branch', resolveBranchLabel(row, branchNames)],
              ['Department', row.department],
              ['Payroll group', payrollGroupLabel(row)],
              ['Joined', row.dateJoinedIso?.slice(0, 10)],
              ['Line manager', row.lineManagerDisplayName || row.lineManagerUserId],
              ['Profile complete', `${pct}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-slate-100 py-1">
                <dt className="font-medium text-slate-500">{label}</dt>
                <dd className={`text-right font-medium ${label === 'Employee no.' ? 'z-stencil text-slate-800' : ''}`}>{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="border-t border-slate-200 px-4 py-3 sm:px-5 flex flex-wrap gap-2">
          <Link to={profilePath} className={`${HR_BTN_SECONDARY} no-underline`} onClick={onClose}>
            Open full profile
          </Link>
        </div>
      </div>
    </SlideOverPanel>
  );
}
