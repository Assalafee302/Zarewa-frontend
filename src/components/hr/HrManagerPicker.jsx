import React from 'react';
import { HR_FIELD_CLASS } from './hrFormStyles';

/**
 * Staff dropdown for line manager (excludes the subject being edited).
 *
 * @param {{
 *   staff: Array<{ userId: string; displayName?: string; username?: string; employeeNo?: string }>;
 *   value: string;
 *   onChange: (userId: string) => void;
 *   excludeUserId?: string;
 *   className?: string;
 *   required?: boolean;
 * }} props
 */
export function HrManagerPicker({ staff, value, onChange, excludeUserId, className, required }) {
  const options = staff.filter((s) => s.userId && s.userId !== excludeUserId);
  return (
    <select
      className={className || HR_FIELD_CLASS}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">No line manager</option>
      {options.map((s) => (
        <option key={s.userId} value={s.userId}>
          {s.displayName || s.username || s.userId}
          {s.employeeNo ? ` · ${s.employeeNo}` : ''}
        </option>
      ))}
    </select>
  );
}
