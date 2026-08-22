import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleHelp, MoreHorizontal, X } from 'lucide-react';
import { PageTabs } from '../layout';
import { FieldLabel } from '../ui/Input';

/** Material families in the workbook — short labels so tabs stay on one row. */
const WORKBOOK_MATERIAL_TABS = [
  { id: 'alu', label: 'Aluminium' },
  { id: 'aluzinc', label: 'Aluzinc', title: 'Aluzinc (PPGI)' },
  { id: 'stone-coated', label: 'Stone-coated' },
  { id: 'stone-flatsheet', label: 'Flatsheet', title: 'Stone flatsheet' },
  { id: 'ridge-flashing', label: 'Ridge', title: 'Ridge / flashing' },
  { id: 'accessories', label: 'Accessories' },
];

const PRICING_DESK_LINKS = [
  { to: '/price-list', label: 'Published list' },
  { to: '/pricing-policy', label: 'Policy' },
  { to: '/operations/material-exceptions', label: 'Exceptions' },
];

const FIELD_SM =
  'h-9 min-h-9 w-full rounded-md border border-[var(--z-border)] bg-white px-2.5 py-1.5 text-sm font-medium text-[var(--z-text)] outline-none focus:border-zarewa-teal/50 focus:ring-2 focus:ring-zarewa-teal/15';

const GHOST_ICON =
  'inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-zarewa-teal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 disabled:opacity-45';

/**
 * Quiet dest links for the pricing desk — page title already says Workbook.
 */
export function WorkbookDeskLinks({ className = '' }) {
  return (
    <nav aria-label="Pricing desk" className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      {PRICING_DESK_LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="text-ui-xs font-semibold text-slate-500 hover:text-zarewa-teal transition-colors"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function WorkbookHelpPanel({ lookbackDays }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
      <p className="text-ui-xs font-semibold text-slate-700">How a row becomes a selling price</p>
      <ul className="mt-1.5 grid gap-1 text-ui-xs text-slate-600 leading-relaxed sm:grid-cols-2">
        <li>
          <strong className="text-slate-800">Density</strong> — catalog kg/m (read-only).
        </li>
        <li>
          <strong className="text-slate-800">Purchase avg</strong> — coil GRNs in the last {lookbackDays}d.
        </li>
        <li>
          <strong className="text-slate-800">Production</strong> — actual conversion in the last {lookbackDays}d.
        </li>
        <li>
          <strong className="text-slate-800">Kg used</strong> — average of those, or your override.
        </li>
        <li>
          <strong className="text-slate-800">Floor</strong> — MD minimum ₦/m.{' '}
          <strong className="text-slate-800">List</strong> = Floor + commission.
        </li>
        <li>
          Prefer <strong className="text-slate-800">Medium+</strong> confidence before publish. Save keeps drafts
          only.
        </li>
      </ul>
    </div>
  );
}

function WorkbookMoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const visible = (items || []).filter((item) => item && !item.hidden);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!visible.length) return null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        className={GHOST_ICON}
        aria-label="More workbook tools"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={16} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-[var(--shadow-zarewa-overlay)]"
        >
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.title}
              className="flex w-full items-center px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Slim workbook chrome: modal title (page uses PageHeader), material tabs, filters + actions.
 * Help and print/refresh stay behind disclosure so the daily desk stays one row.
 */
export function MaterialPricingWorkbookChrome({
  isPage = false,
  onClose,
  materialKey,
  onMaterialKey,
  busy = false,
  branches = [],
  branchId,
  onBranchId,
  isReferenceTab = false,
  isStoneCoated = false,
  lookbackDays = 30,
  recCostLabel,
  costKgValue = '',
  costKgMixed = false,
  onCostKgChange,
  syncAllChecked = false,
  onSyncAllChange,
  moreItems = [],
  children,
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="shrink-0">
      {!isPage ? (
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="z-page-title text-base">Material pricing workbook</h2>
            <p className="z-page-subtitle mt-0.5 max-w-xl">
              Save keeps drafts. Publish updates the selling list.
            </p>
            <WorkbookDeskLinks className="mt-2" />
          </div>
          {onClose ? (
            <button type="button" onClick={onClose} className={GHOST_ICON} aria-label="Close">
              <X size={18} aria-hidden />
            </button>
          ) : null}
        </header>
      ) : null}

      <PageTabs
        className="px-3 sm:px-4"
        ariaLabel="Workbook material"
        panelId="workbook-material-panel"
        value={materialKey}
        tabs={WORKBOOK_MATERIAL_TABS}
        onChange={(id) => {
          if (id !== materialKey) void onMaterialKey?.(id);
        }}
      />

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <div className="w-[min(100%,11.5rem)]">
            <FieldLabel htmlFor="workbook-branch">Branch</FieldLabel>
            <select
              id="workbook-branch"
              className={FIELD_SM}
              value={branchId}
              disabled={busy}
              onChange={(e) => void onBranchId?.(e.target.value)}
            >
              {branches.length === 0 ? <option value="">No branches</option> : null}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.code || b.id}
                </option>
              ))}
            </select>
          </div>
          {!isReferenceTab ? (
            <div className="w-[min(100%,10.5rem)]">
              <FieldLabel htmlFor="workbook-cost-kg">₦/kg</FieldLabel>
              <input
                id="workbook-cost-kg"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-label="Material cost per kilogram, applied to all gauges"
                title={`Weighted average from coil GRNs (last ${lookbackDays} days). Override applies to every row.`}
                placeholder={
                  costKgMixed
                    ? 'Mixed'
                    : recCostLabel != null && Number(recCostLabel) > 0 && !isStoneCoated
                      ? `~${recCostLabel}`
                      : isStoneCoated
                        ? 'N/A'
                        : ''
                }
                disabled={isStoneCoated || busy}
                className={`${FIELD_SM} font-mono tabular-nums disabled:opacity-50`}
                value={costKgValue}
                onChange={(e) => onCostKgChange?.(e.target.value)}
              />
            </div>
          ) : null}
          {!isReferenceTab ? (
            <label
              className="mb-1 inline-flex items-center gap-2 text-ui-xs font-medium text-slate-600"
              title="Marks rows to include when you Publish"
            >
              <input
                type="checkbox"
                className="rounded border-slate-300 text-zarewa-teal focus:ring-zarewa-teal/30"
                checked={syncAllChecked}
                onChange={(e) => onSyncAllChange?.(e.target.checked)}
                aria-label="Mark all workbook rows to publish to price list"
              />
              Include all in publish
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className={GHOST_ICON}
            aria-label="How pricing works"
            aria-expanded={helpOpen}
            title="How pricing works"
            onClick={() => setHelpOpen((v) => !v)}
          >
            <CircleHelp size={16} strokeWidth={2} aria-hidden />
          </button>
          {children}
          <WorkbookMoreMenu items={moreItems} />
        </div>
      </div>

      {helpOpen ? <WorkbookHelpPanel lookbackDays={lookbackDays} /> : null}
    </div>
  );
}
