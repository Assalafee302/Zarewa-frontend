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
  disabled = false,
  required = false,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      {label ? (
        <label className="z-field-label" htmlFor={id}>
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
          className={`${className} pr-11`}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
