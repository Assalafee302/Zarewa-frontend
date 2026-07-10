import React from 'react';
import { cn } from '../../lib/utils';
import { FIELD } from '../../lib/designTokens';

const inputSizes = {
  default: FIELD.base,
  compact: FIELD.compact,
  search: 'z-input-search',
};

/**
 * Canonical text input — unifies z-input, HR_FIELD_CLASS, z-finance-field, CUSTOMER_FIELD.
 */
const Input = React.forwardRef(
  ({ className, size = 'default', type = 'text', ...props }, ref) => (
    <input
      type={type}
      className={cn(inputSizes[size] ?? inputSizes.default, className)}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

const Textarea = React.forwardRef(({ className, size = 'default', ...props }, ref) => (
  <textarea
    className={cn(
      size === 'compact' ? FIELD.compact : 'z-textarea',
      'min-h-[88px] resize-y',
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

const Select = React.forwardRef(({ className, size = 'default', children, ...props }, ref) => (
  <select
    className={cn(size === 'compact' ? FIELD.compact : 'z-select', className)}
    ref={ref}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

function FieldLabel({ htmlFor, children, className, required }) {
  return (
    <label htmlFor={htmlFor} className={cn(FIELD.label, className)}>
      {children}
      {required ? (
        <span className="ml-0.5 text-red-500" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

export { Input, Textarea, Select, FieldLabel };
