import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ExternalLink } from 'lucide-react';

/**
 * @param {{
 *   to?: string;
 *   state?: object;
 *   link?: { to: string; state?: object } | null;
 *   children?: React.ReactNode;
 *   fallback?: React.ReactNode;
 *   className?: string;
 *   showIcon?: boolean;
 *   onClick?: (e: React.MouseEvent) => void;
 * }} props
 */
export function AccountingRegisterNavLink({
  to,
  state,
  link,
  children,
  fallback,
  className = '',
  showIcon = true,
  onClick,
}) {
  const resolved = link?.to ? link : to ? { to, state } : null;
  const label = children ?? fallback;

  if (!resolved?.to) {
    return <span className={className}>{label}</span>;
  }

  const hasLabel = label != null && label !== '';

  return (
    <Link
      to={resolved.to}
      state={resolved.state}
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-bold text-[#134e4a] hover:underline ${className}`}
    >
      {hasLabel ? label : null}
      {showIcon && hasLabel ? <ExternalLink size={11} className="shrink-0 opacity-60" aria-hidden /> : null}
    </Link>
  );
}

/**
 * @param {{ link: { to: string; state?: object } | null; fallback: React.ReactNode; className?: string }} props
 */
export function AccountingRegisterLinkedCell({ link, fallback, className = '' }) {
  if (!link?.to) return <span className={className}>{fallback}</span>;
  return (
    <AccountingRegisterNavLink link={link} fallback={fallback} className={className} />
  );
}
