import React from 'react';

/**
 * @param {{
 *   id?: string;
 *   icon?: import('react').ReactNode;
 *   title: string;
 *   subtitle?: string;
 *   children: import('react').ReactNode;
 *   className?: string;
 * }} props
 */
export function ProfileFormSection({ id, icon, title, subtitle, children, className = '' }) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <header className="mb-5">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
          {icon ? <span className="text-[#134e4a]">{icon}</span> : null}
          {title}
        </h3>
        {subtitle ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

/**
 * @param {{ label: string; hint?: string; htmlFor?: string; children: import('react').ReactNode; className?: string }} props
 */
export function ProfileFormField({ label, hint, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      <label className="z-field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

/**
 * Horizontal in-page section jumps (account form layout).
 * @param {{ items: { id: string; label: string }[] }} props
 */
export function ProfilePageAnchors({ items }) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="On this page"
      className="sticky top-[var(--app-header-offset,0px)] z-20 -mx-0.5 mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/90 bg-[#F8FAFC]/95 p-1 backdrop-blur-md sm:-mx-1 sm:gap-1.5 sm:p-1.5 [-webkit-overflow-scrolling:touch]"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="shrink-0 rounded-xl border border-transparent px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-600 no-underline transition hover:border-slate-200 hover:bg-white hover:text-[#134e4a] sm:px-3 sm:py-2 sm:text-[10px]"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

/**
 * @param {{ children: import('react').ReactNode; className?: string }} props
 */
export function ProfileFormActions({ children, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap ${className}`}>
      {children}
    </div>
  );
}
