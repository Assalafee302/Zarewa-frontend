import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { canViewHrReports, canViewOrgSensitiveHr } from '../../lib/hrAccess';
import {
  REPORT_CATEGORY_LABELS,
  downloadHrReport,
  fetchHrReportCatalog,
  fetchHrReportPreview,
} from '../../lib/hrReportsCatalog';
import { HrCard, HrEmptyState } from './hrPageUi';
import { HrReportFilterPanel } from './HrReportFilterPanel';
import { HrResponsiveTable } from './HrResponsiveTable';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrFormStyles';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';

function ExportButton({ label, format, disabled, disabledReason, onClick, busy }) {
  return (
    <button
      type="button"
      title={disabled ? disabledReason : undefined}
      disabled={disabled || busy}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${
        disabled ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-200 text-[#134e4a] hover:bg-slate-50'
      }`}
    >
      {busy ? '…' : label}
    </button>
  );
}

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

  const selectedMeta = useMemo(
    () => catalog?.reports?.find((r) => r.id === selectedId),
    [catalog, selectedId]
  );

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

  const printPreview = () => {
    if (!preview) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${preview.title}</title></head><body style="font-family:Arial,sans-serif;padding:24px">`);
    w.document.write(`<h1>Zarewa Aluminium & Plastics Ltd</h1><h2>${preview.title}</h2>`);
    w.document.write(`<p><small>${preview.filtersSummary} · ${preview.totalCount} records · ${preview.generatedAtIso?.slice(0, 19)}</small></p>`);
    w.document.write('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px"><tr>');
    preview.columns.forEach((c) => { w.document.write(`<th>${c.label}</th>`); });
    w.document.write('</tr>');
    preview.rows.slice(0, 200).forEach((row) => {
      w.document.write('<tr>');
      preview.columns.forEach((c) => { w.document.write(`<td>${row[c.key] ?? ''}</td>`); });
      w.document.write('</tr>');
    });
    w.document.write('</table></body></html>');
    w.document.close();
    w.print();
  };

  if (!canReports) {
    return <HrEmptyState title="Reports not available" description="You do not have permission to view HR reports." />;
  }

  const byCategory = catalog?.byCategory || {};
  const showPeriod = selectedMeta?.filters?.includes('periodYyyymm');
  const showStatus = selectedMeta?.filters?.includes('status');
  const showEmploymentType = selectedMeta?.filters?.includes('employmentType');
  const sensitiveBlocked = selectedMeta?.sensitive && !canSensitive;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
      <aside className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Report picker</p>
        {Object.entries(byCategory).map(([cat, reports]) => (
          <div key={cat}>
            <p className="mb-1 text-xs font-bold text-[#134e4a]">{REPORT_CATEGORY_LABELS[cat] || cat}</p>
            <ul className="space-y-0.5">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full rounded-lg px-2 py-1.5 text-left text-xs ${
                      selectedId === r.id ? 'bg-[#134e4a] text-white font-semibold' : 'text-slate-700 hover:bg-slate-50'
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
            showPeriod={showPeriod}
            showStatus={showStatus}
            showEmploymentType={showEmploymentType}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={HR_BTN_PRIMARY} onClick={loadPreview} disabled={loading || sensitiveBlocked}>
              {loading ? 'Loading…' : 'Refresh preview'}
            </button>
            <ExportButton label="CSV" format="csv" disabled={sensitiveBlocked} disabledReason="Requires payroll sensitive permission" onClick={() => runExport('csv')} busy={exportBusy === 'csv'} />
            <ExportButton
              label="Excel"
              format="xlsx"
              disabled={sensitiveBlocked || selectedMeta?.xlsx === false}
              disabledReason={selectedMeta?.xlsx === false ? 'Excel not available for this report' : 'Requires payroll sensitive permission'}
              onClick={() => runExport('xlsx')}
              busy={exportBusy === 'xlsx'}
            />
            <ExportButton
              label="PDF"
              format="pdf"
              disabled={sensitiveBlocked || selectedMeta?.pdf === false}
              disabledReason={selectedMeta?.pdf === false ? 'PDF not available for this report' : 'Requires payroll sensitive permission'}
              onClick={() => runExport('pdf')}
              busy={exportBusy === 'pdf'}
            />
            <button type="button" className={HR_BTN_SECONDARY} onClick={printPreview} disabled={!preview || sensitiveBlocked}>
              Print
            </button>
          </div>
          {sensitiveBlocked ? (
            <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              This report contains payroll-sensitive data. Unlock sensitive HR or use a role with payroll view permission.
            </p>
          ) : null}
          {error ? (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
              <button type="button" className="ml-2 underline" onClick={loadPreview}>Retry</button>
            </div>
          ) : null}
        </HrCard>

        {preview ? (
          <HrCard
            title="Preview"
            subtitle={`${preview.totalCount} record(s) · ${preview.filtersSummary}`}
          >
            <p className="mb-3 text-[10px] text-slate-500 uppercase tracking-wide">
              Generated {preview.generatedAtIso?.slice(0, 19).replace('T', ' ')}
              {preview.generatedBy ? ` by ${preview.generatedBy}` : ''}
            </p>
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
                <Link to={HR_EMPLOYEES} className="font-bold text-[#134e4a] hover:underline">employee profiles</Link>
                {' '}via the staff directory.
              </p>
            ) : null}
          </HrCard>
        ) : loading ? (
          <p className="text-sm text-slate-600">Loading report preview…</p>
        ) : null}
      </div>
    </div>
  );
}

export default HrReportsHub;
