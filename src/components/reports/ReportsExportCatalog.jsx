import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Download, FileSpreadsheet, Loader2, MoreHorizontal, Printer } from 'lucide-react';
import {
  EXPORT_SECTIONS,
  catalogItemSupportsPrint,
  filterExportCatalog,
  flattenExportCatalog,
  formatDownloadedAgo,
  groupCatalogRows,
  loadRecentExportIds,
  printCoverageChipLabel,
  printItemForPair,
  resolvePrintCoverage,
} from '../../lib/reportsExportCatalog.js';

function primaryFormat(item) {
  if (item.kind === 'api-workbook') return 'Excel';
  if (item.formats?.includes('Excel')) return 'Excel';
  return item.formats?.[0] || 'Excel';
}

function CoverageChip({ item }) {
  const coverage = resolvePrintCoverage(item);
  const label = printCoverageChipLabel(coverage);
  if (coverage === 'full') {
    return (
      <span className="text-ui-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
        {label}
      </span>
    );
  }
  if (coverage === 'summary') {
    return (
      <span className="text-ui-xs font-medium text-amber-900 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
        {label}
      </span>
    );
  }
  return <span className="text-ui-xs font-medium text-slate-500">{label}</span>;
}

/**
 * Compact searchable export catalog — list rows, not marketing cards.
 * Official + working paper pairs collapse when both are visible.
 */
