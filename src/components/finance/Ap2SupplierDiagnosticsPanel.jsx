import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, RefreshCw, ShieldAlert } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { useAp2SupplierDiagnostics } from '../../hooks/useAp2SupplierDiagnostics';
import { FinanceActionButton } from './FinanceActionButton';
import { FinanceDataTable } from './FinanceDataTable';
import { FinanceEmptyState } from './FinanceEmptyState';
import { FinanceOperationalLinks } from './FinanceOperationalLinks';
import { FinanceReportPanel } from './FinanceReportPanel';

const BRANCH_OPTIONS = [
  { id: 'ALL', label: 'All branches' },
  { id: 'BR-KD', label: 'Kaduna (HQ)' },
  { id: 'BR-YL', label: 'Yola' },
  { id: 'BR-MDG', label: 'Maiduguri' },
];

function defaultPeriodKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function MetricCard({ label, value, hint, tone = 'slate' }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50/70',
    rose: 'border-rose-200 bg-rose-50/70',
    teal: 'border-teal-200 bg-teal-50/50',
    slate: 'border-slate-200 bg-white',
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-[#134e4a]">{value}</p>
      {hint ? <p className="mt-1 text-xs font-medium text-slate-600">{hint}</p> : null}
    </div>
  );
}

function poSupplierLink(row) {
  const sid = String(row.supplierId || '').trim();
  if (sid) {
    return (
      <Link
        to={`/procurement/suppliers/${encodeURIComponent(sid)}`}
        className="font-bold text-teal-800 hover:underline"
      >
        {row.supplierName || sid}
      </Link>
    );
  }
  return row.supplierName || '—';
}

/**
 * @param {{
 *   initialBranchId?: string,
 *   compact?: boolean,
 *   autoLoad?: boolean,
 *   enabled?: boolean,
 * }} props
 */
