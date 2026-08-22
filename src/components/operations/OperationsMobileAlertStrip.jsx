import React from 'react';
import { OPS_TOOL_BTN } from './operationsDeskUi';

/**
 * Ops alerts — in-transit, thin coils, pending stock-damage reports.
 * Mobile-only; desktop pulse metrics cover the same signals.
 */
export default function OperationsMobileAlertStrip({
  inTransitCount = 0,
  lowStockCount = 0,
  pendingMexCount = 0,
  onGoInventory,
  onGoThinCoils,
  onGoMaterialExceptions,
}) {
  const items = [];
  if (inTransitCount > 0) {
    items.push({
      key: 'in-transit',
      label: `${inTransitCount} to receive`,
      onClick: onGoInventory,
    });
  }
  if (lowStockCount > 0) {
    items.push({
      key: 'low-stock',
      label: `${lowStockCount} thin coil${lowStockCount !== 1 ? 's' : ''}`,
      onClick: onGoThinCoils || onGoInventory,
    });
  }
  if (pendingMexCount > 0) {
    items.push({
      key: 'mex',
      label: `${pendingMexCount} exception${pendingMexCount !== 1 ? 's' : ''}`,
      onClick: onGoMaterialExceptions,
    });
  }

  if (items.length === 0) return null;

  return (
    <div
      className="z-toolbar-shell mb-4 flex flex-wrap items-center gap-2 px-3 py-2 lg:hidden"
      role="status"
      aria-label="Operations alerts"
    >
      {items.map((item) => {
        const interactive = typeof item.onClick === 'function';
        if (interactive) {
          return (
            <button key={item.key} type="button" className={OPS_TOOL_BTN} onClick={item.onClick}>
              {item.label}
            </button>
          );
        }
        return (
          <span key={item.key} className={OPS_TOOL_BTN}>
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
