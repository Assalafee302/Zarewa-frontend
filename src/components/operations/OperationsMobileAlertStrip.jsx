import React from 'react';
import { Bell } from 'lucide-react';

/**
 * Ops alerts — in-transit, thin coils, pending stock-damage reports.
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
      tone: 'sky',
      onClick: onGoInventory,
    });
  }
  if (lowStockCount > 0) {
    items.push({
      key: 'low-stock',
      label: `${lowStockCount} thin coil${lowStockCount !== 1 ? 's' : ''}`,
      tone: 'amber',
      onClick: onGoThinCoils || onGoInventory,
    });
  }
  if (pendingMexCount > 0) {
    items.push({
      key: 'mex',
      label: `${pendingMexCount} exception${pendingMexCount !== 1 ? 's' : ''}`,
      tone: 'rose',
      onClick: onGoMaterialExceptions,
    });
  }

  if (items.length === 0) return null;

  const toneCls = {
    amber: 'border-amber-200 bg-amber-50/90 text-amber-950 hover:bg-amber-100/90',
    sky: 'border-sky-200 bg-sky-50/90 text-sky-950 hover:bg-sky-100/90',
    rose: 'border-rose-200 bg-rose-50/90 text-rose-950 hover:bg-rose-100/90',
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4" role="status" aria-label="Operations alerts">
      <span className="inline-flex items-center gap-1 text-ui-xs font-bold uppercase tracking-wider text-slate-500 w-full sm:w-auto">
        <Bell size={12} aria-hidden /> Alerts
      </span>
      {items.map((item) => {
        const interactive = typeof item.onClick === 'function';
        const className = `inline-flex rounded-lg border px-2.5 py-1.5 text-ui-xs font-semibold ${
          toneCls[item.tone] || toneCls.amber
        }${interactive ? ' cursor-pointer' : ''}`;
        if (interactive) {
          return (
            <button key={item.key} type="button" className={className} onClick={item.onClick}>
              {item.label}
            </button>
          );
        }
        return (
          <span key={item.key} className={className}>
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
