import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Printer } from 'lucide-react';
import { PageHeader, PageShell } from '../components/layout';
import { ZareApprovalHint } from '../components/ZareApprovalHint';
import OperationsCoilControlTab from '../components/operations/OperationsCoilControlTab';
import MaterialIncidentDetailModal from '../components/material/MaterialIncidentDetailModal';
import MaterialIncidentPrintPortal from '../components/material/MaterialIncidentPrintPortal';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import {
  INCIDENT_TYPES,
  INCIDENT_STATUS_LABEL,
  INCIDENT_RECORD_HINTS,
} from '../lib/materialIncidentConstants';
import { coilDamagePreview, isCoilDamageIncident } from '../lib/coilDamageRecordCore';
import CoilDamageRecordModal from '../components/operations/CoilDamageRecordModal';
import { fmtConv2 } from '../lib/conversionKgPerM';
import { useMaterialIncidentsQuery } from '../hooks/useMaterialIncidentsQuery';
import { AppTable, AppTableBody, AppTableTh, AppTableThead, AppTableTr, AppTableWrap } from '../components/ui/AppDataTable';

const defaultForm = () => ({
  incidentType: 'coil_stain',
});

function incidentTypeLabel(type) {
  return INCIDENT_TYPES.find((t) => t.id === type)?.label || type;
}

