import React from 'react';
import { ProfileAccentBar } from './profileDesign';

export const PROFILE_INPUT_CLASS = 'z-input';
export const PROFILE_TEXTAREA_CLASS = 'z-input min-h-[88px] resize-y';

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
export function ProfileFormSection({ id, icon, title, subtitle, children, className = '', flat = false }) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ${className}`}
    >
      {!flat ? <ProfileAccentBar /> : null}
      <div className="p-4 sm:p-5">
        <header className={`${flat ? 'mb-4' : 'mb-4 border-b border-slate-100 pb-3'}`}>
          <h3
            className={
              flat
                ? 'flex items-center gap-2 text-sm font-bold text-slate-900'
                : 'flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500'
            }
          >
            {icon ? <span className="text-[#134e4a]">{icon}</span> : null}
            {title}
          </h3>
          {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{subtitle}</p> : null}
        </header>
        {children}
      </div>
    </section>
  );
}

/**
 * @param {{ label: string; hint?: string; htmlFor?: string; required?: boolean; children: import('react').ReactNode; className?: string }} props
 */
export function ProfileFormField({ label, hint, htmlFor, required = false, children, className = '' }) {
  return (
    <div className={className}>
      <label className="z-field-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="z-meta-text mt-1">{hint}</p> : null}
    </div>
  );
}

/**
 * Horizontal in-page section jumps — Sales-style anchor bar.
 * @param {{ items: { id: string; label: string }[] }} props
 */
export function ProfilePageAnchors({ items }) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="On this page"
      className="sticky top-[var(--app-header-offset,0px)] z-20 mb-4 flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="shrink-0 snap-start rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 no-underline transition hover:bg-slate-50 hover:text-[#134e4a] sm:text-[11px] sm:font-bold sm:uppercase sm:tracking-[0.06em]"
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
