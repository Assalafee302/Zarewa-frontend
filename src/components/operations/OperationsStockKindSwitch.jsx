/* eslint-disable react-refresh/only-export-components -- stock-kind constants colocated with the switch */
import React, { useRef } from 'react';

/** Coil / stone metres / stone flatsheet m² / accessory — receive and on-hand. */
export const STOCK_RECEIVE_KIND_TABS = [
  { id: 'coil', label: 'Coil' },
  { id: 'stone_meter', label: 'Stone (m)' },
  { id: 'stone_flatsheet', label: 'Flatsheet (m²)' },
  { id: 'accessory', label: 'Accessories' },
];

/**
 * Stock family for receive + on-hand. Radio group (not a second PageTabs)
 * so arrows stay on this control only.
 */
export function OperationsStockKindSwitch({ value, onChange }) {
  const btnRefs = useRef([]);
  const tabs = STOCK_RECEIVE_KIND_TABS;

  const moveFocus = (fromIndex, key) => {
    const last = tabs.length - 1;
    let next = fromIndex;
    if (key === 'ArrowRight') next = fromIndex === last ? 0 : fromIndex + 1;
    else if (key === 'ArrowLeft') next = fromIndex === 0 ? last : fromIndex - 1;
    else if (key === 'Home') next = 0;
    else if (key === 'End') next = last;
    else return false;
    onChange(tabs[next].id);
    queueMicrotask(() => btnRefs.current[next]?.focus());
    return true;
  };

  return (
    <div
      role="radiogroup"
      aria-label="Stock category (receive and on-hand)"
      className="flex flex-wrap gap-1"
    >
      {tabs.map((t, i) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (moveFocus(i, e.key)) e.preventDefault();
            }}
            className={`min-h-9 px-2.5 py-1 rounded-md text-ui-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25 ${
              active
                ? 'bg-zarewa-teal text-white'
                : 'border border-[var(--z-border)] bg-white text-[var(--z-text-muted)] hover:bg-[var(--z-surface-muted)] hover:text-[var(--z-text)]'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
