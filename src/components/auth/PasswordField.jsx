import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password input with visibility toggle (Phase 12).
 */
export default function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = '',
  className = 'z-input',
  labelClassName = 'z-field-label',
  toggleClassName = 'absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 disabled:cursor-not-allowed disabled:opacity-50',
  disabled = false,
  required = false,
  describedBy,
  invalid = false,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      {label ? (
        <label className={labelClassName} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className={`${className} pr-12`}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          className={toggleClassName}
        >
          {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
