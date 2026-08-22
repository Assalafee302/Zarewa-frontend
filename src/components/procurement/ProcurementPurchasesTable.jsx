import React from 'react';
import { Package } from 'lucide-react';

import { formatNgn } from '../../Data/mockData';
import { purchaseOrderOrderedValueNgn } from '../../lib/liveAnalytics';
import { procurementKindFromPo } from '../../lib/procurementPoKind';
import { PROCUREMENT_PO_SORT_FIELDS } from '../../lib/procurementPoListSorting';
import { purchaseOrderTransportGapLabel } from '../../lib/purchaseOrderWorkflow';
import {
  SalesListSortBar,
  SalesListTableFrame,
} from '../sales/SalesListTableFrame';
import {
  AppTable,
  AppTableBody,
  AppTablePager,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';
import { PoStatusChip } from './PoStatusChip';
import {
  PO_KIND_FILTERS,
  PROCUREMENT_PURCHASES_PAGE_SIZE,
  poKindShortLabel,
  poKindUnitHint,
  poLineSummaryLabel,
} from '../../pages/procurement/procurementTabShared.js';

function formatDeskDate(iso) {
  const s = String(iso || '').trim().slice(0, 10);
  return s || '—';
}

function transportCell(po, needsLink) {
  if (needsLink) {
    return {
      label: 'Link due',
      title: purchaseOrderTransportGapLabel(po),
      className: 'border-amber-200 bg-amber-50 text-amber-950',
    };
  }
  if (po.transportPaid) {
    return {
      label: 'Fee paid',
      title: po.transportAgentName || 'Transport fee paid',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    };
  }
  if (Number(po.transportAmountNgn) > 0) {
    return {
      label: 'Quoted',
      title: `${po.transportAgentName || 'Haulier'} · ${formatNgn(po.transportAmountNgn)}`,
      className: 'border-sky-200 bg-sky-50 text-sky-900',
    };
  }
  return {
    label: '—',
    title: 'No transport on this PO',
    className: 'border-slate-200 bg-slate-50 text-slate-500',
  };
}

function paidTone(paid, ordered) {
  if (ordered <= 0) return 'text-slate-500';
  if (paid <= 0) return 'text-slate-500';
  if (paid + 0.5 >= ordered) return 'text-emerald-800';
  return 'text-amber-900';
}

/**
 * Purchases desk: one sortable table with kind filters (replaces four cramped card columns).
 */
export function ProcurementPurchasesTable({
  kindFilter,
  onKindFilterChange,
  kindCounts,
  sort,
  onSortFieldChange,
  onSortDirToggle,
  page,
  rows,
  selectedPoId,
  missingTransportIds,
  onOpenPo,
}) {
  return (
    <SalesListTableFrame
      toolbar={
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="tablist"
              aria-label="Purchase order kind"
              className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1"
            >
              {PO_KIND_FILTERS.map((f) => {
                const count = kindCounts?.[f.id] ?? 0;
                const selected = kindFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => onKindFilterChange(f.id)}
                    className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 py-1 text-ui-xs font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25 ${
                      selected
                        ? 'bg-zarewa-teal text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                    <span
                      className={`tabular-nums ${selected ? 'text-white/80' : 'text-slate-400'}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <SalesListSortBar
              fields={PROCUREMENT_PO_SORT_FIELDS}
              field={sort.field}
              dir={sort.dir}
              onFieldChange={onSortFieldChange}
              onDirToggle={onSortDirToggle}
            />
          </div>
          <p className="text-ui-xs text-slate-500 leading-snug">
            Click a row to open the side panel for approve, reject, transport, and edit.
          </p>
        </div>
      }
    >
      {page.total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-12 text-center">
          <Package className="size-8 text-slate-300" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-sm font-semibold text-slate-700">No purchase orders in this view</p>
          <p className="mt-1 max-w-sm text-ui-xs text-slate-500 leading-relaxed">
            Try another kind filter, clear search, or raise a new PO from the header.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {rows.map((p) => {
              const pk = procurementKindFromPo(p);
              const ordered = purchaseOrderOrderedValueNgn(p);
              const paid = Number(p.supplierPaidNgn) || 0;
              const needsLink = Boolean(missingTransportIds?.has?.(p.poID));
              const t = transportCell(p, needsLink);
              const selected = selectedPoId === p.poID;
              return (
                <button
                  key={p.poID}
                  type="button"
                  onClick={() => onOpenPo(p)}
                  className={`w-full rounded-xl border px-3 py-3 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25 ${
                    selected
                      ? 'border-zarewa-teal/35 bg-teal-50/70'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-zarewa-teal">{p.poID}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                        {p.supplierName || '—'}
                      </p>
                    </div>
                    <PoStatusChip status={p.status} />
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-ui-xs">
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-400">Kind</dt>
                      <dd className="text-slate-700">{poKindShortLabel(pk)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-400">Date</dt>
                      <dd className="tabular-nums text-slate-700">{formatDeskDate(p.orderDateISO)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-400">Ordered</dt>
                      <dd className="z-stencil text-slate-900">{formatNgn(ordered)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-400">Paid</dt>
                      <dd className={`z-stencil ${paidTone(paid, ordered)}`}>{formatNgn(paid)}</dd>
                    </div>
                  </dl>
                  <p className="mt-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-ui-xs font-semibold ${t.className}`}
                    >
                      {t.label}
                    </span>
                  </p>
                </button>
              );
            })}
          </div>

          <div className="hidden md:block">
            <AppTableWrap className="!rounded-none !border-0 !shadow-none">
              <AppTable role="numeric" className="min-w-[52rem]">
                <AppTableThead sticky>
                  <AppTableTh>PO</AppTableTh>
                  <AppTableTh>Kind</AppTableTh>
                  <AppTableTh>Supplier</AppTableTh>
                  <AppTableTh>Date</AppTableTh>
                  <AppTableTh align="right">Lines</AppTableTh>
                  <AppTableTh align="right">Ordered</AppTableTh>
                  <AppTableTh align="right">Paid</AppTableTh>
                  <AppTableTh>Transport</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                </AppTableThead>
                <AppTableBody>
                  {rows.map((p) => {
                    const pk = procurementKindFromPo(p);
                    const lineCount = Array.isArray(p?.lines) ? p.lines.length : 0;
                    const ordered = purchaseOrderOrderedValueNgn(p);
                    const paid = Number(p.supplierPaidNgn) || 0;
                    const needsLink = Boolean(missingTransportIds?.has?.(p.poID));
                    const t = transportCell(p, needsLink);
                    const selected = selectedPoId === p.poID;
                    const lineTitle = `${lineCount} ${poLineSummaryLabel(pk)}`;
                    return (
                      <AppTableTr
                        key={p.poID}
                        onClick={() => onOpenPo(p)}
                        className={selected ? 'bg-teal-50/70 hover:bg-teal-50/90' : ''}
                        title={`Open ${p.poID}`}
                      >
                        <AppTableTd monospace truncate={false} className="!max-w-none">
                          <span className="font-bold text-zarewa-teal">{p.poID}</span>
                        </AppTableTd>
                        <AppTableTd truncate={false} className="!max-w-none">
                          <span className="font-semibold text-slate-700">{poKindShortLabel(pk)}</span>
                          <span className="ml-1 text-ui-xs font-medium text-slate-400">
                            {poKindUnitHint(pk)}
                          </span>
                        </AppTableTd>
                        <AppTableTd title={p.supplierName}>{p.supplierName || '—'}</AppTableTd>
                        <AppTableTd truncate={false} className="!max-w-none tabular-nums text-slate-600">
                          {formatDeskDate(p.orderDateISO)}
                        </AppTableTd>
                        <AppTableTd align="right" title={lineTitle} truncate={false} className="!max-w-none">
                          {lineCount}
                        </AppTableTd>
                        <AppTableTd
                          align="right"
                          truncate={false}
                          className="z-stencil !max-w-none font-semibold text-slate-900"
                          title="Ordered value including legacy per-kg rows"
                        >
                          {formatNgn(ordered)}
                        </AppTableTd>
                        <AppTableTd
                          align="right"
                          truncate={false}
                          className={`z-stencil !max-w-none font-semibold ${paidTone(paid, ordered)}`}
                        >
                          {formatNgn(paid)}
                        </AppTableTd>
                        <AppTableTd truncate={false} className="!max-w-none">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-ui-xs font-semibold ${t.className}`}
                            title={t.title}
                          >
                            {t.label}
                          </span>
                        </AppTableTd>
                        <AppTableTd truncate={false} className="!max-w-none">
                          <PoStatusChip status={p.status} />
                        </AppTableTd>
                      </AppTableTr>
                    );
                  })}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </div>

          <AppTablePager
            showingFrom={page.showingFrom}
            showingTo={page.showingTo}
            total={page.total}
            hasPrev={page.hasPrev}
            hasNext={page.hasNext}
            onPrev={page.goPrev}
            onNext={page.goNext}
            pageSize={PROCUREMENT_PURCHASES_PAGE_SIZE}
          />
        </>
      )}
    </SalesListTableFrame>
  );
}
