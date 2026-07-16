import React from 'react';
import { HrPayrollPeriodFields } from './HrPayrollPeriodFields';
import { HR_FIELD_CLASS } from './hrFormStyles';

/**
 * Reusable report filter panel — only shows controls declared in the report’s filters[].
 * @param {{
 *   filters: object;
 *   onChange: (patch: object) => void;
 *   branches?: {id:string;name:string}[];
 *   departments?: string[];
 *   showBranch?: boolean;
 *   showDepartment?: boolean;
 *   showDateRange?: boolean;
 *   showPeriod?: boolean;
 *   showStatus?: boolean;
 *   showEmploymentType?: boolean;
 * }} props
 */
export function HrReportFilterPanel({
  filters,
  onChange,
  branches = [],
  departments = [],
  showBranch = true,
  showDepartment = false,
  showDateRange = false,
  showPeriod = false,
  showStatus = false,
  showEmploymentType = false,
}) {
  const set = (key, val) => onChange({ ...filters, [key]: val });
  const anyVisible =
    (showBranch && branches.length > 0) ||
    (showDepartment && departments.length > 0) ||
    showDateRange ||
    showPeriod ||
    showStatus ||
    showEmploymentType;

  if (!anyVisible) {
    return (
      <p className="text-xs text-slate-500">This report has no filters — refresh preview to load all rows.</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {showBranch && branches.length ? (
        <label className="block text-ui-xs font-black uppercase tracking-widest text-slate-500">
          Branch
          <select
            className={`${HR_FIELD_CLASS} mt-1 w-full`}
            value={filters.branchId || ''}
            onChange={(e) => set('branchId', e.target.value)}
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || b.id}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showDepartment && departments.length ? (
        <label className="block text-ui-xs font-black uppercase tracking-widest text-slate-500">
          Department
          <select
            className={`${HR_FIELD_CLASS} mt-1 w-full`}
            value={filters.department || ''}
            onChange={(e) => set('department', e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showDateRange ? (
        <>
          <label className="block text-ui-xs font-black uppercase tracking-widest text-slate-500">
            From date
            <input
              type="date"
              className={`${HR_FIELD_CLASS} mt-1 w-full`}
              value={filters.fromIso || ''}
              onChange={(e) => set('fromIso', e.target.value)}
            />
          </label>
          <label className="block text-ui-xs font-black uppercase tracking-widest text-slate-500">
            To date
            <input
              type="date"
              className={`${HR_FIELD_CLASS} mt-1 w-full`}
              value={filters.toIso || ''}
              onChange={(e) => set('toIso', e.target.value)}
            />
          </label>
        </>
      ) : null}
      {showPeriod ? (
        <div className="block text-ui-xs font-black uppercase tracking-widest text-slate-500">
          Payroll month
          <div className="mt-1">
            <HrPayrollPeriodFields
              value={filters.periodYyyymm || ''}
              onChange={(periodYyyymm) => set('periodYyyymm', periodYyyymm)}
              compact
            />
          </div>
        </div>
      ) : null}
      {showStatus ? (
        <label className="block text-ui-xs font-black uppercase tracking-widest text-slate-500">
          Status
          <input
            className={`${HR_FIELD_CLASS} mt-1 w-full`}
            value={filters.status || ''}
            onChange={(e) => set('status', e.target.value)}
            placeholder="e.g. approved"
          />
        </label>
      ) : null}
      {showEmploymentType ? (
        <label className="block text-ui-xs font-black uppercase tracking-widest text-slate-500">
          Employment type
          <input
            className={`${HR_FIELD_CLASS} mt-1 w-full`}
            value={filters.employmentType || ''}
            onChange={(e) => set('employmentType', e.target.value)}
            placeholder="contract / permanent"
          />
        </label>
      ) : null}
    </div>
  );
}
