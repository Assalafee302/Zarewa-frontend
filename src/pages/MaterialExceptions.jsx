import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus, Printer, ShieldCheck } from 'lucide-react';
import { PageHeader, PageShell } from '../components/layout';
import { ZareApprovalHint } from '../components/ZareApprovalHint';
import OperationsCoilControlTab from '../components/operations/OperationsCoilControlTab';
import MaterialIncidentPrintView from '../components/material/MaterialIncidentPrintView';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import {
  INCIDENT_TYPES,
  INCIDENT_STATUS_LABEL,
  MATERIAL_FAMILIES,
  RETURN_DISPOSITIONS,
} from '../lib/materialIncidentConstants';
import { AppTable, AppTableBody, AppTableTh, AppTableThead, AppTableTr, AppTableWrap } from '../components/ui/AppDataTable';

const emptyLine = () => ({ lengthM: '', quantity: '1', conditionNote: '' });

const defaultForm = () => ({
  incidentType: 'coil_stain',
  materialFamily: 'aluminium',
  productId: '',
  gaugeLabel: '',
  colour: '',
  coilNo: '',
  quotationRef: '',
  cuttingListRef: '',
  productionJobId: '',
  customerLabel: '',
  returnDisposition: 'offcut_pool',
  beforeKg: '',
  afterKg: '',
  storekeeperDisplay: '',
  operatorDisplay: '',
  storekeeperRemark: '',
  reasonText: '',
  dateISO: new Date().toISOString().slice(0, 10),
  lines: [emptyLine()],
});

