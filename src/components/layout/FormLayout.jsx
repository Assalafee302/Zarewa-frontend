import React from 'react';
import { cn } from '../../lib/utils';
import { FieldLabel } from '../ui/Input';
import { FORM } from '../../lib/designTokens';

/**
 * Label + control + hint/error — use in modals and page forms.
 */
export function FormField({ label, htmlFor, required, hint, error, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <FieldLabel htmlFor={htmlFor} required={required}>
          {label}
        </FieldLabel>
      ) : null}
      {children}
      {error ? <p className={FORM.error}>{error}</p> : null}
      {!error && hint ? <p className={FORM.hint}>{hint}</p> : null}
    </div>
  );
}

export function FormSection({ title, icon: Icon, children, className, flat = false }) {
  return (
    <section className={cn(flat ? FORM.sectionFlat : FORM.section, className)}>
      {title ? (
        <p className={FORM.sectionTitle}>
          {Icon ? <Icon size={14} strokeWidth={2} aria-hidden /> : null}
          {title}
        </p>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function FormGrid({ children, cols = 2, className }) {
  const gridClass = cols === 3 ? FORM.gridThree : FORM.grid;
  return <div className={cn(gridClass, className)}>{children}</div>;
}

export function FormStack({ children, className }) {
  return <div className={cn(FORM.stack, className)}>{children}</div>;
}
