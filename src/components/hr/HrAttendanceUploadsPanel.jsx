import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { currentPeriodYyyymm } from '../../lib/hrRequests';
import { formatPayrollPeriodLabel } from '../../lib/hrPayroll';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS, HR_TEXTAREA_CLASS } from './hrFormStyles';
import { ProfileFormField } from '../profile/profileFormUi';
import { ProfileInlineAlert, ProfileOverviewSection } from '../profile/profileOverviewUi';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

const SAMPLE_ROWS = `[
  { "userId": "USR-001", "absentDays": 2, "minutesLate": 45 },
  { "userId": "USR-002", "absentDays": 0, "minutesLate": 0 }
]`;

function periodInputValue(yyyymm) {
  const s = String(yyyymm || '');
  if (s.length !== 6) return '';
  return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
}

function periodFromInput(val) {
  return String(val || '').replace('-', '');
}

/**
 * HQ attendance spreadsheet upload — persists to hr_attendance_uploads and events.
 */
export function HrAttendanceUploadsPanel() {
  const ws = useWorkspace();
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return Array.isArray(list) ? list : [];
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const defaultBranch = String(ws?.session?.branchId || ws?.workspaceBranchId || branches[0]?.id || '').trim();
  const [branchId, setBranchId] = useState(defaultBranch);
  const [period, setPeriod] = useState(currentPeriodYyyymm());
  const [notes, setNotes] = useState('');
  const [rowsJson, setRowsJson] = useState(SAMPLE_ROWS);
  const [uploads, setUploads] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadUploads = useCallback(async () => {
    const { ok, data } = await apiFetch('/api/hr/attendance/uploads');
    if (!ok || !data?.ok) return { error: data?.error || 'Could not list uploads.', hasData: false };
    setUploads(data.uploads || []);
    return { hasData: true };
  }, []);

  const { loading, error: listError, reload } = useHrListLoad(loadUploads, []);

  useEffect(() => {
    if (defaultBranch && !branchId) setBranchId(defaultBranch);
  }, [defaultBranch, branchId]);

  const submit = async () => {
    setError('');
    setMessage('');
    let rows;
    try {
      rows = JSON.parse(rowsJson);
      if (!Array.isArray(rows)) throw new Error('Rows must be a JSON array.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON for attendance rows.');
      return;
    }
    setBusy(true);
    const { ok, data } = await apiFetch('/api/hr/attendance/uploads', {
      method: 'POST',
      body: JSON.stringify({
        branchId,
        periodYyyymm: period,
        notes: notes.trim() || undefined,
        rows: rows.map((r) => ({
          userId: String(r.userId || '').trim(),
          absentDays: Number(r.absentDays) || 0,
          minutesLate: Number(r.minutesLate) || 0,
        })),
      }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Upload failed.');
      return;
    }
    setMessage(`Attendance upload ${data.id} saved.`);
    void reload();
  };

  return (
    <div className="space-y-6">
      <ProfileOverviewSection
        title="Upload monthly attendance"
        subtitle="Paste a JSON array of userId, absentDays, and minutesLate per staff member for the branch payroll month."
      >
        {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}
        {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <ProfileFormField label="Branch">
            <select className={HR_FIELD_CLASS} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.id}
                </option>
              ))}
            </select>
          </ProfileFormField>
          <ProfileFormField label="Payroll month">
            <input
              type="month"
              className={HR_FIELD_CLASS}
              value={periodInputValue(period)}
              onChange={(e) => setPeriod(periodFromInput(e.target.value) || currentPeriodYyyymm())}
            />
          </ProfileFormField>
          <ProfileFormField label="Notes" className="sm:col-span-2">
            <input className={HR_FIELD_CLASS} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional upload note" />
          </ProfileFormField>
          <ProfileFormField label="Rows (JSON)" className="sm:col-span-2" hint="Each row: userId, absentDays, minutesLate">
            <textarea className={HR_TEXTAREA_CLASS} rows={8} value={rowsJson} onChange={(e) => setRowsJson(e.target.value)} />
          </ProfileFormField>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={HR_BTN_PRIMARY} disabled={busy || !branchId} onClick={() => void submit()}>
            {busy ? 'Uploading…' : 'Upload attendance'}
          </button>
          <button type="button" className={HR_BTN_SECONDARY} onClick={() => setRowsJson(SAMPLE_ROWS)}>
            Reset sample
          </button>
        </div>
      </ProfileOverviewSection>

      <ProfileOverviewSection title="Recent uploads" subtitle="Latest attendance sheets imported for your scope">
        {listError ? <ProfileInlineAlert variant="error">{listError}</ProfileInlineAlert> : null}
        {loading && !uploads.length ? <p className="text-sm text-slate-500">Loading uploads…</p> : null}
        {!loading && !uploads.length ? (
          <p className="text-sm text-slate-500">No attendance uploads yet for your branch scope.</p>
        ) : (
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTr>
                  <AppTableTh>ID</AppTableTh>
                  <AppTableTh>Branch</AppTableTh>
                  <AppTableTh>Period</AppTableTh>
                  <AppTableTh align="right">Rows</AppTableTh>
                  <AppTableTh>Uploaded</AppTableTh>
                </AppTableTr>
              </AppTableThead>
              <AppTableBody>
                {uploads.map((u) => (
                  <AppTableTr key={u.id}>
                    <AppTableTd className="font-mono text-xs">{u.id}</AppTableTd>
                    <AppTableTd>{u.branchId}</AppTableTd>
                    <AppTableTd>{formatPayrollPeriodLabel(u.periodYyyymm)}</AppTableTd>
                    <AppTableTd align="right">{Array.isArray(u.rows) ? u.rows.length : 0}</AppTableTd>
                    <AppTableTd>{u.createdAtIso?.slice(0, 16).replace('T', ' ') || '—'}</AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        )}
      </ProfileOverviewSection>
    </div>
  );
}
