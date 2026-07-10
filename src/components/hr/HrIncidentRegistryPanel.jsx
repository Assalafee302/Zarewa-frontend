import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchIncidents } from '../../lib/hrIncidents';
import HrIncidentRegistryDetailModal from './HrIncidentRegistryDetailModal';
import { HR_BTN_SECONDARY, HR_CARD, HR_FIELD_CLASS, HR_MUTED, HR_SECTION_TITLE } from './hrPageUi';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

const KIND_LABELS = {
  hr_discipline: 'HR discipline',
  operational: 'Operational',
  material: 'Material',
  performance: 'Performance',
};

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (['closed', 'posted', 'completed'].includes(s)) return 'bg-emerald-100 text-emerald-800';
  if (['cancelled', 'voided', 'rejected'].includes(s)) return 'bg-slate-100 text-slate-600';
  if (['critical', 'high'].includes(s)) return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-900';
}

function resolveCaseId(incident) {
  if (incident.incidentKind === 'hr_discipline') return incident.sourceId;
  const linked = Array.isArray(incident.linkedEntities) ? incident.linkedEntities : [];
  const caseLink = linked.find((e) => e.kind === 'hr_discipline_case');
  return caseLink?.id || null;
}

export default function HrIncidentRegistryPanel({ onOpenCase, focusRegistryId, onFocusHandled }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [kind, setKind] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  const [detailId, setDetailId] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    const filters = {};
    if (kind) filters.kind = kind;
    if (openOnly) filters.openOnly = '1';
    const { ok, data } = await fetchIncidents(filters);
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not load incident registry.');
      setRows([]);
      return;
    }
    setRows(data.incidents || []);
  }, [kind, openOnly]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = String(focusRegistryId || '').trim();
    if (!id || busy) return;
    setDetailId(id);
    onFocusHandled?.(id);
  }, [focusRegistryId, busy, onFocusHandled]);

  const kindOptions = useMemo(
    () => [
      { value: '', label: 'All kinds' },
      ...Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label })),
    ],
    []
  );

  return (
    <div className={HR_CARD}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h3 className={HR_SECTION_TITLE}>Incident registry</h3>
          <p className={HR_MUTED}>Unified view across HR discipline, operational, material, and performance incidents.</p>
        </div>
        <button type="button" className={HR_BTN_SECONDARY} onClick={load} disabled={busy}>
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-xs font-semibold text-slate-600">
          Kind
          <select className={`${HR_FIELD_CLASS} mt-1 min-w-[160px]`} value={kind} onChange={(e) => setKind(e.target.value)}>
            {kindOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-5">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
          Open only
        </label>
      </div>

      {err ? <p className="text-sm text-red-700 mb-3">{err}</p> : null}
      {!rows.length && !busy ? <p className="text-sm text-slate-500">No incidents match these filters.</p> : null}

      {rows.length ? (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Registry ID</AppTableTh>
                <AppTableTh>Kind</AppTableTh>
                <AppTableTh>Summary</AppTableTh>
                <AppTableTh>Severity</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                <AppTableTh>Updated</AppTableTh>
                <AppTableTh />
            </AppTableThead>
            <AppTableBody>
              {rows.map((r) => {
                const caseId = resolveCaseId(r);
                return (
                  <AppTableTr key={r.id} className="cursor-pointer hover:bg-slate-50/80" onClick={() => setDetailId(r.id)}>
                    <AppTableTd className="font-mono text-xs">{r.id}</AppTableTd>
                    <AppTableTd className="text-xs">{KIND_LABELS[r.incidentKind] || r.incidentKind}</AppTableTd>
                    <AppTableTd className="max-w-xs truncate" title={r.summary}>{r.summary || '—'}</AppTableTd>
                    <AppTableTd className="text-xs capitalize">{r.severity || '—'}</AppTableTd>
                    <AppTableTd>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(r.status)}`}>
                        {r.status || '—'}
                      </span>
                    </AppTableTd>
                    <AppTableTd className="text-xs whitespace-nowrap">{r.updatedAtIso?.slice(0, 10) || '—'}</AppTableTd>
                    <AppTableTd onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="text-xs font-semibold text-slate-700 hover:underline text-left"
                          onClick={() => setDetailId(r.id)}
                        >
                          View
                        </button>
                        {caseId && onOpenCase ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-teal-800 hover:underline text-left"
                            onClick={() => onOpenCase(caseId)}
                          >
                            Open case
                          </button>
                        ) : null}
                      </div>
                    </AppTableTd>
                  </AppTableTr>
                );
              })}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : null}

      {detailId ? (
        <HrIncidentRegistryDetailModal
          registryId={detailId}
          onClose={() => setDetailId('')}
          onOpenCase={onOpenCase}
        />
      ) : null}
    </div>
  );
}