export default function MaterialExceptions({ embedded = false, initialView = 'register', focusIncidentId = '' }) {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const { products, coilLots, materialIncidents, materialPoolSummary, refreshInventory } = useInventory();
  const [view, setView] = useState(initialView);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [printPayload, setPrintPayload] = useState(null);
  const [managerRemark, setManagerRemark] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const canApprove =
    ws?.user?.roleKey === 'sales_manager' ||
    ws?.user?.roleKey === 'md' ||
    ws?.user?.roleKey === 'admin' ||
    ws?.permissions?.includes?.('material_incidents.approve');

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const { ok, data } = await apiFetch(`/api/material-incidents${q}`);
      if (ok && Array.isArray(data?.rows)) setRows(data.rows);
      else if (Array.isArray(materialIncidents)) setRows(materialIncidents);
    } catch {
      if (Array.isArray(materialIncidents)) setRows(materialIncidents);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, materialIncidents]);

  useEffect(() => {
    loadList();
  }, [loadList, ws?.refreshEpoch]);

  useEffect(() => {
    const id = String(focusIncidentId || '').trim();
    if (!id) return;
    setView('pending');
    void loadDetail(id);
  }, [focusIncidentId]);

  const loadDetail = async (id) => {
    const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}`);
    if (ok && data?.incident) {
      setDetail(data.incident);
      setSelectedId(id);
    }
  };

  const buildPayload = () => ({
    incidentType: form.incidentType,
    materialFamily: form.materialFamily,
    productID: form.productId,
    gaugeLabel: form.gaugeLabel,
    colour: form.colour,
    coilNo: form.coilNo,
    quotationRef: form.quotationRef,
    cuttingListRef: form.cuttingListRef,
    productionJobId: form.productionJobId,
    customerLabel: form.customerLabel,
    returnDisposition: form.returnDisposition,
    beforeKg: form.beforeKg !== '' ? Number(form.beforeKg) : null,
    afterKg: form.afterKg !== '' ? Number(form.afterKg) : null,
    storekeeperDisplay: form.storekeeperDisplay,
    operatorDisplay: form.operatorDisplay,
    storekeeperRemark: form.storekeeperRemark,
    reasonText: form.reasonText,
    dateISO: form.dateISO,
    lines: form.lines.map((ln) => ({
      lengthM: Number(ln.lengthM),
      quantity: Number(ln.quantity) || 1,
      conditionNote: ln.conditionNote,
    })),
  });

  const saveDraft = async () => {
    if (!ws?.canMutate) return showToast('Workspace is read-only.', { variant: 'error' });
    setSaving(true);
    try {
      const path = selectedId ? `/api/material-incidents/${encodeURIComponent(selectedId)}` : '/api/material-incidents';
      const method = selectedId ? 'PATCH' : 'POST';
      const { ok, data } = await apiFetch(path, { method, body: JSON.stringify(buildPayload()) });
      if (!ok) throw new Error(data?.error || 'Save failed');
      const id = data?.id || data?.incident?.id || selectedId;
      setSelectedId(id);
      showToast(`Incident ${id} saved.`);
      await loadList();
      if (refreshInventory) refreshInventory();
    } catch (e) {
      showToast(e.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const submitIncident = async (id) => {
    const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/submit`, { method: 'POST' });
    if (!ok) return showToast(data?.error || 'Submit failed', { variant: 'error' });
    showToast('Submitted for branch manager approval.');
    loadList();
    loadDetail(id);
  };

  const approveIncident = async (id) => {
    const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ managerRemark }),
    });
    if (!ok) return showToast(data?.error || 'Approve failed', { variant: 'error' });
    showToast('Approved and posted to stock.');
    setManagerRemark('');
    loadList();
    loadDetail(id);
    if (refreshInventory) refreshInventory();
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
            onClick={() => setView(t.id)}
            className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wide ${
              view === t.id ? 'bg-[#134e4a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'register' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-[10px] font-bold uppercase text-slate-500">Status</label>
            <select
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
                    <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500">
                      {loading ? 'Loading…' : 'No incidents yet.'}
                    </td>
                  </AppTableTr>
                ) : (
                  rows.map((r) => (
                    <AppTableTr key={r.id}>
                      <td className="px-3 py-2 text-xs">{r.dateISO}</td>
                      <td className="px-3 py-2 text-xs font-mono font-semibold">{r.id}</td>
                      <td className="px-3 py-2 text-xs">{r.incidentType}</td>
                      <td className="px-3 py-2 text-[10px]">
                        {r.quotationRef || '—'}
                        {r.productionJobId ? ` · ${r.productionJobId}` : ''}
                      </td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums">{Number(r.totalMeters || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums">
                        {Number(r.metersAvailable || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs">{INCIDENT_STATUS_LABEL[r.status] || r.status}</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" className="text-[10px] font-bold text-sky-800 underline" onClick={() => loadDetail(r.id)}>
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
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Record stain, production error, customer return, or yard offcut. Submit for branch manager approval before
            stock is updated. Print the document for your physical offcut book.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Type</span>
              <select
                className="z-input w-full mt-1"
                value={form.incidentType}
                onChange={(e) => setForm((f) => ({ ...f, incidentType: e.target.value }))}
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Material family</span>
              <select
                className="z-input w-full mt-1"
                value={form.materialFamily}
                onChange={(e) => setForm((f) => ({ ...f, materialFamily: e.target.value }))}
              >
                {MATERIAL_FAMILIES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {form.incidentType === 'customer_return' ? (
              <label className="block sm:col-span-2">
                <span className="text-[10px] font-bold uppercase text-gray-400">Return disposition</span>
                <select
                  className="z-input w-full mt-1"
                  value={form.returnDisposition}
                  onChange={(e) => setForm((f) => ({ ...f, returnDisposition: e.target.value }))}
                >
                  {RETURN_DISPOSITIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Date</span>
              <input
                type="date"
                className="z-input w-full mt-1"
                value={form.dateISO}
                onChange={(e) => setForm((f) => ({ ...f, dateISO: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Product ID</span>
              <input
                className="z-input w-full mt-1"
                value={form.productId}
                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                list="mex-products"
              />
              <datalist id="mex-products">
                {(products || []).slice(0, 80).map((p) => (
                  <option key={p.productID} value={p.productID}>
                    {p.name}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Gauge</span>
              <input className="z-input w-full mt-1" value={form.gaugeLabel} onChange={(e) => setForm((f) => ({ ...f, gaugeLabel: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Colour</span>
              <input className="z-input w-full mt-1" value={form.colour} onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Coil no.</span>
              <input
                className="z-input w-full mt-1"
                value={form.coilNo}
                onChange={(e) => setForm((f) => ({ ...f, coilNo: e.target.value }))}
                list="mex-coils"
              />
              <datalist id="mex-coils">
                {coilLots.slice(0, 100).map((c) => (
                  <option key={c.coilNo} value={c.coilNo} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Quotation</span>
              <input className="z-input w-full mt-1" value={form.quotationRef} onChange={(e) => setForm((f) => ({ ...f, quotationRef: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Production job</span>
              <input className="z-input w-full mt-1" value={form.productionJobId} onChange={(e) => setForm((f) => ({ ...f, productionJobId: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Before kg</span>
              <input className="z-input w-full mt-1" value={form.beforeKg} onChange={(e) => setForm((f) => ({ ...f, beforeKg: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">After kg</span>
              <input className="z-input w-full mt-1" value={form.afterKg} onChange={(e) => setForm((f) => ({ ...f, afterKg: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Storekeeper</span>
              <input className="z-input w-full mt-1" value={form.storekeeperDisplay} onChange={(e) => setForm((f) => ({ ...f, storekeeperDisplay: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-gray-400">Operator</span>
              <input className="z-input w-full mt-1" value={form.operatorDisplay} onChange={(e) => setForm((f) => ({ ...f, operatorDisplay: e.target.value }))} />
            </label>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Roll / section lines</p>
            {form.lines.map((ln, idx) => (
              <div key={idx} className="flex flex-wrap gap-2 mb-2">
                <input
                  className="z-input w-24"
                  placeholder="Length m"
                  value={ln.lengthM}
                  onChange={(e) =>
                    setForm((f) => {
                      const lines = [...f.lines];
                      lines[idx] = { ...lines[idx], lengthM: e.target.value };
                      return { ...f, lines };
                    })
                  }
                />
                <input
                  className="z-input w-16"
                  placeholder="Qty"
                  value={ln.quantity}
                  onChange={(e) =>
                    setForm((f) => {
                      const lines = [...f.lines];
                      lines[idx] = { ...lines[idx], quantity: e.target.value };
                      return { ...f, lines };
                    })
                  }
                />
                <input
                  className="z-input flex-1 min-w-[8rem]"
                  placeholder="Condition"
                  value={ln.conditionNote}
                  onChange={(e) =>
                    setForm((f) => {
                      const lines = [...f.lines];
                      lines[idx] = { ...lines[idx], conditionNote: e.target.value };
                      return { ...f, lines };
                    })
                  }
                />
              </div>
            ))}
            <button type="button" className="text-[10px] font-bold text-[#134e4a]" onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }))}>
              + Add line
            </button>
          </div>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-gray-400">Reason / notes</span>
            <textarea className="z-input w-full mt-1 min-h-[4rem]" value={form.reasonText} onChange={(e) => setForm((f) => ({ ...f, reasonText: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-gray-400">Storekeeper remark</span>
            <textarea className="z-input w-full mt-1 min-h-[3rem]" value={form.storekeeperRemark} onChange={(e) => setForm((f) => ({ ...f, storekeeperRemark: e.target.value }))} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="z-btn-primary" disabled={saving} onClick={saveDraft}>
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            {selectedId ? (
              <>
                <button type="button" className="z-btn-secondary" onClick={() => submitIncident(selectedId)}>
                  Submit for approval
                </button>
                <button type="button" className="z-btn-secondary inline-flex items-center gap-1" onClick={() => openPrint(selectedId)}>
                  <Printer size={14} /> Print
                </button>
              </>
            ) : null}
          </div>
        </section>
      )}

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
          {pendingRows.map((r) => (
            <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-mono font-bold text-sm">{r.id}</p>
                <p className="text-xs text-slate-600">
                  {r.incidentType} · {r.totalMeters} m · {r.gaugeLabel} {r.colour}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <input
                  className="z-input text-xs min-w-[12rem]"
                  placeholder="Manager remark"
                  value={managerRemark}
                  onChange={(e) => setManagerRemark(e.target.value)}
                />
                <button type="button" className="z-btn-primary text-xs" onClick={() => approveIncident(r.id)}>
                  Approve & post
                </button>
                <button type="button" className="z-btn-secondary text-xs" onClick={() => openPrint(r.id)}>
                  Print
                </button>
              </div>
            </div>
          ))}
          {pendingRows.length === 0 ? <p className="text-xs text-slate-500">No pending approvals.</p> : null}
        </section>
      )}

      {view === 'pool' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#134e4a] mb-2">
            Pool available: {Number(materialPoolSummary?.totalMetersAvailable ?? 0).toFixed(2)} m
            <span className="text-slate-500 font-normal text-xs ml-2">
              (incidents {Number(materialPoolSummary?.incidentMetersAvailable ?? 0).toFixed(2)} + legacy{' '}
              {Number(materialPoolSummary?.legacyPoolMetersAvailable ?? 0).toFixed(2)})
            </span>
          </p>
          <ul className="space-y-2 text-xs">
            {poolIncidents.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-slate-100 py-2">
                <span className="font-mono font-semibold">{p.id}</span>
                <span>
                  {p.gaugeLabel} {p.colour} — {Number(p.metersAvailable).toFixed(2)} m
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === 'legacy' && <OperationsCoilControlTab />}

      {detail ? (
        <section className="rounded-xl border border-sky-200 bg-sky-50/30 p-4 text-xs space-y-2">
          <p className="font-bold text-[#134e4a]">Detail: {detail.id}</p>
          <p>Status: {INCIDENT_STATUS_LABEL[detail.status] || detail.status}</p>
          <div className="flex gap-2">
            <button type="button" className="z-btn-secondary text-xs" onClick={() => openPrint(detail.id)}>
              Print
            </button>
            {detail.status === 'submitted' && canApprove ? (
              <button type="button" className="z-btn-primary text-xs" onClick={() => approveIncident(detail.id)}>
                Approve
              </button>
            ) : null}
            {detail.incidentType === 'customer_return' && detail.customerId ? (
              <button
                type="button"
                className="z-btn-secondary text-xs"
                onClick={async () => {
                  const amount = window.prompt('Refund amount (NGN)?', '0');
                  if (!amount) return;
                  const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(detail.id)}/create-refund`, {
                    method: 'POST',
                    body: JSON.stringify({
                      customerID: detail.customerId,
                      amountNgn: Number(amount),
                      payeeName: detail.customerLabel,
                      payeeAccountNo: '0000000000',
                      payeeBankName: 'TBD',
                      reasonCategory: ['Product return'],
                    }),
                  });
                  if (ok) showToast(`Refund ${data.refundID} created.`);
                  else showToast(data?.error || 'Refund failed', { variant: 'error' });
                }}
              >
                Create refund request
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );

  if (embedded) return content;

  return (
    <PageShell>
      <PageHeader
        title="Material exceptions"
        subtitle="Offcut control, returns, stains, and production losses — branch manager approval required."
        icon={<ClipboardList className="text-[#134e4a]" />}
        actions={
          <Link to="/operations" className="z-btn-secondary text-xs no-underline">
            Back to operations
          </Link>
        }
      />
      {content}
      {printPayload ? (
        <>
          <button
            type="button"
            aria-label="Close print"
            className="no-print fixed inset-0 z-[10000] bg-black/50"
            onClick={() => setPrintPayload(null)}
          />
          <div className="print-portal-scroll fixed inset-0 z-[10001] overflow-y-auto p-4 sm:p-8">
            <div className="mx-auto max-w-3xl">
              <MaterialIncidentPrintView payload={printPayload} />
              <div className="no-print mt-4 flex justify-center gap-2">
                <button type="button" className="z-btn-primary" onClick={() => window.print()}>
                  Print / Save PDF
                </button>
                <button type="button" className="z-btn-secondary" onClick={() => setPrintPayload(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </PageShell>
  );
}
