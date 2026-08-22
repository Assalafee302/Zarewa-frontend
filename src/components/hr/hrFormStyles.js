/** Shared HR form field classes — aliases canonical Input / FIELD tokens. */
import { FIELD, FORM } from '../../lib/designTokens';

export const HR_FIELD_CLASS = `${FIELD.base} mt-1 shadow-sm`;

export const HR_TEXTAREA_CLASS = `z-textarea mt-1 min-h-[88px] shadow-sm`;

/** @deprecated Prefer HrButton from hrPageUi */
export const HR_BTN_PRIMARY =
  'inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-md bg-zarewa-teal px-5 py-3 text-xs font-medium text-white hover:bg-zarewa-teal-hover disabled:opacity-50';

/** @deprecated Prefer HrButton variant="secondary" */
export const HR_BTN_SECONDARY =
  'inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-md border border-[var(--z-border)] px-5 py-3 text-xs font-medium text-[var(--z-text)] hover:bg-[var(--z-surface-muted)]';

/** @deprecated Prefer HrAddButton */
export const HR_BTN_ADD =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-zarewa-teal px-4 py-3 text-xs font-medium text-white hover:bg-zarewa-teal-hover';

export const HR_BTN_PILL =
  'inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2.5 text-xs font-medium';

export const HR_CARD = 'rounded-lg border border-[var(--z-border-subtle)] bg-white p-4 shadow-[var(--shadow-zarewa-card)] sm:p-5';

export const HR_MUTED = FORM.hint;

export const HR_SECTION_TITLE = FORM.sectionTitle;

export const HR_SECTION_LABEL = FIELD.label;

export const HR_INPUT = FIELD.base;
