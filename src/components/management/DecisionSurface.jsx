import React from 'react';

/**
 * Uniform decision popup chrome — one band language by function.
 *
 * Tones:
 * - decide / clearance → teal rail
 * - flagged → rose rail
 * - production → amber rail
 * - convert → teal rail
 * - refund → rose rail
 * - payment → teal rail
 * - credit → teal fill
 * - material → amber rail
 * - edit → violet fill
 * - risk → rose fill
 * - po → slate rail
 */

export const DECISION_TONES = {
  decide: {
    band: 'border-slate-200 border-l-zarewa-teal',
    eyebrow: 'text-zarewa-teal',
    fill: 'bg-white',
  },
  clearance: {
    band: 'border-slate-200 border-l-zarewa-teal',
    eyebrow: 'text-zarewa-teal',
    fill: 'bg-white',
  },
  flagged: {
    band: 'border-slate-200 border-l-rose-500',
    eyebrow: 'text-rose-700',
    fill: 'bg-white',
  },
  production: {
    band: 'border-slate-200 border-l-amber-500',
    eyebrow: 'text-amber-800',
    fill: 'bg-white',
  },
  convert: {
    band: 'border-slate-200 border-l-teal-600',
    eyebrow: 'text-zarewa-teal',
    fill: 'bg-white',
  },
  refund: {
    band: 'border-slate-200 border-l-rose-500',
    eyebrow: 'text-rose-700',
    fill: 'bg-white',
  },
  payment: {
    band: 'border-slate-200 border-l-teal-600',
    eyebrow: 'text-zarewa-teal',
    fill: 'bg-white',
  },
  credit: {
    band: 'border-teal-200 border-l-zarewa-teal',
    eyebrow: 'text-zarewa-teal',
    fill: 'bg-teal-50/60',
  },
  material: {
    band: 'border-slate-200 border-l-amber-500',
    eyebrow: 'text-amber-800',
    fill: 'bg-white',
  },
  edit: {
    band: 'border-violet-200 border-l-violet-600',
    eyebrow: 'text-violet-800',
    fill: 'bg-violet-50/50',
  },
  risk: {
    band: 'border-rose-200 border-l-rose-600',
    eyebrow: 'text-rose-800',
    fill: 'bg-rose-50/80',
  },
  po: {
    band: 'border-slate-200 border-l-slate-400',
    eyebrow: 'text-slate-500',
    fill: 'bg-white',
  },
};

const TILE = {
  approve:
    'flex flex-col items-center justify-center gap-1.5 rounded-xl bg-emerald-600 p-3.5 text-white transition-colors hover:bg-emerald-500 disabled:opacity-50',
  reject:
    'flex flex-col items-center justify-center gap-1.5 rounded-xl bg-rose-600 p-3.5 text-white transition-colors hover:bg-rose-500 disabled:opacity-50',
  neutral:
    'flex flex-col items-center justify-center gap-1.5 rounded-xl bg-slate-600 p-3.5 text-white transition-colors hover:bg-slate-500 disabled:opacity-50',
  brand:
    'flex w-full items-center justify-center gap-2 rounded-xl bg-zarewa-teal p-3.5 text-ui-xs font-black uppercase tracking-widest text-white transition-colors hover:brightness-105 disabled:opacity-50',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50',
  compactApprove:
    'inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-black uppercase tracking-wide text-white hover:bg-emerald-500 disabled:opacity-50',
  compactReject:
    'inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 text-xs font-black uppercase tracking-wide text-white hover:bg-rose-500 disabled:opacity-50',
};

/**
 * Function-colored hero band shared by all decision popups.
 */
export function DecisionBand({
  tone = 'decide',
  eyebrow,
  title,
  subtitle,
  meta,
  aside,
  children,
  className = '',
}) {
  const t = DECISION_TONES[tone] || DECISION_TONES.decide;
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border border-l-4 px-4 py-3 shadow-sm ${t.fill} ${t.band} ${className}`}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className={`text-ui-xs font-black uppercase tracking-widest ${t.eyebrow}`}>{eyebrow}</p>
        ) : null}
        {title ? (
          <h2 className="mt-0.5 font-mono text-lg font-black leading-tight text-slate-900">{title}</h2>
        ) : null}
        {subtitle ? (
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">{subtitle}</p>
        ) : null}
        {meta ? <div className="mt-2 flex flex-wrap gap-2">{meta}</div> : null}
        {children}
      </div>
      {aside ? <div className="shrink-0 text-right">{aside}</div> : null}
    </div>
  );
}

export function DecisionChip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-100 text-amber-900',
    rose: 'bg-rose-100 text-rose-900',
    teal: 'bg-teal-50 text-teal-900',
    emerald: 'bg-emerald-100 text-emerald-900',
    violet: 'bg-violet-100 text-violet-900',
  };
  return (
    <span className={`rounded-md px-2 py-1 text-ui-xs font-black uppercase ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

/**
 * Single sticky action bar — use on the modal shell, not nested inside scroll panels.
 */
export function DecisionStickyActions({ children, className = '', hint }) {
  return (
    <div
      className={`sticky bottom-0 z-20 space-y-2 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] ${className}`}
    >
      {hint ? <p className="text-ui-xs leading-snug text-slate-500">{hint}</p> : null}
      {children}
    </div>
  );
}

/**
 * In-body action strip when the shell already owns the sticky footer,
 * or when the preview is embedded without a shell footer.
 */
export function DecisionActionBar({ children, className = '', hint }) {
  return (
    <div
      className={`space-y-2 rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)] ${className}`}
    >
      {hint ? <p className="text-ui-xs leading-snug text-slate-500">{hint}</p> : null}
      {children}
    </div>
  );
}

export function DecisionActionTile({
  variant = 'approve',
  icon: Icon,
  label,
  disabled,
  onClick,
  className = '',
  type = 'button',
}) {
  const cls = TILE[variant] || TILE.approve;
  const isBrand = variant === 'brand' || variant === 'secondary' || variant === 'compactApprove' || variant === 'compactReject';
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${cls} ${className}`}>
      {Icon ? <Icon size={isBrand && variant.startsWith('compact') ? 14 : 18} /> : null}
      <span className={isBrand && !variant.startsWith('compact') ? undefined : 'text-ui-xs font-black uppercase tracking-widest'}>
        {label}
      </span>
    </button>
  );
}

/** Shared modal shell header (sticky top). */
export function DecisionModalHeader({ title, onClose, busy = false, icon: Icon }) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        {Icon ? <Icon size={14} className="text-zarewa-teal" /> : null}
        {title}
      </h3>
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="text-ui-xs font-bold uppercase text-slate-400 transition-colors hover:text-slate-800 disabled:opacity-50"
      >
        Close
      </button>
    </div>
  );
}

export function DecisionModalBody({ children, className = '' }) {
  return (
    <div className={`custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/80 p-4 text-slate-800 ${className}`}>
      {children}
    </div>
  );
}