export function ReportsExportCatalog({
  hasFinanceView,
  periodValid,
  recommendedOnly = false,
  onRequestExport,
  onOpenJob,
  recentIds: recentIdsProp,
  lastDownloadMap = {},
  busyId = null,
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sectionId, setSectionId] = useState('all');
  const [menuId, setMenuId] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const recentIds = recentIdsProp ?? loadRecentExportIds();

  const openDeepLink = (item) => {
    const link = item?.deepLink;
    if (!link) return;
    if (link.job && typeof onOpenJob === 'function') {
      onOpenJob(link.job);
      return;
    }
    if (link.to) navigate(link.to);
  };

  useEffect(() => {
    if (!Object.keys(lastDownloadMap || {}).length) return undefined;
    const t = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(t);
  }, [lastDownloadMap]);

  const allItems = useMemo(() => flattenExportCatalog(), []);

  const items = useMemo(() => {
    let list = filterExportCatalog(allItems, { query, sectionId, hasFinanceView });
    if (recommendedOnly) list = list.filter((i) => i.monthEndRecommended);
    return list;
  }, [allItems, query, sectionId, recommendedOnly, hasFinanceView]);

  const rows = useMemo(() => {
    if (recommendedOnly) return items.map((item) => ({ type: 'single', item }));
    return groupCatalogRows(items);
  }, [items, recommendedOnly]);

  const recentItems = useMemo(() => {
    if (recommendedOnly || query || sectionId !== 'all') return [];
    return recentIds.map((id) => allItems.find((i) => i.id === id)).filter(Boolean).slice(0, 3);
  }, [recentIds, allItems, recommendedOnly, query, sectionId]);

  const runPrimary = (item) => {
    if (!periodValid || busyId) return;
    const fmt = primaryFormat(item);
    onRequestExport?.(item, fmt === 'CSV' ? 'CSV' : item.kind === 'api-workbook' ? 'Excel' : fmt);
  };

  const sectionChips = [
    { id: 'all', label: 'All' },
    ...EXPORT_SECTIONS.map((s) => ({
      id: s.id,
      label: s.title.replace(/ & .*/, '').replace(/ workbooks?$/i, ''),
    })),
  ];

  return (
    <div className="space-y-4">
      {!recommendedOnly ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports (AR, coil, refund…)"
            className="z-input flex-1 !py-2.5"
            aria-label="Search reports"
          />
          <div className="flex flex-wrap gap-1.5">
            {sectionChips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSectionId(c.id)}
                className={`rounded-lg px-2.5 py-1.5 text-ui-xs font-semibold ${
                  sectionId === c.id
                    ? 'bg-zarewa-teal text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!hasFinanceView ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          Ledger exports that need finance access are hidden for your role.
        </p>
      ) : null}

      {recentItems.length > 0 ? (
        <div>
          <p className="text-ui-xs font-semibold tracking-wide text-slate-500 mb-2">Recent</p>
          <ul className="space-y-1 mb-4">
            {recentItems.map((item) => (
              <ExportRow
                key={`recent-${item.id}`}
                item={item}
                periodValid={periodValid}
                menuOpen={menuId === `r-${item.id}`}
                onToggleMenu={() => setMenuId((m) => (m === `r-${item.id}` ? null : `r-${item.id}`))}
                onPrimary={() => runPrimary(item)}
                onAction={(fmt) => onRequestExport?.(item, fmt)}
                onDeepLink={() => openDeepLink(item)}
                downloadedAgo={formatDownloadedAgo(lastDownloadMap[item.id], now)}
                busy={busyId === item.id}
                anyBusy={Boolean(busyId)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">No reports match your search.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
          {rows.map((row) =>
            row.type === 'pair' ? (
              <PairExportRow
                key={row.pairId}
                row={row}
                periodValid={periodValid}
                menuOpen={menuId === row.pairId}
                onToggleMenu={() => setMenuId((m) => (m === row.pairId ? null : row.pairId))}
                onRequestExport={onRequestExport}
                lastDownloadMap={lastDownloadMap}
                now={now}
                busyId={busyId}
              />
            ) : (
              <ExportRow
                key={row.item.id}
                item={row.item}
                periodValid={periodValid}
                menuOpen={menuId === row.item.id}
                onToggleMenu={() => setMenuId((m) => (m === row.item.id ? null : row.item.id))}
                onPrimary={() => runPrimary(row.item)}
                onAction={(fmt) => onRequestExport?.(row.item, fmt)}
                onDeepLink={() => openDeepLink(row.item)}
                downloadedAgo={formatDownloadedAgo(lastDownloadMap[row.item.id], now)}
                busy={busyId === row.item.id}
                anyBusy={Boolean(busyId)}
              />
            )
          )}
        </ul>
      )}
    </div>
  );
}

function ExportRow({
  item,
  periodValid,
  menuOpen,
  onToggleMenu,
  onPrimary,
  onAction,
  onDeepLink,
  downloadedAgo,
  busy,
  anyBusy,
}) {
  const disabled = !periodValid || anyBusy;
  const Icon = item.icon;
  const coverage = resolvePrintCoverage(item);
  const showPrintPrimary = coverage === 'full';

  return (
    <li className="relative px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="hidden sm:flex p-2 rounded-lg bg-slate-50 text-zarewa-teal border border-slate-100 shrink-0">
          {Icon ? <Icon size={16} strokeWidth={2} /> : <FileSpreadsheet size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <span className="text-ui-xs font-medium text-slate-500 rounded border border-slate-200 px-1.5 py-0.5">
              {item.badge}
            </span>
            {item.monthEndRecommended ? (
              <span className="text-ui-xs font-semibold text-teal-800 bg-teal-50 border border-teal-100 rounded px-1.5 py-0.5">
                Month-end
              </span>
            ) : null}
            <CoverageChip item={item} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.desc}</p>
          {item.deepLink?.label ? (
            <button
              type="button"
              className="mt-1 text-ui-xs font-semibold text-teal-800 hover:underline"
              onClick={onDeepLink}
            >
              {item.deepLink.label} →
            </button>
          ) : null}
          {downloadedAgo ? (
            <p className="text-ui-xs font-semibold text-emerald-700 mt-1">Downloaded · {downloadedAgo}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            disabled={disabled}
            onClick={onPrimary}
            className="z-btn-primary !text-xs !py-2 flex-1 sm:flex-none justify-center min-h-10"
            title={`Export ${item.title}`}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {busy ? 'Working…' : 'Export'}
          </button>
          {showPrintPrimary ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAction('Print')}
              className="z-btn-secondary !text-xs !py-2 flex-1 sm:flex-none justify-center min-h-10"
              title={`Print ${item.title}`}
            >
              <Printer size={14} />
              Print
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={onToggleMenu}
            className="z-btn-secondary !p-2 min-h-10 min-w-10"
            aria-expanded={menuOpen}
            aria-label="More formats"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
      {menuOpen ? (
        <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
          {catalogItemSupportsPrint(item) && !showPrintPrimary ? (
            <button
              type="button"
              disabled={disabled}
              className="z-btn-secondary !text-xs !py-1.5"
              onClick={() => onAction('Print')}
            >
              <Printer size={14} />
              Print preview
            </button>
          ) : null}
          {item.kind === 'api-workbook' ? (
            <button
              type="button"
              disabled={disabled}
              className="z-btn-secondary !text-xs !py-1.5"
              onClick={() => onAction('Excel')}
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
          ) : (
            (item.formats || []).map((fmt) => (
              <button
                key={fmt}
                type="button"
                disabled={disabled}
                className="z-btn-secondary !text-xs !py-1.5"
                onClick={() => onAction(fmt)}
              >
                <FileSpreadsheet size={14} />
                {fmt}
              </button>
            ))
          )}
          <button type="button" className="text-ui-xs font-semibold text-slate-500 px-2" onClick={onToggleMenu}>
            <ChevronDown size={12} className="inline rotate-180" /> Close
          </button>
        </div>
      ) : null}
    </li>
  );
}

function PairExportRow({
  row,
  periodValid,
  menuOpen,
  onToggleMenu,
  onRequestExport,
  lastDownloadMap,
  now,
  busyId,
}) {
  const { official, working, title, desc, icon: Icon } = row;
  const disabled = !periodValid || Boolean(busyId);
  const busy = busyId === official.id || busyId === working.id;
  const printItem = printItemForPair(official, working);
  const printCoverage = printItem ? resolvePrintCoverage(printItem) : 'none';
  const showPrintPrimary = printCoverage === 'full';
  const officialAgo = formatDownloadedAgo(lastDownloadMap[official.id], now);
  const workingAgo = formatDownloadedAgo(lastDownloadMap[working.id], now);

  return (
    <li className="relative px-3 py-3 sm:px-4 bg-slate-50/40">
      <div className="flex flex-wrap items-center gap-3">
        <div className="hidden sm:flex p-2 rounded-lg bg-white text-zarewa-teal border border-slate-100 shrink-0">
          {Icon ? <Icon size={16} strokeWidth={2} /> : <FileSpreadsheet size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <span className="text-ui-xs font-medium text-slate-500 rounded border border-slate-200 px-1.5 py-0.5">
              Official + working paper
            </span>
            {printItem ? <CoverageChip item={printItem} /> : null}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{desc}</p>
          <p className="text-ui-xs text-slate-500 mt-1">
            {official.title}
            {officialAgo ? ` · ${officialAgo}` : ''}
            {' · '}
            {working.title}
            {workingAgo ? ` · ${workingAgo}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRequestExport?.(official, 'Excel')}
            className="z-btn-primary !text-xs !py-2 flex-1 sm:flex-none justify-center min-h-10"
            title={`Export ${official.title}`}
          >
            {busy && busyId === official.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Official
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRequestExport?.(working, primaryFormat(working))}
            className="z-btn-secondary !text-xs !py-2 flex-1 sm:flex-none justify-center min-h-10"
            title={`Export ${working.title}`}
          >
            {busy && busyId === working.id ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            Working
          </button>
          {showPrintPrimary && printItem ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRequestExport?.(printItem, 'Print')}
              className="z-btn-secondary !text-xs !py-2 flex-1 sm:flex-none justify-center min-h-10"
              title={`Print ${printItem.title}`}
            >
              <Printer size={14} />
              Print
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={onToggleMenu}
            className="z-btn-secondary !p-2 min-h-10 min-w-10"
            aria-expanded={menuOpen}
            aria-label="More formats"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
      {menuOpen ? (
        <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-slate-100 bg-white p-2">
          {printItem && !showPrintPrimary ? (
            <button
              type="button"
              disabled={disabled}
              className="z-btn-secondary !text-xs !py-1.5"
              onClick={() => onRequestExport?.(printItem, 'Print')}
            >
              <Printer size={14} />
              Print preview
            </button>
          ) : null}
          {(working.formats || ['Excel', 'CSV']).map((fmt) => (
            <button
              key={`w-${fmt}`}
              type="button"
              disabled={disabled}
              className="z-btn-secondary !text-xs !py-1.5"
              onClick={() => onRequestExport?.(working, fmt)}
            >
              <FileSpreadsheet size={14} />
              Working · {fmt}
            </button>
          ))}
          <button
            type="button"
            disabled={disabled}
            className="z-btn-secondary !text-xs !py-1.5"
            onClick={() => onRequestExport?.(official, 'Excel')}
          >
            <FileSpreadsheet size={14} />
            Official · Excel
          </button>
          <button type="button" className="text-ui-xs font-semibold text-slate-500 px-2" onClick={onToggleMenu}>
            <ChevronDown size={12} className="inline rotate-180" /> Close
          </button>
        </div>
      ) : null}
    </li>
  );
}
