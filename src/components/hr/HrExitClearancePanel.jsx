import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { hrHasPermission } from '../../lib/hrAccess';
import {
  adminClearHrExit,
  fetchHrExitClearance,
  fetchHrExitClearanceOne,
  financeClearHrExit,
  hrFinalClearHrExit,
  patchHrExitPropertyItem,
} from '../../lib/hrPhase2';
import { HrCard, HrEmptyState, HrStatusPill } from './hrPageUi';
import { HrFormModal } from './HrFormModal';
import { HrExitInterviewPanel } from './HrExitInterviewPanel';
import { navigateToHrLetter } from '../../lib/hrLetterDeepLink';
import { canGenerateHrLetters } from '../../lib/hrAccess';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import {
  AppTable, AppTableBody, AppTableTd, AppTableTh, AppTableThead, AppTableTr, AppTableWrap,
} from '../ui/AppDataTable';

export function HrExitClearancePanel() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const perms = ws?.session?.permissions || ws?.permissions || [];
  const [clearances, setClearances] = useState([]);
  const [detail, setDetail] = useState(null);
  const [modal, setModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const canFinance = hrHasPermission(perms, 'hr.exit.finance_clear');
  const canAdmin = hrHasPermission(perms, 'hr.exit.admin_clear');
  const canFinal = hrHasPermission(perms, 'hr.exit.final_clear');
  const canInterview = hrHasPermission(perms, 'hr.exit.manage') || hrHasPermission(perms, 'hr.staff.manage');
  const canLetter = canGenerateHrLetters(perms);

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrExitClearance({});
    if (!ok || !data?.ok) {
      setClearances([]);
      return { error: data?.error || 'Could not load exit clearance.', hasData: false };
    }
    setClearances(data.clearances || []);
    return { hasData: true };
  }, []);

  const openDetail = async (id) => {
    const { ok, data } = await fetchHrExitClearanceOne(id);
    if (ok && data?.ok) {
      setDetail(data.clearance);
      setModal(true);
    }
  };

  const toggleItem = async (item, patch) => {
    if (!detail) return;
    setBusy(true);
    await patchHrExitPropertyItem(detail.id, item.id, patch);
    const res = await fetchHrExitClearanceOne(detail.id);
    if (res.ok && res.data?.ok) setDetail(res.data.clearance);
    setBusy(false);
  };

  const runClear = async (kind) => {
    if (!detail) return;
    setBusy(true);
    const fn = kind === 'finance' ? financeClearHrExit : kind === 'admin' ? adminClearHrExit : hrFinalClearHrExit;
    const { ok, data } = await fn(detail.id, { notes });
    setBusy(false);
    if (ok && data?.ok) {
      setDetail(data.clearance);
      await reload();
    }
  };

  return (
    <HrCard title="Exit clearance & property return">
      {error ? <div className="mb-3 text-sm text-red-800">{error}</div> : null}
      {loading && !clearances.length ? <p className="text-sm text-slate-600">Loading…</p> : clearances.length === 0 ? (
        <HrEmptyState title="No exit clearance workflows in progress." description="Initiate a separation to start clearance." />
      ) : (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Staff</AppTableTh>
                <AppTableTh>Last day</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                <AppTableTh />
            </AppTableThead>
            <AppTableBody>
              {clearances.map((c) => (
                <AppTableTr key={c.id}>
                  <AppTableTd>{c.displayName}</AppTableTd>
                  <AppTableTd>{c.lastWorkingDayIso}</AppTableTd>
                  <AppTableTd><HrStatusPill status={c.status} /></AppTableTd>
                  <AppTableTd>
                    <button type="button" className="text-[10px] font-bold uppercase text-[#134e4a]" onClick={() => openDetail(c.id)}>Open</button>
                  </AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      )}

      <HrFormModal isOpen={modal} onClose={() => setModal(false)} title="Exit clearance detail" size="lg">
        {detail ? (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <p className="text-sm text-slate-700">{detail.displayName} — {detail.separationType} — LWD {detail.lastWorkingDayIso}</p>
            {(detail.outstandingLoans || []).length ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Outstanding loans: {detail.outstandingLoans.map((l) => `NGN ${l.principalOutstandingNgn?.toLocaleString()}`).join(', ')}
              </div>
            ) : null}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Property checklist</p>
              <ul className="space-y-2">
                {(detail.propertyItems || []).map((it) => (
                  <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs">
                    <span>{it.itemName}</span>
                    <div className="flex gap-2">
                      <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={() => toggleItem(it, { returned: true })}>Returned</button>
                      <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={() => toggleItem(it, { waived: true, waivedNote: 'Waived by HR' })}>Waive</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <HrExitInterviewPanel clearanceId={detail.id} userId={detail.userId} canEdit={canInterview} />
            <textarea className={HR_FIELD_CLASS} rows={2} placeholder="Clearance notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {canLetter ? (
                <>
                  <button type="button" className={HR_BTN_SECONDARY} onClick={() => navigateToHrLetter(navigate, { letterKind: 'exit_clearance', userId: detail.userId, sourceRecordId: detail.id })}>Exit clearance letter</button>
                  <button type="button" className={HR_BTN_SECONDARY} onClick={() => navigateToHrLetter(navigate, { letterKind: 'return_of_property', userId: detail.userId, sourceRecordId: detail.id })}>Return of property</button>
                </>
              ) : null}
              {canFinance && !detail.financeClearedByUserId ? (
                <button type="button" className={HR_BTN_PRIMARY} disabled={busy} onClick={() => runClear('finance')}>Finance clear</button>
              ) : null}
              {canAdmin && detail.financeClearedByUserId && !detail.adminClearedByUserId ? (
                <button type="button" className={HR_BTN_PRIMARY} disabled={busy} onClick={() => runClear('admin')}>Admin / IT clear</button>
              ) : null}
              {canFinal && detail.adminClearedByUserId && detail.status !== 'completed' ? (
                <button type="button" className={HR_BTN_PRIMARY} disabled={busy} onClick={() => runClear('final')}>HR final clearance</button>
              ) : null}
              <a href={`/api/hr/exit-clearance/${encodeURIComponent(detail.id)}/pdf`} className={HR_BTN_SECONDARY} target="_blank" rel="noreferrer">PDF</a>
            </div>
          </div>
        ) : null}
      </HrFormModal>
    </HrCard>
  );
}
