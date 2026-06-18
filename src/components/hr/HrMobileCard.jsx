import React from 'react';
import { Link } from 'react-router-dom';

/**
 * @param {{ title: React.ReactNode; titleLink?: string; badge?: React.ReactNode; fields?: { label: string; value: React.ReactNode; colSpan?: number }[]; footer?: React.ReactNode; children?: React.ReactNode; onClick?: () => void; className?: string }} props
 */
export function HrMobileCard({ title, titleLink, badge, fields = [], footer, children, onClick, className = '' }) {
  const Tag = onClick ? 'button' : 'article';
  const titleEl = titleLink ? (
    <Link to={titleLink} className="text-sm font-bold text-[#134e4a] hover:underline" onClick={(e) => e.stopPropagation()}>
      {title}
    </Link>
  ) : (
    <span className="text-sm font-bold leading-snug text-slate-900">{title}</span>
  );

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm ${onClick ? 'cursor-pointer hover:border-teal-200' : ''} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">{titleEl}</div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      {fields.length ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          {fields.map((f) => (
            <div key={f.label} className={f.colSpan ? `col-span-${f.colSpan}` : ''}>
              <dt className="font-bold uppercase tracking-wide text-slate-400">{f.label}</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </Tag>
  );
}

export function HrMobileCardList({ loading, loadingMessage = 'Loading…', emptyMessage = 'No records.', children }) {
  if (loading) {
    return (
      <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        {loadingMessage}
      </p>
    );
  }
  if (!children || (Array.isArray(children) && children.length === 0)) {
    return (
      <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }
  return <div className="space-y-3">{children}</div>;
}
