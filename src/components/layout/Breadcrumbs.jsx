import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Wayfinding trail for nested pages (module → section → record).
 * @param {{ items: { label: string; to?: string }[]; className?: string }} props
 */
export function Breadcrumbs({ items = [], className = '' }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('text-ui-xs text-slate-500', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 ? (
                <ChevronRight size={12} className="shrink-0 text-slate-300" aria-hidden />
              ) : null}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="font-semibold text-zarewa-teal transition-colors hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'font-semibold',
                    isLast ? 'text-slate-800' : 'text-slate-600'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
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