export default function MaterialExceptions({ embedded = false, initialView = 'register', focusIncidentId = '' }) {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const { coilLots, materialIncidents, materialPoolSummary, refreshInventory } = useInventory();
  const [view, setView] = useState(initialView);
  const [form, setForm] = useState(defaultForm);
  const [printPayload, setPrintPayload] = useState(null);
  const [managerRemarks, setManagerRemarks] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [coilDamageModalOpen, setCoilDamageModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailIncidentId, setDetailIncidentId] = useState('');

  const canApprove =
    ws?.hasPermission?.('material_incidents.approve') ||
    ['sales_manager', 'md', 'admin', 'branch_manager', 'operations_manager'].includes(
      String(ws?.user?.roleKey || '').trim().toLowerCase()
    );

  const fallbackRows = useMemo(
    () => (Array.isArray(materialIncidents) ? materialIncidents : []),
    [materialIncidents]
  );
  const { rows, loading, reload: loadList } = useMaterialIncidentsQuery(statusFilter, {
    fallbackRows,
  });

  const openIncident = (id) => {
    const trimmed = String(id || '').trim();
    if (!trimmed) return;
    setDetailIncidentId(trimmed);
    setDetailModalOpen(true);
  };

  useEffect(() => {
    const id = String(focusIncidentId || '').trim();
    if (!id) return;
    setView('pending');
    openIncident(id);
  }, [focusIncidentId]);

  const closeIncidentModal = () => {
    setDetailModalOpen(false);
    setDetailIncidentId('');
  };

  const openRecordModal = (incidentType = form.incidentType) => {
    setForm((f) => ({ ...f, incidentType }));
    setCoilDamageModalOpen(true);
  };

  const approveIncident = async (id) => {
    const remark = String(managerRemarks[id] || '').trim();
    if (remark.length < 3) {
      return showToast('Enter an approval remark (at least 3 characters).', { variant: 'warning' });
    }
    const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ managerRemark: remark }),
    });
    if (!ok) return showToast(data?.error || 'Approve failed', { variant: 'error' });
    showToast('Approved and posted to stock.');
    setManagerRemarks((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
    loadList();
    openIncident(id);
    if (refreshInventory) refreshInventory();
    await ws?.refresh?.();
  };

  const rejectIncident = async (id) => {
    const remark = String(managerRemarks[id] || '').trim();
    if (remark.length < 3) return showToast('Enter a rejection reason (at least 3 characters).', { variant: 'error' });
    const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ managerRemark: remark }),
    });
    if (!ok) return showToast(data?.error || 'Reject failed', { variant: 'error' });
    showToast('Incident rejected.');
    setManagerRemarks((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
    loadList();
    openIncident(id);
    await ws?.refresh?.();
  };

  const openPrint = async (id) => {
    const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/print-payload`);
    if (!ok || !data?.payload) return showToast(data?.error || 'Print data unavailable', { variant: 'error' });
    setPrintPayload(data.payload);
  };

  const pendingRows = useMemo(() => rows.filter((r) => r.status === 'submitted'), [rows]);
  const poolIncidents = materialPoolSummary?.incidents ?? rows.filter((r) => r.status === 'posted' && (r.metersAvailable ?? 0) > 0);

  const content = (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'register', label: 'Register' },
          { id: 'new', label: 'New incident' },
          { id: 'pending', label: `Pending (${pendingRows.length})` },
          { id: 'pool', label: 'Offcut pool' },
          { id: 'legacy', label: 'Legacy coil control' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setView(t.id);
              if (t.id === 'new') openRecordModal(form.incidentType);
            }}
            className={`rounded-full px-4 py-2 text-ui-xs font-black uppercase tracking-wide ${
              view === t.id ? 'bg-zarewa-teal text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'register' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label htmlFor="incident-status-filter" className="text-ui-xs font-bold uppercase text-slate-500">
              Status
            </label>
            <select
              id="incident-status-filter"
              className="z-input text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              {Object.entries(INCIDENT_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button type="button" className="z-btn-secondary text-xs" onClick={loadList} disabled={loading}>
              Refresh
            </button>
          </div>
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <tr>
                  <AppTableTh>Date</AppTableTh>
                  <AppTableTh>Incident</AppTableTh>
                  <AppTableTh>Type</AppTableTh>
                  <AppTableTh>QTN / Job</AppTableTh>
                  <AppTableTh align="right">Total m</AppTableTh>
                  <AppTableTh align="right">Avail m</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh />
                </tr>
              </AppTableThead>
              <AppTableBody>
                {rows.length === 0 ? (
                  <AppTableTr>
                    <td colSpan={8} className="px-3 py-8 text-center">
                      {loading ? (
                        <span className="text-xs text-slate-500">Loading…</span>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500">No incidents yet.</p>
                          <button type="button" className="z-btn-primary text-xs" onClick={() => openRecordModal()}>
                            Record material incident
                          </button>
                        </div>
                      )}
                    </td>
                  </AppTableTr>
                ) : (
                  rows.map((r) => (
                    <AppTableTr key={r.id}>
                      <td className="px-3 py-2 text-xs">{r.dateISO}</td>
                      <td className="px-3 py-2 text-xs font-mono font-semibold">{r.id}</td>
                      <td className="px-3 py-2 text-xs">{incidentTypeLabel(r.incidentType)}</td>
                      <td className="px-3 py-2 text-ui-xs">
                        {r.quotationRef || '—'}
                        {r.productionJobId ? ` · ${r.productionJobId}` : ''}
                      </td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums">{Number(r.totalMeters || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums">
                        {Number(r.metersAvailable || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs">{INCIDENT_STATUS_LABEL[r.status] || r.status}</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" className="text-ui-xs font-bold text-sky-800 underline" onClick={() => openIncident(r.id)}>
                          Open
                        </button>
                      </td>
                    </AppTableTr>
                  ))
                )}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        </section>
      )}

      {view === 'new' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            Record stain, production error, customer return, or yard offcut. Submit for branch manager approval before
            stock is updated. Print the document for your physical offcut book.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-ui-xs font-bold uppercase text-gray-400">Type</span>
              <select
                className="z-input w-full mt-1"
                value={form.incidentType}
                onChange={(e) => openRecordModal(e.target.value)}
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-5 space-y-3">
            <p className="text-sm font-semibold text-zarewa-teal">{incidentTypeLabel(form.incidentType)}</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {INCIDENT_RECORD_HINTS[form.incidentType] || INCIDENT_RECORD_HINTS.coil_stain}
            </p>
            <button type="button" className="z-btn-primary" onClick={() => openRecordModal()}>
              Open incident form
            </button>
          </div>
        </section>
      )}

      <CoilDamageRecordModal
        isOpen={coilDamageModalOpen}
        onClose={() => setCoilDamageModalOpen(false)}
        coilLots={coilLots}
        incidentType={form.incidentType}
        onIncidentTypeChange={(next) => setForm((f) => ({ ...f, incidentType: next }))}
        onSuccess={() => {
          loadList();
          refreshInventory?.();
        }}
      />

      {view === 'pending' && (
        <section className="space-y-3">
          {!canApprove ? (
            <ZareApprovalHint
              context={{
                documentType: 'material_incident',
                status: 'submitted',
                canApprove: false,
                missingPermission: 'Material incident approval requires branch manager or operations authority.',
                zareQuery: 'Why can’t I approve material incidents?',
              }}
            />
          ) : null}
          {pendingRows.map((r) => {
            const coilDamage = isCoilDamageIncident(r);
            const preview = coilDamage
              ? coilDamagePreview({
                  beforeKg: r.beforeKg,
                  afterKg: r.afterKg,
                  meters: r.totalMeters,
                  supplierConversionKgPerM: r.conversionKgPerM,
                })
              : null;
            return (
              <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-mono font-bold text-sm">{r.id}</p>
                    <p className="text-xs text-slate-600">
                      {INCIDENT_TYPES.find((t) => t.id === r.incidentType)?.label || r.incidentType} ·{' '}
                      {Number(r.totalMeters || 0).toFixed(2)} m · {r.gaugeLabel} {r.colour}
                      {r.coilNo ? ` · coil ${r.coilNo}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="z-btn-secondary text-xs h-fit" onClick={() => openIncident(r.id)}>
                      Open
                    </button>
                    <button type="button" className="z-btn-secondary text-xs h-fit" onClick={() => openPrint(r.id)}>
                      Print
                    </button>
                  </div>
                </div>
                {coilDamage && preview?.kgDeducted != null ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <span className="text-ui-xs font-bold uppercase text-slate-400">Before kg</span>
                      <p className="font-mono font-bold">{r.beforeKg != null ? Number(r.beforeKg).toFixed(0) : '—'}</p>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <span className="text-ui-xs font-bold uppercase text-slate-400">After kg</span>
                      <p className="font-mono font-bold">{r.afterKg != null ? Number(r.afterKg).toFixed(0) : '—'}</p>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <span className="text-ui-xs font-bold uppercase text-slate-400">Kg removed</span>
                      <p className="font-mono font-bold">{preview.kgDeducted.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <span className="text-ui-xs font-bold uppercase text-slate-400">Conversion</span>
                      <p className="font-mono font-bold">{fmtConv2(preview.actualConversionKgPerM, { suffix: 'kg/m' })}</p>
                    </div>
                  </div>
                ) : null}
                {r.storekeeperRemark ? (
                  <p className="text-xs text-slate-600">{r.storekeeperRemark}</p>
                ) : null}
                {canApprove ? (
                  <div className="flex flex-wrap gap-2 items-end">
                    <input
                      className="z-input text-xs min-w-[12rem] flex-1"
                      placeholder="Manager remark (required to reject)"
                      value={managerRemarks[r.id] || ''}
                      onChange={(e) => setManagerRemarks((s) => ({ ...s, [r.id]: e.target.value }))}
                    />
                    <button type="button" className="z-btn-primary text-xs" onClick={() => approveIncident(r.id)}>
                      Approve & post
                    </button>
                    <button type="button" className="z-btn-secondary text-xs" onClick={() => rejectIncident(r.id)}>
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {pendingRows.length === 0 ? <p className="text-xs text-slate-500">No pending approvals.</p> : null}
        </section>
      )}

      {view === 'pool' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-zarewa-teal mb-2">
            Pool available: {Number(materialPoolSummary?.totalMetersAvailable ?? 0).toFixed(2)} m
            <span className="text-slate-500 font-normal text-xs ml-2">
              (incidents {Number(materialPoolSummary?.incidentMetersAvailable ?? 0).toFixed(2)} + legacy{' '}
              {Number(materialPoolSummary?.legacyPoolMetersAvailable ?? 0).toFixed(2)})
            </span>
          </p>
          <ul className="space-y-2 text-xs">
            {poolIncidents.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-slate-100 py-2">
                <button
                  type="button"
                  className="font-mono font-semibold text-sky-800 underline underline-offset-2 text-left"
                  onClick={() => openIncident(p.id)}
                >
                  {p.id}
                </button>
                <span>
                  {p.gaugeLabel} {p.colour} — {Number(p.metersAvailable).toFixed(2)} m
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === 'legacy' && <OperationsCoilControlTab />}

      <MaterialIncidentDetailModal
        isOpen={detailModalOpen}
        onClose={closeIncidentModal}
        incidentId={detailIncidentId}
        canApprove={canApprove}
        managerRemark={managerRemarks[detailIncidentId] || ''}
        onManagerRemarkChange={(v) => setManagerRemarks((s) => ({ ...s, [detailIncidentId]: v }))}
        onApprove={approveIncident}
        onReject={rejectIncident}
        onPrint={openPrint}
        onUpdated={() => {
          loadList();
          refreshInventory?.();
        }}
      />
      <MaterialIncidentPrintPortal payload={printPayload} onClose={() => setPrintPayload(null)} />
    </div>
  );

  if (embedded) return content;

  return (
    <PageShell>
      <PageHeader
        title="Material exceptions"
        subtitle="Offcut control, returns, stains, and production losses — branch manager approval required."
        icon={<ClipboardList className="text-zarewa-teal" />}
        actions={
          <Link to="/operations" className="z-btn-secondary text-xs no-underline">
            Back to operations
          </Link>
        }
      />
      {content}
    </PageShell>
  );
}
