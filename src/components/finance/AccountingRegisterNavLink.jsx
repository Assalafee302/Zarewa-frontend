import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

/**
 * @param {{ to: string; state?: object; children: React.ReactNode; className?: string; showIcon?: boolean }} props
 */
export function AccountingRegisterNavLink({ to, state, children, className = '', showIcon = true }) {
  const hasLabel = children != null && children !== '';
  return (
    <Link
      to={to}
      state={state}
      className={`inline-flex items-center gap-1 font-bold text-[#134e4a] hover:underline ${className}`}
    >
      {hasLabel ? children : null}
      {showIcon && hasLabel ? <ExternalLink size={11} className="shrink-0 opacity-60" aria-hidden /> : null}
    </Link>
  );
}

/**
 * @param {{ link: { to: string; state?: object } | null; fallback: React.ReactNode }} props
 */
export function AccountingRegisterLinkedCell({ link, fallback }) {
  if (!link?.to) return <>{fallback}</>;
  return (
    <AccountingRegisterNavLink to={link.to} state={link.state}>
      {fallback}
    </AccountingRegisterNavLink>
  );
}
