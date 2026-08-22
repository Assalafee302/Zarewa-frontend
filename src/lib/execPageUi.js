/**
 * Executive / branch-manager metric card styles (Industrial Integrity overview layer).
 * Use on Today / Insights hero KPIs only — not on dense workflow tables.
 */

export const COMMAND_METRIC_GRID =
  'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4';

export const COMMAND_METRIC_CARD =
  'group relative overflow-hidden rounded-xl border border-[var(--z-border-subtle)] bg-white p-5 text-left shadow-[var(--shadow-zarewa-card)] transition-shadow hover:shadow-[var(--shadow-zarewa-overlay)]';

export const COMMAND_METRIC_CARD_INTERACTIVE =
  `${COMMAND_METRIC_CARD} cursor-pointer hover:bg-[var(--z-surface-muted)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 focus-visible:ring-offset-2`;

export const COMMAND_METRIC_DECOR =
  'pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[var(--z-surface-muted)] opacity-40 transition-transform duration-300 group-hover:scale-110';

export const COMMAND_METRIC_LABEL = 'z-label-caps mb-1';

export const COMMAND_METRIC_VALUE = 'z-stencil text-2xl tabular-nums text-[var(--z-text)]';

export const COMMAND_METRIC_META = 'mt-2 text-ui-xs text-[var(--z-text-muted)]';

export const COMMAND_ICON_CHIP = {
  primary: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zarewa-teal text-white',
  secondary: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zarewa-teal-soft text-zarewa-teal',
  tertiary: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--z-surface-muted)] text-zarewa-teal',
  warn: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900',
  neutral: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--z-surface-muted)] text-[var(--z-text-muted)]',
};

export const COMMAND_HERO_CARD =
  'relative overflow-hidden rounded-xl border border-[var(--z-border-subtle)] bg-white p-5 sm:p-6 shadow-[var(--shadow-zarewa-card)]';

export const COMMAND_SECTION_INTRO = 'mb-4';
export const COMMAND_SECTION_EYEBROW = 'z-label-caps';
export const COMMAND_SECTION_TITLE = 'mt-1 text-lg font-bold tracking-tight text-[var(--z-text)]';
export const COMMAND_SECTION_SUB = 'mt-0.5 text-sm text-[var(--z-text-muted)]';

/** @deprecated prefer COMMAND_METRIC_CARD — kept for list rows in exec trays */
export const EXEC_CARD_ROW =
  'rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-2.5 px-3 shadow-sm transition-colors hover:bg-white/70 active:scale-[0.99]';

export const EXEC_CHIP =
  'inline-flex items-center text-ui-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-md border shrink-0';

export const EXEC_PRIMARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-zarewa-teal text-white px-4 py-2.5 text-ui-xs font-semibold uppercase tracking-wider shadow-sm hover:bg-zarewa-teal-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 focus-visible:ring-offset-2 min-h-[44px]';

export const EXEC_SECONDARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--z-border)] bg-white px-4 py-2.5 text-ui-xs font-semibold uppercase tracking-wider text-[var(--z-text)] shadow-sm hover:bg-[var(--z-surface-muted)] transition-all min-h-[44px]';

export const EXEC_COMPACT_ACTION_BTN =
  'inline-flex shrink-0 items-center justify-center rounded-md bg-zarewa-teal px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-zarewa-teal-hover min-h-8 min-w-[3.75rem]';

export const EXEC_SELECT =
  'rounded-lg border border-[var(--z-border)] bg-white py-2 pl-3 pr-8 text-base sm:text-xs font-semibold text-zarewa-teal outline-none focus:border-zarewa-teal/35 focus:ring-2 focus:ring-zarewa-teal/10 shadow-sm';
