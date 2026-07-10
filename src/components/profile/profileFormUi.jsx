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
export function ProfileFormSection({ id, icon, title, subtitle, children, className = '', flat = false, compact = false }) {
  return (
    <section
      id={id}
      className={`scroll-mt-4 overflow-hidden rounded-xl border ${
        compact
          ? 'border-slate-100 bg-white shadow-none'
          : 'border-slate-200/90 bg-white shadow-sm'
      } ${className}`}
    >
      {!flat && !compact ? <ProfileAccentBar /> : null}
      <div className={compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'}>
        <header className={`${flat || compact ? 'mb-3' : 'mb-4 border-b border-slate-100 pb-3'}`}>
          <h3
            className={
              flat || compact
                ? 'flex items-center gap-2 text-sm font-bold text-slate-900'
                : 'flex items-center gap-2 text-ui-xs font-bold uppercase tracking-widest text-slate-500'
            }
          >
            {icon ? (
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${compact ? 'bg-teal-50 text-zarewa-teal' : 'text-zarewa-teal'}`}>
                {icon}
              </span>
            ) : null}
            {title}
          </h3>
          {subtitle ? (
            <p className={`${compact ? 'mt-1' : 'mt-1.5'} text-xs leading-relaxed text-slate-500 sm:text-sm`}>{subtitle}</p>
          ) : null}
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
 * Horizontal section jumps — sticky in modal, scrollable on phone.
 * @param {{ items: { id: string; label: string }[]; variant?: 'page' | 'modal' }} props
 */
export function ProfilePageAnchors({ items, variant = 'page' }) {
  if (!items.length) return null;

  if (variant === 'modal') {
    return (
      <nav
        aria-label="Form sections"
        className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2.5 custom-scrollbar [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:px-5"
      >
        {items.map((item, index) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="group flex shrink-0 snap-start items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 no-underline transition hover:border-zarewa-teal/30 hover:bg-teal-50/50 hover:text-zarewa-teal"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white text-ui-xs font-bold text-slate-400 ring-1 ring-slate-200 group-hover:text-zarewa-teal">
              {index + 1}
            </span>
            {item.label}
          </a>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="On this page"
      className="mb-4 flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:sticky sm:top-[var(--app-header-offset,0px)] sm:z-20 sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="shrink-0 snap-start rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 no-underline transition hover:bg-slate-50 hover:text-zarewa-teal sm:text-xs sm:font-bold sm:uppercase sm:tracking-[0.06em]"
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

/**
 * Missing-field summary before submit — compact on phone, full chips on larger screens.
 * @param {{ missing: { id: string; label: string }[]; variant?: 'page' | 'modal' }} props
 */
export function ProfileSubmitRequirements({ missing, variant = 'page' }) {
  if (!missing?.length) return null;

  const chipTone =
    variant === 'modal'
      ? 'border-amber-100 bg-amber-50/80 text-amber-950'
      : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <div className={`rounded-lg border px-3 py-2.5 text-xs ${chipTone}`}>
      <p className="font-semibold text-slate-800">Required before submit</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:hidden">
        {missing.length} field{missing.length === 1 ? '' : 's'} still needed. Jump to a section above, then return
        here to submit.
      </p>
      <ul className="mt-1.5 hidden max-h-28 flex-wrap gap-1.5 overflow-y-auto sm:flex">
        {missing.map((m) => (
          <li
            key={m.id}
            className="rounded-md bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80"
          >
            {m.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
