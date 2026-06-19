import React from 'react';
import { Link } from 'react-router-dom';

const STYLES = {
  primary: 'bg-[#134e4a] text-white hover:bg-teal-900 shadow-sm',
  secondary: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
  danger: 'border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100',
  link: 'text-teal-800 hover:underline bg-transparent px-0 py-0',
};

/**
 * @param {{
 *   children: React.ReactNode;
 *   variant?: 'primary' | 'secondary' | 'danger' | 'link';
 *   to?: string;
 *   onClick?: () => void;
 *   disabled?: boolean;
 *   type?: 'button' | 'submit';
 * }} props
 */
export function FinanceActionButton({
  children,
  variant = 'secondary',
  to,
  onClick,
  disabled,
  type = 'button',
}) {
  const cls = `inline-flex items-center justify-center rounded-lg px-3 py-2.5 sm:py-1.5 min-h-11 sm:min-h-0 text-xs font-bold transition-colors disabled:opacity-50 ${STYLES[variant] || STYLES.secondary}`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
