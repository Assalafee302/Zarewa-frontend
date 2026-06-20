import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Wayfinding trail for nested HR pages (module → section → record).
 * @param {{ items: { label: string; to?: string }[]; className?: string }} props
 */
export function HrContextBreadcrumb({ items = [], className = '' }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={`text-xs text-slate-500 ${className}`}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 ? <span className="text-slate-300" aria-hidden>/</span> : null}
              {item.to && !isLast ? (
                <Link to={item.to} className="font-semibold text-[#134e4a] hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-semibold text-slate-800' : 'font-semibold text-slate-600'}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
