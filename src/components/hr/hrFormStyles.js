/** Shared HR form field and button classes (mobile-friendly: 44px touch targets, 16px text on phones) */
export const HR_FIELD_CLASS =
  'mt-1 block w-full min-h-11 rounded-xl border border-slate-200 bg-gray-50 px-4 py-3 text-base sm:text-sm font-semibold text-zarewa-teal shadow-sm outline-none transition-all focus:border-teal-500/35 focus:ring-2 focus:ring-zarewa-teal/10';

export const HR_TEXTAREA_CLASS = `${HR_FIELD_CLASS} min-h-[88px] resize-y font-medium text-gray-800`;

/** @deprecated Prefer HrButton from hrPageUi — kept for backward compatibility. */
export const HR_BTN_PRIMARY =
  'inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl bg-zarewa-teal px-5 py-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#0f3d3a] disabled:opacity-50';

/** @deprecated Prefer HrButton variant="secondary" from hrPageUi. */
export const HR_BTN_SECONDARY =
  'inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50';

/** @deprecated Prefer HrAddButton from hrPageUi. */
export const HR_BTN_ADD =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-zarewa-teal px-4 py-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#0f3d3a]';

/** Touch-friendly pill for scope tabs and small actions */
export const HR_BTN_PILL =
  'inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide';

/** Card shell used in accountability / security panels */
export const HR_CARD = 'rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5';

export const HR_MUTED = 'text-xs text-slate-500';

export const HR_SECTION_TITLE = 'text-sm font-black text-slate-900';

/** Standalone input (no label margin) — same field styling as HR_FIELD_CLASS */
export const HR_INPUT =
  'block w-full min-h-11 rounded-xl border border-slate-200 bg-gray-50 px-4 py-3 text-base sm:text-sm font-semibold text-zarewa-teal shadow-sm outline-none transition-all focus:border-teal-500/35 focus:ring-2 focus:ring-zarewa-teal/10';
