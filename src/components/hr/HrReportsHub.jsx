import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { InlineLoader } from '../../components/ui/PageLoader';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { canViewHrReports, canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { fetchHrDepartments } from '../../lib/hrMasterData';
import {
  HR_PRINT_ROW_LIMIT,
  REPORT_CATEGORY_LABELS,
  downloadHrReport,
  fetchHrReportCatalog,
  fetchHrReportPreview,
} from '../../lib/hrReportsCatalog';
import { HrCard, HrEmptyState, HrButton } from './hrPageUi';
import { HrReportFilterPanel } from './HrReportFilterPanel';
import { HrResponsiveTable } from './HrResponsiveTable';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { ReportPrintModal } from '../reports/ReportPrintModal';

function ExportButton({ label, disabled, disabledReason, onClick, busy }) {
  return (
    <button
      type="button"
      title={disabled ? disabledReason : undefined}
      disabled={disabled || busy}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-ui-xs font-bold uppercase tracking-wide ${
        disabled ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-200 text-zarewa-teal hover:bg-slate-50'
      }`}
    >
      {busy ? '…' : label}
    </button>
  );
}

const CATEGORY_ORDER = [
  'employee',
  'attendance',
  'leave',
  'payroll',
  'development',
  'discipline',
  'transfers',
  'compliance',
  'executive',
];

export function HrReportsHub() {
  const ws = useWorkspace();
  const { show: toast } = useToast();
  const [searchParams] = useSearchParams();
  const perms = ws?.session?.permissions || ws?.permissions || [];
  const canReports = canViewHrReports(perms);
  const canSensitive = canViewOrgSensitiveHr(perms);

  const [catalog, setCatalog] = useState(null);
  const [selectedId, setSelectedId] = useState('employee-master');
  const [filters, setFilters] = useState({});
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportBusy, setExportBusy] = useState('');
  const [printOpen, setPrintOpen] = useState(false);
  const [departments, setDepartments] = useState([]);

  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws]);

  useEffect(() => {
    if (!canReports) return;
    fetchHrReportCatalog().then(({ ok, data }) => {
      if (ok && data?.reports) setCatalog(data);
    });
    const urlReport = searchParams.get('report');
    const pre = urlReport || sessionStorage.getItem('hrReportPreselect');
    if (pre) {
      setSelectedId(pre);
      sessionStorage.removeItem('hrReportPreselect');
    }
  }, [canReports, searchParams]);

  useEffect(() => {
    if (!canReports) return;
    fetchHrDepartments(false).then(({ ok, data }) => {
      if (ok && data?.ok && Array.isArray(data.departments)) {
        setDepartments(
          data.departments.map((d) => (typeof d === 'string' ? d : d.name || d.id)).filter(Boolean)
        );
      }
    });
  }, [canReports]);

  const selectedMeta = useMemo(
    () => catalog?.reports?.find((r) => r.id === selectedId),
    [catalog, selectedId]
  );

  const filterKeys = selectedMeta?.filters || [];

  const loadPreview = useCallback(async () => {
    if (!selectedId || !canReports) return;
    setLoading(true);
    setError('');
    const { ok, data } = await fetchHrReportPreview(selectedId, filters);
    setLoading(false);
    if (!ok || !data?.ok) {
      setPreview(null);
      setError(data?.error || 'Could not load report preview.');
      return;
    }
    setPreview(data);
  }, [selectedId, filters, canReports]);

  useEffect(() => {
    if (selectedId) loadPreview();
  }, [selectedId, loadPreview]);

  const runExport = async (format) => {
    setExportBusy(format);
    const r = await downloadHrReport(selectedId, format, filters);
    setExportBusy('');
    if (!r.ok) {
      toast(r.error || 'Export failed.', { variant: 'error' });
      return;
    }
    toast(`Downloaded ${r.filename}`, { variant: 'success' });
  };

  const printRows = useMemo(() => {
    if (!preview?.rows) return [];
    return preview.rows.slice(0, HR_PRINT_ROW_LIMIT);
  }, [preview]);

  const printTruncated = Boolean(
    preview && (preview.totalCount > printRows.length || preview.rows.length > printRows.length)
  );

  const openPrint = () => {
    if (!preview) return;
    if (printTruncated) {
      toast(
        `Print includes first ${HR_PRINT_ROW_LIMIT} of ${preview.totalCount} rows. Export Excel/CSV for the full set.`,
        { variant: 'warning' }
      );
    }
    setPrintOpen(true);
  };

  if (!canReports) {
    return <HrEmptyState title="Reports not available" description="You do not have permission to view HR reports." />;
  }

  const byCategory = catalog?.byCategory || {};
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => byCategory[c]?.length),
    ...Object.keys(byCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const showBranch = filterKeys.includes('branch');
  const showDepartment = filterKeys.includes('department');
  const showDateRange = filterKeys.includes('fromIso') || filterKeys.includes('toIso');
  const showPeriod = filterKeys.includes('periodYyyymm');
  const showStatus = filterKeys.includes('status');
  const showEmploymentType = filterKeys.includes('employmentType');
  const sensitiveBlocked = selectedMeta?.sensitive && !canSensitive;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
      <aside className="space-y-4">
        <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Report picker</p>
        {orderedCategories.map((cat) => (
          <div key={cat}>
            <p className="mb-1 text-xs font-bold text-zarewa-teal">{REPORT_CATEGORY_LABELS[cat] || cat}</p>
            <ul className="space-y-0.5">
              {(byCategory[cat] || []).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full rounded-lg px-2 py-1.5 text-left text-xs ${
                      selectedId === r.id ? 'bg-zarewa-teal text-white font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {r.label}
                    {r.priority ? <span className="ml-1 opacity-70">★</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      <div className="space-y-4 min-w-0">
        <HrCard title={preview?.title || selectedMeta?.label || 'Report preview'}>
          <HrReportFilterPanel
            filters={filters}
            onChange={setFilters}
            branches={branches}
            departments={departments}
            showBranch={showBranch}
            showDepartment={showDepartment}
            showDateRange={showDateRange}
            showPeriod={showPeriod}
            showStatus={showStatus}
            showEmploymentType={showEmploymentType}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <HrButton type="button" onClick={loadPreview} disabled={loading || sensitiveBlocked}>
              {loading ? 'Loading…' : 'Refresh preview'}
            </HrButton>
            <ExportButton
              label="CSV"
              disabled={sensitiveBlocked}
              disabledReason="Requires payroll sensitive permission"
              onClick={() => runExport('csv')}
              busy={exportBusy === 'csv'}
            />
            <ExportButton
              label="Excel"
              disabled={sensitiveBlocked || selectedMeta?.xlsx === false}
              disabledReason={
                selectedMeta?.xlsx === false ? 'Excel not available for this report' : 'Requires payroll sensitive permission'
              }
              onClick={() => runExport('xlsx')}
              busy={exportBusy === 'xlsx'}
            />
            <ExportButton
              label="PDF"
              disabled={sensitiveBlocked || selectedMeta?.pdf === false}
              disabledReason={
                selectedMeta?.pdf === false
                  ? 'PDF not available for this report'
                  : 'Requires payroll sensitive permission'
              }
              onClick={() => runExport('pdf')}
              busy={exportBusy === 'pdf'}
            />
            <HrButton type="button" variant="secondary" onClick={openPrint} disabled={!preview || sensitiveBlocked}>
              Print
            </HrButton>
          </div>
          {selectedMeta?.pdf !== false ? (
            <p className="mt-2 text-xs text-slate-500">
              PDF download is a simple text file. For a table layout use <strong>Print → Save as PDF</strong>.
            </p>
          ) : null}
          {sensitiveBlocked ? (
            <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              This report contains payroll-sensitive data. Unlock sensitive HR or use a role with payroll view permission.
            </p>
          ) : null}
          {error ? (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
              <button type="button" className="ml-2 underline" onClick={loadPreview}>
                Retry
              </button>
            </div>
          ) : null}
        </HrCard>

        {preview ? (
          <HrCard title="Preview" subtitle={`${preview.totalCount} record(s) · ${preview.filtersSummary}`}>
            <p className="mb-3 text-ui-xs text-slate-500 uppercase tracking-wide">
              Generated {preview.generatedAtIso?.slice(0, 19).replace('T', ' ')}
              {preview.generatedBy ? ` by ${preview.generatedBy}` : ''}
            </p>
            {printTruncated ? (
              <p className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Preview/print shows up to {HR_PRINT_ROW_LIMIT} rows ({preview.totalCount} total). Export Excel or CSV for
                the full report.
              </p>
            ) : null}
            <HrResponsiveTable
              columns={preview.columns}
              rows={preview.rows.map((row) => {
                const userId = row.userId || row.user_id;
                const fixLink =
                  row.fixLink ||
                  (userId && selectedId?.includes('import')
                    ? `${HR_EMPLOYEES}/${encodeURIComponent(userId)}?tab=personal`
                    : userId && selectedId?.includes('policy')
                      ? `${HR_EMPLOYEES}/${encodeURIComponent(userId)}?tab=policies`
                      : userId && selectedId?.includes('document')
                        ? `${HR_EMPLOYEES}/${encodeURIComponent(userId)}?tab=documents`
                        : null);
                return {
                  ...row,
                  deepLink: row.deepLink || (userId ? `${HR_EMPLOYEES}/${encodeURIComponent(userId)}` : null),
                  fixLink,
                  fixLabel: row.fixLabel || (fixLink ? 'Fix in profile' : undefined),
                };
              })}
              emptyMessage="No records for this filter."
            />
            {preview.rows.some((r) => r.userId) ? (
              <p className="mt-2 text-xs text-slate-500">
                Rows with staff names link to{' '}
                <Link to={HR_EMPLOYEES} className="font-bold text-zarewa-teal hover:underline">
                  employee profiles
                </Link>{' '}
                via the staff directory.
              </p>
            ) : null}
          </HrCard>
        ) : loading ? (
          <InlineLoader message="Loading report preview…" />
        ) : null}
      </div>

      <ReportPrintModal
        isOpen={printOpen && Boolean(preview)}
        onClose={() => setPrintOpen(false)}
        title={preview?.title || selectedMeta?.label || 'HR report'}
        periodLabel={preview?.filtersSummary || ''}
        columns={preview?.columns || []}
        rows={printRows}
        documentTypeLabel="HR report"
        layout="landscape"
        summaryLines={[
          { label: 'Records in print', value: String(printRows.length) },
          { label: 'Total matching filter', value: String(preview?.totalCount ?? 0) },
          printTruncated
            ? {
                label: 'Note',
                value: `Truncated to ${HR_PRINT_ROW_LIMIT} rows — export Excel/CSV for the full set.`,
              }
            : null,
        ].filter(Boolean)}
        extraMetaLines={[{ label: 'Company', value: 'Zarewa Aluminium & Plastics Ltd' }]}
      />
    </div>
  );
}

export default HrReportsHub;
