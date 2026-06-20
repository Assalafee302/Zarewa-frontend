import React, { useEffect, useMemo } from 'react';
import {
  PAYROLL_MONTH_NAMES,
  parsePayrollPeriod,
  payrollYearOptions,
  periodYyyymmFromParts,
} from '../../lib/hrPayroll';
import { HR_FIELD_CLASS } from './hrFormStyles';

/**
 * Month name + year picker — stores period as YYYYMM via onChange.
 * @param {{
 *   value: string;
 *   onChange: (periodYyyymm: string) => void;
 *   disabledPeriods?: Set<string> | string[];
 *   className?: string;
 *   labelMonth?: string;
 *   labelYear?: string;
 *   years?: number[];
 *   compact?: boolean;
 * }} props
 */
export function HrPayrollPeriodFields({
  value,
  onChange,
  disabledPeriods,
  className = '',
  labelMonth = 'Month',
  labelYear = 'Year',
  years,
  compact = false,
}) {
  const parsed = parsePayrollPeriod(value);
  const year = parsed?.year || new Date().getFullYear();
  const month = parsed?.month || new Date().getMonth() + 1;

  const disabledSet = useMemo(() => {
    if (!disabledPeriods) return new Set();
    if (disabledPeriods instanceof Set) return disabledPeriods;
    return new Set(disabledPeriods);
  }, [disabledPeriods]);

  const yearOptions = years || payrollYearOptions();

  useEffect(() => {
    if (!parsed && value) return;
    if (!parsed && !value) {
      onChange(periodYyyymmFromParts(year, month));
    }
  }, [parsed, value, year, month, onChange]);

  const gridCls = compact ? 'flex flex-wrap items-end gap-3' : 'grid gap-3 sm:grid-cols-2';

  const setMonth = (m) => onChange(periodYyyymmFromParts(year, m));
  const setYear = (y) => onChange(periodYyyymmFromParts(y, month));

  return (
    <div className={`${gridCls} ${className}`.trim()}>
      <label className="text-xs font-semibold text-slate-600">
        {labelMonth}
        <select className={HR_FIELD_CLASS} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {PAYROLL_MONTH_NAMES.map((name, i) => {
            const m = i + 1;
            const yyyymm = periodYyyymmFromParts(year, m);
            const taken = yyyymm && disabledSet.has(yyyymm);
            return (
              <option key={name} value={m} disabled={taken}>
                {name}
                {taken ? ' (in use)' : ''}
              </option>
            );
          })}
        </select>
      </label>
      <label className="text-xs font-semibold text-slate-600">
        {labelYear}
        <select className={HR_FIELD_CLASS} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