export function Ap2SupplierDiagnosticsPanel({
  initialBranchId = 'ALL',
  compact = false,
  autoLoad = false,
  enabled = true,
}) {
  const [period, setPeriod] = useState(defaultPeriodKey);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchId, setBranchId] = useState(initialBranchId || 'ALL');
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  const branchForApi = branchId === 'ALL' ? 'ALL' : branchId;
  const { data, loading, error, reload } = useAp2SupplierDiagnostics({
    branchId: branchForApi,
    period,
    supplierId: supplierFilter,
    status: statusFilter,
    enabled,
  });

  useEffect(() => {
    if (autoLoad && enabled) void reload();
  }, [autoLoad, enabled, reload]);

  const s = data?.summary || {};
  const notes = data?.notes || [];

  const poTableRows = useMemo(() => {
    const rows = Array.isArray(data?.poRows) ? data.poRows : [];
    const filtered = showDiffOnly
      ? rows.filter((r) => Math.abs(Number(r.apDifferenceNgn) || 0) > 0 || r.flags?.overpaid)
      : rows;
    return filtered.slice(0, compact ? 8 : 50).map((r) => ({
      _key: r.poId,
      po: (
        <Link to="/procurement" state={{ focusTab: 'purchases' }} className="font-mono font-bold text-teal-800 hover:underline">
          {r.poId}
        </Link>
      ),
      supplier: poSupplierLink(r),
      ordered: formatNgn(r.orderedValueNgn),
      received: (
        <span>
          {formatNgn(r.receivedValueNgn)}
          {r.receivedBasis === 'estimated_po_line' ? (
            <span className="ml-1 text-[9px] font-bold text-amber-700">est.</span>
          ) : null}
        </span>
      ),
      paid: formatNgn(r.supplierPaidNgn),
      currentAp: formatNgn(r.currentApNgn),
      expectedAp: formatNgn(r.expectedApNgn),
      diff: (
        <span
          className={
            Math.abs(r.apDifferenceNgn) > 0
              ? 'font-bold text-amber-900'
              : 'text-slate-600'
          }
        >
          {formatNgn(r.apDifferenceNgn)}
        </span>
      ),
      flags: [
        r.flags?.overpaid ? 'Advance risk' : null,
        r.flags?.payableWithoutGrn ? 'AP w/o GRN' : null,
        r.flags?.grnWithoutPayable ? 'GRN w/o AP' : null,
        r.flags?.missingCost ? 'Missing cost' : null,
      ]
        .filter(Boolean)
        .join(' · ') || '—',
    }));
  }, [data?.poRows, showDiffOnly, compact]);

  const supplierRows = useMemo(() => {
    return (Array.isArray(data?.bySupplier) ? data.bySupplier : [])
      .slice(0, compact ? 5 : 30)
      .map((r, i) => ({
        _key: r.supplierId || r.supplierName || i,
        supplier: poSupplierLink(r),
        pos: r.poCount,
        ordered: formatNgn(r.orderedValueNgn),
        received: formatNgn(r.receivedValueNgn),
        paid: formatNgn(r.supplierPaidNgn),
        currentAp: formatNgn(r.currentApNgn),
        expectedAp: formatNgn(r.expectedApNgn),
        advance: formatNgn(r.paidNotReceivedNgn),
      }));
  }, [data?.bySupplier, compact]);

  const diffRows = useMemo(() => {
    return (Array.isArray(data?.poRows) ? data.poRows : [])
      .filter((r) => Math.abs(Number(r.apDifferenceNgn) || 0) > 0)
      .slice(0, 25)
      .map((r) => ({
        _key: `d-${r.poId}`,
        po: r.poId,
        supplier: r.supplierName || '—',
        currentAp: formatNgn(r.currentApNgn),
        expectedAp: formatNgn(r.expectedApNgn),
        diff: formatNgn(r.apDifferenceNgn),
      }));
  }, [data?.poRows]);

  const missingRows = useMemo(() => {
    const samples = data?.samples?.missingCost || [];
    return samples.map((r, i) => ({
      _key: `m-${r.poId}-${i}`,
      po: r.poId,
      supplier: r.supplierName || '—',
      issues: r.issueCount,
      ref: r.sampleRef || '—',
    }));
  }, [data?.samples?.missingCost]);

  const exportPoCsv = () => {
    const raw = Array.isArray(data?.poRows) ? data.poRows : [];
    downloadFinanceCsv(
      'ap2-po-ordered-received-paid',
      [
        'poId',
        'supplierName',
        'orderedValueNgn',
        'receivedValueNgn',
        'supplierPaidNgn',
        'currentApNgn',
        'expectedApNgn',
        'apDifferenceNgn',
      ],
      raw.map((r) => ({
        poId: r.poId,
        supplierName: r.supplierName,
        orderedValueNgn: r.orderedValueNgn,
        receivedValueNgn: r.receivedValueNgn,
        supplierPaidNgn: r.supplierPaidNgn,
        currentApNgn: r.currentApNgn,
        expectedApNgn: r.expectedApNgn,
        apDifferenceNgn: r.apDifferenceNgn,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 px-4 py-3 text-sm font-medium text-amber-950 leading-relaxed flex gap-2">
        <ShieldAlert size={18} className="shrink-0 mt-0.5" />
        <span>
          System-calculated diagnostic. Head of Accounts should review before AP basis is changed. No payable or
          inventory values were modified.
        </span>
      </div>

      {!compact ? <FinanceOperationalLinks /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#134e4a]">Supplier, GRN &amp; payables</p>
            <p className="text-sm font-medium text-slate-600 mt-1">
              Ordered commitment vs received goods vs payments vs current AP. Management diagnostic — not AP rebuild.
            </p>
          </div>
          <FinanceActionButton variant="primary" onClick={() => reload()} disabled={loading || !enabled}>
            <RefreshCw size={14} className={`mr-1 inline ${loading ? 'animate-spin' : ''}`} />
            Load diagnostics
          </FinanceActionButton>
        </div>

        {!compact ? (
          <div className="flex flex-wrap gap-3 items-end border-b border-slate-100 pb-4">
            <label className="text-xs font-bold text-slate-600">
              Branch
              <select
                className="ml-2 rounded-lg border px-2 py-1 text-sm font-medium"
                value={branchId || 'ALL'}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Period
              <input
                type="month"
                className="ml-2 rounded-lg border px-2 py-1 text-sm"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Supplier ID
              <input
                className="ml-2 rounded-lg border px-2 py-1 text-sm w-28"
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                placeholder="optional"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              PO status
              <input
                className="ml-2 rounded-lg border px-2 py-1 text-sm w-28"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="optional"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={showDiffOnly} onChange={(e) => setShowDiffOnly(e.target.checked)} />
              AP difference only
            </label>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm font-medium text-rose-800 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </p>
        ) : null}

        {loading && !data ? (
          <p className="text-sm font-medium text-violet-800">Loading supplier diagnostics…</p>
        ) : null}

        {!data && !loading && !error ? (
          <FinanceEmptyState
            title="No diagnostic loaded"
            description="Choose filters and select Load diagnostics. Supplier payments and GRN receipt remain in Finance Treasury and Procurement."
          />
        ) : null}

        {data?.status === 'diagnostics_only' ? (
          <>
            <p className="text-xs font-medium text-slate-500">
              {data.disclaimer}
              {data.generatedAtISO ? ` · Generated ${new Date(data.generatedAtISO).toLocaleString()}` : ''}
            </p>

            <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
              <MetricCard label="Ordered commitment" value={formatNgn(s.poOrderedValueNgn)} tone="slate" />
              <MetricCard label="Received goods value" value={formatNgn(s.grnReceivedValueNgn)} tone="teal" />
              <MetricCard label="Supplier paid" value={formatNgn(s.supplierPaidNgn)} />
              <MetricCard label="Current payable" value={formatNgn(s.currentApNgn)} />
              <MetricCard
                label="Expected payable from GRN"
                value={formatNgn(s.expectedApReceivedBasisNgn)}
                hint="max(received − paid, 0)"
                tone="teal"
              />
              <MetricCard
                label="AP difference"
                value={formatNgn(s.apDifferenceNgn)}
                hint="current AP − expected"
                tone={Math.abs(s.apDifferenceNgn) > 0 ? 'amber' : 'slate'}
              />
              <MetricCard
                label="Supplier advance risk"
                value={formatNgn(s.paidNotReceivedNgn)}
                hint={`${s.overpaidSupplierCount ?? 0} supplier(s)`}
                tone={(s.paidNotReceivedNgn || 0) > 0 ? 'rose' : 'amber'}
              />
              <MetricCard label="Received but unpaid" value={formatNgn(s.receivedNotPaidNgn)} tone="amber" />
              {!compact ? (
                <>
                  <MetricCard label="Order balance not received" value={formatNgn(s.orderedNotReceivedNgn)} />
                  <MetricCard
                    label="Payable without GRN"
                    value={String(s.payableWithoutGrnCount ?? 0)}
                    tone={(s.payableWithoutGrnCount || 0) > 0 ? 'amber' : 'slate'}
                  />
                  <MetricCard
                    label="GRN without payable"
                    value={String(s.grnWithoutPayableCount ?? 0)}
                    tone={(s.grnWithoutPayableCount || 0) > 0 ? 'amber' : 'slate'}
                  />
                  <MetricCard
                    label="Missing cost"
                    value={String(s.missingCostCount ?? 0)}
                    tone={(s.missingCostCount || 0) > 0 ? 'rose' : 'slate'}
                  />
                </>
              ) : null}
            </div>

            {!compact ? (
              <>
                <FinanceReportPanel
                  title="PO ordered vs received vs paid"
                  description="Procurement commitment compared to GRN value and supplier payments."
                  onLoad={() => reload()}
                  onExport={exportPoCsv}
                >
                  {poTableRows.length ? (
                    <FinanceDataTable
                      columns={[
                        { key: 'po', label: 'PO' },
                        { key: 'supplier', label: 'Supplier' },
                        { key: 'ordered', label: 'Ordered', align: 'right' },
                        { key: 'received', label: 'Received', align: 'right' },
                        { key: 'paid', label: 'Paid', align: 'right' },
                        { key: 'currentAp', label: 'Current AP', align: 'right' },
                        { key: 'expectedAp', label: 'Expected AP', align: 'right' },
                        { key: 'diff', label: 'Difference', align: 'right' },
                        { key: 'flags', label: 'Flags' },
                      ]}
                      rows={poTableRows}
                    />
                  ) : (
                    <FinanceEmptyState title="No PO rows" description="Adjust filters or branch scope." />
                  )}
                </FinanceReportPanel>

                <FinanceReportPanel title="Supplier exposure" description="Aggregated by supplier for the selected scope.">
                  <FinanceDataTable
                    columns={[
                      { key: 'supplier', label: 'Supplier' },
                      { key: 'pos', label: 'POs', align: 'right' },
                      { key: 'ordered', label: 'Ordered', align: 'right' },
                      { key: 'received', label: 'Received', align: 'right' },
                      { key: 'paid', label: 'Paid', align: 'right' },
                      { key: 'currentAp', label: 'Current AP', align: 'right' },
                      { key: 'expectedAp', label: 'Expected AP', align: 'right' },
                      { key: 'advance', label: 'Paid not received', align: 'right' },
                    ]}
                    rows={supplierRows}
                  />
                </FinanceReportPanel>

                <FinanceReportPanel
                  title="AP difference list"
                  description="Where system AP differs from received-goods basis."
                  onExport={() =>
                    downloadFinanceCsv(
                      'ap2-ap-difference',
                      ['poId', 'supplierName', 'currentApNgn', 'expectedApNgn', 'apDifferenceNgn'],
                      diffRows.map((r) => ({
                        poId: r.po,
                        supplierName: r.supplier,
                        currentApNgn: r.currentAp,
                        expectedApNgn: r.expectedAp,
                        apDifferenceNgn: r.diff,
                      }))
                    )
                  }
                >
                  {diffRows.length ? (
                    <FinanceDataTable
                      columns={[
                        { key: 'po', label: 'PO' },
                        { key: 'supplier', label: 'Supplier' },
                        { key: 'currentAp', label: 'Current AP', align: 'right' },
                        { key: 'expectedAp', label: 'Expected', align: 'right' },
                        { key: 'diff', label: 'Difference', align: 'right' },
                      ]}
                      rows={diffRows}
                    />
                  ) : (
                    <FinanceEmptyState title="No AP differences" description="Current AP matches expected for all POs in scope." />
                  )}
                </FinanceReportPanel>

                <FinanceReportPanel
                  title="Missing inventory cost"
                  description="Received stock or PO lines without reliable unit or landed cost."
                >
                  {missingRows.length ? (
                    <FinanceDataTable
                      columns={[
                        { key: 'po', label: 'PO' },
                        { key: 'supplier', label: 'Supplier' },
                        { key: 'issues', label: 'Issues', align: 'right' },
                        { key: 'ref', label: 'Sample ref' },
                      ]}
                      rows={missingRows}
                    />
                  ) : (
                    <FinanceEmptyState title="No missing cost flags" description="Coil landed cost and line prices appear present." />
                  )}
                </FinanceReportPanel>

                <button
                  type="button"
                  onClick={() => setShowTechnical((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-teal-800"
                >
                  <ChevronDown size={14} className={showTechnical ? 'rotate-180' : ''} />
                  {showTechnical ? 'Hide' : 'Show'} policy notes
                </button>
                {showTechnical && notes.length ? (
                  <ul className="list-disc pl-5 text-xs font-medium text-slate-600 space-y-1">
                    {notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
