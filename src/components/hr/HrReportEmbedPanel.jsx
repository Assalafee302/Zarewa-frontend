import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canViewHrReports, canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { fetchHrReportCatalog, fetchHrReportPreview } from '../../lib/hrReportsCatalog';
import { hrTabPath, HR_DOCUMENTS } from '../../lib/hrRoutes';
import { HrResponsiveTable } from './HrResponsiveTable';
import { ProfileInlineAlert } from '../profile/profileOverviewUi';
import { HR_BTN_SECONDARY } from './hrFormStyles';

/**
 * Inline report preview for HR documents hub tabs (no full report picker).
 */
export function HrReportEmbedPanel({ reportId, title, description, limit = 25 }) {
  const ws = useWorkspace();
  const perms = ws?.session?.permissions || ws?.permissions || [];
  const canReports = canViewHrReports(perms);
  const canSensitive = canViewOrgSensitiveHr(perms);
  const [preview, setPreview] = useState(null);
  const [reportMeta, setReportMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canReports || !reportId) return;
    fetchHrReportCatalog().then(({ ok, data }) => {
      if (!ok || !data?.reports) return;
      setReportMeta(data.reports.find((r) => r.id === reportId) || null);
    });
  }, [canReports, reportId]);

  const load = useCallback(async () => {
    if (!canReports || !reportId) return;
    setLoading(true);
    setError('');
    const { ok, data } = await fetchHrReportPreview(reportId, {});
    setLoading(false);
    if (!ok || !data?.ok) {
      setPreview(null);
      setError(data?.error || 'Could not load report preview.');
      return;
    }
    setPreview(data);
  }, [canReports, reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canReports) {
    return (
      <ProfileInlineAlert variant="warning">
        You do not have permission to view HR reports. Ask an HR administrator for <span className="font-mono">hr.reports.view</span>.
      </ProfileInlineAlert>
    );
  }

  const sensitiveBlocked = reportMeta?.sensitive && !canSensitive;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-bold text-[#134e4a]">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading preview…</p> : null}
      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}
      {sensitiveBlocked ? (
        <ProfileInlineAlert variant="warning">This report contains sensitive payroll data. Unlock org-sensitive HR access to preview.</ProfileInlineAlert>
      ) : null}
      {preview && !sensitiveBlocked ? (
        <>
          <p className="text-[11px] text-slate-500">
            {preview.filtersSummary || 'All staff'} · {preview.totalCount ?? preview.rows?.length ?? 0} records
          </p>
          <HrResponsiveTable
            columns={preview.columns || []}
            rows={(preview.rows || []).slice(0, limit)}
            emptyMessage="No records match current filters."
          />
          {(preview.totalCount ?? 0) > limit ? (
            <p className="text-[11px] text-slate-500">Showing first {limit} of {preview.totalCount} records.</p>
          ) : null}
        </>
      ) : null}
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <button type="button" className={HR_BTN_SECONDARY} onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
        <Link
          to={hrTabPath(HR_DOCUMENTS, 'reports', { report: reportId })}
          className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-[#134e4a] no-underline hover:bg-slate-50"
        >
          Open full report →
        </Link>
      </div>
    </div>
  );
}
