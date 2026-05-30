import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  LayoutDashboard,
  Factory,
  Pencil,
  ScrollText,
} from 'lucide-react';
import { MainPanel, ModalFrame, PageHeader, PageShell } from '../components/layout';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import { fmtConv2 } from '../lib/conversionKgPerM.js';

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function liveKg(lot) {
  if (lot?.currentWeightKg != null) return Math.max(0, asNum(lot.currentWeightKg));
  if (lot?.qtyRemaining != null) return Math.max(0, asNum(lot.qtyRemaining));
  if (lot?.weightKg != null) return Math.max(0, asNum(lot.weightKg));
  return Math.max(0, asNum(lot?.qtyReceived));
}

function avg(nums) {
  const rows = nums.filter((n) => Number.isFinite(n));
  if (!rows.length) return null;
  return rows.reduce((s, n) => s + n, 0) / rows.length;
}

function toneForAlert(alertState) {
  const s = String(alertState || '').toLowerCase();
  if (s.includes('critical')) return 'text-rose-700 bg-rose-50 border-rose-200';
  if (s.includes('watch')) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-emerald-700 bg-emerald-50 border-emerald-200';
}

function coilKey(v) {
  return String(v || '').trim().toLowerCase();
}

function isoTs(v) {
  const t = Date.parse(String(v || ''));
  return Number.isFinite(t) ? t : 0;
}

function movementTitle(m) {
  const t = String(m?.type || '').toUpperCase();
  if (t.includes('SCRAP')) return 'Scrap posted';
  if (t.includes('RETURN')) return 'Material returned';
  if (t.includes('SPLIT')) return 'Coil split';
  if (t.includes('CONSUMED') || t.includes('PRODUCTION')) return 'Production consumed';
  if (t.includes('RECEIPT') || t.includes('GRN')) return 'Store receipt';
  return m?.type || 'Movement';
}

function canEditCoilLotMasterData(roleKey) {
  const r = String(roleKey || '').trim().toLowerCase();
  return ['admin', 'md', 'sales_manager', 'branch_manager'].includes(r);
}

export default function CoilProfile() {
  const { coilNo: coilNoParam } = useParams();
  const coilNo = decodeURIComponent(String(coilNoParam || '')).trim();
  const coilNoKey = coilKey(coilNo);
  const { coilLots, movements } = useInventory();
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const [actionModal, setActionModal] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [scrapForm, setScrapForm] = useState({ kg: '', meters: '', bookRef: '', reason: 'Damaged edge / offcut', note: '' });
  const [returnForm, setReturnForm] = useState({ kg: '', reason: 'Unused from production', note: '' });
  const [editForm, setEditForm] = useState({
    colour: '',
    gaugeLabel: '',
    materialTypeName: '',
    currentKg: '',
    receivedKg: '',
    stockForm: 'coil',
  });
  const [holdersMeta, setHoldersMeta] = useState(null);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [reconcilingReservation, setReconcilingReservation] = useState(false);

  const coil = useMemo(
    () => coilLots.find((c) => coilKey(c.coilNo) === coilNoKey),
    [coilLots, coilNoKey]
  );

  const mayEditCoilMaster = useMemo(
    () => canEditCoilLotMasterData(ws?.session?.user?.roleKey),
    [ws?.session?.user?.roleKey]
  );

  useEffect(() => {
    if (actionModal !== 'edit' || !coil) return;
    const recv = asNum(coil.weightKg || coil.qtyReceived);
    const cur = liveKg(coil);
    setEditForm({
      colour: String(coil.colour ?? '').trim(),
      gaugeLabel: String(coil.gaugeLabel ?? coil.gauge ?? '').trim(),
      materialTypeName: String(coil.materialTypeName ?? coil.materialType ?? '').trim(),
      currentKg: cur > 0 ? String(cur) : '',
      receivedKg: recv > 0 ? String(recv) : '',
      stockForm: String(coil.stockForm || 'coil').toLowerCase() === 'roll' ? 'roll' : 'coil',
    });
  }, [actionModal, coil]);

  const productionJobCoils = useMemo(
    () => (Array.isArray(ws?.snapshot?.productionJobCoils) ? ws.snapshot.productionJobCoils : []),
    [ws?.snapshot?.productionJobCoils]
  );
  const conversionChecks = useMemo(
    () => (Array.isArray(ws?.snapshot?.productionConversionChecks) ? ws.snapshot.productionConversionChecks : []),
    [ws?.snapshot?.productionConversionChecks]
  );

  const linkedJobs = useMemo(() => productionJobCoils.filter((r) => coilKey(r.coilNo) === coilNoKey), [productionJobCoils, coilNoKey]);

  const refreshProductionHolders = React.useCallback(async () => {
    if (!coil?.coilNo || !ws?.hasWorkspaceData) {
      setHoldersMeta(null);
      return;
    }
    setHoldersLoading(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/coil-lots/${encodeURIComponent(coil.coilNo)}/production-holders`
      );
      if (ok && data?.ok) setHoldersMeta(data);
      else setHoldersMeta(null);
    } catch {
      setHoldersMeta(null);
    } finally {
      setHoldersLoading(false);
    }
  }, [coil?.coilNo, ws?.hasWorkspaceData]);

  useEffect(() => {
    refreshProductionHolders();
  }, [refreshProductionHolders]);
  const linkedChecks = useMemo(
    () => conversionChecks.filter((r) => coilKey(r.coilNo) === coilNoKey),
    [conversionChecks, coilNoKey]
  );
  const linkedCuttingIds = useMemo(() => {
    const s = new Set();
    linkedJobs.forEach((r) => {
      if (r.cuttingListId) s.add(r.cuttingListId);
      if (r.jobID) s.add(r.jobID);
    });
    linkedChecks.forEach((r) => {
      if (r.cuttingListId) s.add(r.cuttingListId);
      if (r.jobID) s.add(r.jobID);
    });
    return [...s];
  }, [linkedJobs, linkedChecks]);
  const linkedCuttingSet = useMemo(() => new Set(linkedCuttingIds), [linkedCuttingIds]);
  const checkByKey = useMemo(() => {
    const latestById = new Map();
    linkedChecks.forEach((c) => {
      const k = String(c.id || `${c.jobID || ''}-${c.cuttingListId || ''}-${c.coilNo || ''}`).trim();
      const prev = latestById.get(k);
      if (!prev) {
        latestById.set(k, c);
        return;
      }
      const prevTs = Math.max(isoTs(prev.atISO), isoTs(prev.createdAtISO));
      const curTs = Math.max(isoTs(c.atISO), isoTs(c.createdAtISO));
      if (curTs >= prevTs) latestById.set(k, c);
    });
    const sortedChecks = [...latestById.values()].sort((a, b) => {
      const aTs = Math.max(isoTs(a.atISO), isoTs(a.createdAtISO));
      const bTs = Math.max(isoTs(b.atISO), isoTs(b.createdAtISO));
      return bTs - aTs;
    });
    const m = new Map();
    sortedChecks.forEach((c) => {
      const k1 = String(c.jobID || '').trim();
      const k2 = String(c.cuttingListId || '').trim();
      if (k1) m.set(k1, c);
      if (k2) m.set(k2, c);
    });
    return m;
  }, [linkedChecks]);

  const jobRows = useMemo(() => {
    const source =
      Array.isArray(holdersMeta?.holders) && holdersMeta.holders.length > 0
        ? holdersMeta.holders
        : linkedJobs;
    return source.map((r) => {
      const opening = asNum(r.openingWeightKg);
      const closing = asNum(r.closingWeightKg);
      const kgUsed = opening > 0 && closing >= 0 && opening >= closing ? opening - closing : null;
      const meters = asNum(r.metersProduced);
      const derivedConv = kgUsed != null && meters > 0 ? kgUsed / meters : null;
      const keyJob = String(r.jobID || '').trim();
      const keyCl = String(r.cuttingListId || '').trim();
      const check = checkByKey.get(keyJob) || checkByKey.get(keyCl) || null;
      const jobStatus = String(r.jobStatus || r.status || '').trim();
      return {
        ...r,
        kgUsed,
        meters,
        actualConv: check?.actualConversionKgPerM ?? derivedConv,
        standardConv: check?.standardConversionKgPerM ?? null,
        supplierConv: check?.supplierConversionKgPerM ?? null,
        status: jobStatus || (linkedCuttingSet.has(keyCl) ? 'Linked' : ''),
        jobStatus,
      };
    });
  }, [linkedJobs, checkByKey, linkedCuttingSet, holdersMeta?.holders]);

  const movementRows = useMemo(() => {
    const id = coilNo.toLowerCase();
    return (movements || [])
      .filter((m) => {
        const blob = `${m.ref || ''} ${m.detail || ''} ${m.coilNo || ''}`.toLowerCase();
        return blob.includes(id);
      })
      .slice(0, 120);
  }, [movements, coilNo]);

  const NAV = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'links', label: 'Production links', icon: Factory },
    { id: 'conversion', label: 'Conversion history', icon: ScrollText },
    { id: 'history', label: 'Movement history', icon: ScrollText },
  ];
  const go = (id) => document.getElementById(`coil-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (!coil) {
    return (
      <PageShell>
        <PageHeader title="Coil profile" subtitle="Not found" />
        <MainPanel>
          <Link to="/operations" className="z-btn-primary inline-flex">
            <ArrowLeft size={16} /> Back to operations
          </Link>
        </MainPanel>
      </PageShell>
    );
  }

  const currentKg = liveKg(coil);
  const receivedKg = asNum(coil.weightKg || coil.qtyReceived);
  const reservedKg = asNum(coil.qtyReserved);
  const expectedReservedKg =
    holdersMeta != null ? asNum(holdersMeta.expectedReservedKg) : null;
  const orphanReservedKg =
    holdersMeta != null
      ? Math.max(0, asNum(holdersMeta.orphanReservedKg))
      : Math.max(0, reservedKg - (expectedReservedKg ?? 0));
  const freeKg = Math.max(0, currentKg - reservedKg);
  const canReconcileReservation = Boolean(
    ws?.canMutate && (ws?.hasPermission?.('production.manage') || ws?.hasPermission?.('operations.manage'))
  );
  const purchaseConversion = asNum(coil.supplierConversionKgPerM) || null;
  const avgActualConversion = avg(linkedChecks.map((c) => Number(c.actualConversionKgPerM)));
  const avgStandardConversion = avg(
    linkedChecks.map((c) => Number(c.standardConversionKgPerM)).filter((n) => Number.isFinite(n))
  );
  const actionDateISO = new Date().toISOString().slice(0, 10);

  const submitScrap = async (e) => {
    e.preventDefault();
    const kg = Number(scrapForm.kg);
    if (!Number.isFinite(kg) || kg <= 0) return showToast('Enter scrap kg.', { variant: 'error' });
    if (!ws?.canMutate) return showToast('Workspace is read-only.', { variant: 'error' });
    setSavingAction(true);
    try {
      const meters = scrapForm.meters.trim() ? Number(scrapForm.meters) : undefined;
      const { ok, data } = await apiFetch(`/api/coil-lots/${encodeURIComponent(coil.coilNo)}/scrap`, {
        method: 'POST',
        body: JSON.stringify({
          kg,
          reason: scrapForm.reason,
          note: scrapForm.note.trim(),
          dateISO: actionDateISO,
          creditScrapInventory: true,
          scrapProductID: 'SCRAP-COIL',
          meters: Number.isFinite(meters) ? meters : undefined,
          bookRef: scrapForm.bookRef.trim() || undefined,
        }),
      });
      if (!ok || !data?.ok) return showToast(data?.error || 'Scrap posting failed.', { variant: 'error' });
      await ws.refresh?.();
      showToast(`Scrap posted — ${kg} kg off ${coil.coilNo}.`);
      setActionModal('');
      setScrapForm({ kg: '', meters: '', bookRef: '', reason: 'Damaged edge / offcut', note: '' });
    } finally {
      setSavingAction(false);
    }
  };

  const submitReturn = async (e) => {
    e.preventDefault();
    const kg = Number(returnForm.kg);
    if (!Number.isFinite(kg) || kg <= 0) return showToast('Enter returned kg.', { variant: 'error' });
    if (!ws?.canMutate) return showToast('Workspace is read-only.', { variant: 'error' });
    setSavingAction(true);
    try {
      const { ok, data } = await apiFetch(`/api/coil-lots/${encodeURIComponent(coil.coilNo)}/return-material`, {
        method: 'POST',
        body: JSON.stringify({
          kg,
          reason: returnForm.reason,
          note: returnForm.note.trim(),
          dateISO: actionDateISO,
        }),
      });
      if (!ok || !data?.ok) return showToast(data?.error || 'Return-to-stock failed.', { variant: 'error' });
      await ws.refresh?.();
      showToast(`Return posted — ${kg} kg added back on ${coil.coilNo}.`);
      setActionModal('');
      setReturnForm({ kg: '', reason: 'Unused from production', note: '' });
    } finally {
      setSavingAction(false);
    }
  };

  const submitReconcileReservation = async () => {
    if (!coil || !canReconcileReservation) return;
    setReconcilingReservation(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/coil-lots/${encodeURIComponent(coil.coilNo)}/reconcile-reservation`,
        { method: 'POST', body: JSON.stringify({}) }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not reconcile reservation.', { variant: 'error' });
        return;
      }
      await ws.refresh?.();
      await refreshProductionHolders();
      if (data.unchanged) {
        showToast('Reserved kg already matches active production jobs.', { variant: 'info' });
      } else {
        showToast(
          `Reservation updated: ${Number(data.qtyReservedBefore || 0).toFixed(0)} → ${Number(data.qtyReservedAfter || 0).toFixed(0)} kg (${Number(data.freedKg || 0).toFixed(0)} kg freed).`
        );
      }
    } finally {
      setReconcilingReservation(false);
    }
  };

  const submitEditMaster = async (e) => {
    e.preventDefault();
    if (!coil) return;
    if (!ws?.canMutate) return showToast('Workspace is read-only.', { variant: 'error' });
    const recvStr = editForm.receivedKg.trim();
    const recvNum = recvStr ? Number(recvStr) : null;
    if (recvStr && (!Number.isFinite(recvNum) || recvNum < 0)) {
      return showToast('Received kg must be a valid non-negative number.', { variant: 'error' });
    }
    const curStr = editForm.currentKg.trim();
    const curNum = curStr ? Number(curStr) : NaN;
    if (curStr && (!Number.isFinite(curNum) || curNum < 0)) {
      return showToast('Current on-hand kg must be a valid non-negative number.', { variant: 'error' });
    }
    const body = {
      colour: editForm.colour.trim(),
      gaugeLabel: editForm.gaugeLabel.trim(),
      materialTypeName: editForm.materialTypeName.trim(),
      stockForm: editForm.stockForm,
    };
    if (recvStr) body.receivedKg = recvNum;
    if (curStr) body.currentWeightKg = curNum;
    setSavingAction(true);
    try {
      const { ok, data } = await apiFetch(`/api/coil-lots/${encodeURIComponent(coil.coilNo)}/master-data`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!ok || !data?.ok) return showToast(data?.error || 'Update failed.', { variant: 'error' });
      await ws.refresh?.();
      showToast('Coil details updated.');
      setActionModal('');
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title={`Coil ${coil.coilNo}`}
        subtitle={`${coil.productID || '—'} · ${coil.colour || '—'} · ${coil.gaugeLabel || '—'}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/operations" state={{ focusOpsTab: 'inventory' }} className="z-btn-secondary inline-flex">
              <ArrowLeft size={16} /> Inventory
            </Link>
            {coil.poID ? (
              <Link to="/procurement" state={{ focusTab: 'purchases' }} className="z-btn-secondary inline-flex">
                Open PO
              </Link>
            ) : null}
            {coil.supplierID ? (
              <Link to={`/procurement/suppliers/${encodeURIComponent(coil.supplierID)}`} className="z-btn-secondary inline-flex">
                Supplier
              </Link>
            ) : null}
            <Link
              to="/operations"
              state={{ focusOpsTab: 'coilControl' }}
              className="z-btn-secondary inline-flex text-center no-underline"
            >
              Coil control
            </Link>
            {mayEditCoilMaster ? (
              <button type="button" className="z-btn-secondary inline-flex items-center gap-1.5" onClick={() => setActionModal('edit')}>
                <Pencil size={16} aria-hidden /> Edit details
              </button>
            ) : null}
            <button type="button" className="z-btn-secondary inline-flex" onClick={() => setActionModal('scrap')}>
              Scrap
            </button>
            <button type="button" className="z-btn-secondary inline-flex" onClick={() => setActionModal('return')}>
              Return
            </button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start min-w-0">
        <aside className="w-full lg:w-56 shrink-0 lg:sticky lg:top-24 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 mb-2">On this page</p>
          {NAV.map((item) => {
            const NavIcon = item.icon;
            return (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-[#134e4a] hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all"
            >
              <NavIcon size={14} />
              {item.label}
            </button>
            );
          })}
        </aside>

        <MainPanel className="flex-1 min-w-0 !pt-0">
          <section id="coil-overview" className="rounded-zarewa border border-gray-100 bg-white shadow-sm p-5 mb-8 scroll-mt-28">
            <h3 className="text-xs font-bold text-[#134e4a] uppercase tracking-widest mb-4">Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-[9px] uppercase font-bold text-slate-400">Current kg</p>
                <p className="text-lg font-black text-[#134e4a] tabular-nums">{currentKg.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-[9px] uppercase font-bold text-slate-400">Received at GRN</p>
                <p className="text-lg font-black text-[#134e4a] tabular-nums">{receivedKg.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-[9px] uppercase font-bold text-slate-400">Reserved</p>
                <p className="text-lg font-black text-[#134e4a] tabular-nums">{reservedKg.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-[9px] uppercase font-bold text-slate-400">Free to use</p>
                <p className="text-lg font-black text-[#134e4a] tabular-nums">{freeKg.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <p>Colour: <strong>{coil.colour || '—'}</strong></p>
              <p>Gauge: <strong>{coil.gaugeLabel || coil.gauge || '—'}</strong></p>
              <p>Material type: <strong>{coil.materialTypeName || coil.materialType || coil.productID || '—'}</strong></p>
              <p>Supplier: <strong>{coil.supplierName || coil.supplierID || '—'}</strong></p>
              <p>PO: <strong>{coil.poID || '—'}</strong></p>
              <p>Status: <strong>{coil.currentStatus || '—'}</strong></p>
              <p>Location: <strong>{coil.location || '—'}</strong></p>
              <p>Parent coil: <strong>{coil.parentCoilNo || '—'}</strong></p>
              <p>Received: <strong>{coil.receivedAtISO || '—'}</strong></p>
            </div>
            {orphanReservedKg > 0.05 ? (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-950">
                <p className="font-bold text-amber-900">
                  Orphan reservation — {orphanReservedKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                </p>
                <p className="mt-1 leading-relaxed text-amber-900/90">
                  The coil book shows <strong>{reservedKg.toLocaleString()}</strong> kg reserved, but planned/running
                  production jobs only account for{' '}
                  <strong>{(expectedReservedKg ?? 0).toLocaleString()}</strong> kg. That is why production register
                  shows <strong>0 kg free</strong> even when no job appears in the queue filter. Common causes: coil
                  register import with a reserved qty, or a cancelled job that did not release stock cleanly.
                </p>
                {canReconcileReservation ? (
                  <button
                    type="button"
                    className="mt-2 z-btn-secondary text-[10px]"
                    disabled={reconcilingReservation}
                    onClick={submitReconcileReservation}
                  >
                    {reconcilingReservation ? 'Reconciling…' : 'Clear orphan reservation'}
                  </button>
                ) : null}
              </div>
            ) : null}
            {holdersLoading ? (
              <p className="mt-3 text-[10px] text-slate-500">Loading production holders…</p>
            ) : null}
          </section>

          <section id="coil-links" className="rounded-zarewa border border-gray-100 bg-white shadow-sm p-5 mb-8 scroll-mt-28">
            <h3 className="text-xs font-bold text-[#134e4a] uppercase tracking-widest mb-4">Production links</h3>
            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
              All jobs that ever allocated this coil (from server). Active planned/running openings should match
              reserved kg on the overview.
            </p>
            <div className="space-y-2">
              {jobRows.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No production job rows for this coil. If reserved kg is still positive, use{' '}
                  <strong className="text-amber-900">Clear orphan reservation</strong> above.
                </p>
              ) : (
                jobRows.map((row, idx) => (
                  <div key={`${row.jobID || row.cuttingListId || 'job'}-${idx}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-[#134e4a]">{row.cuttingListId || row.jobID || '—'}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 border ${toneForAlert(
                          row.alertState || row.conversionAlert || row.status
                        )}`}
                      >
                        {row.alertState || row.conversionAlert || row.status || '—'}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        open kg:{' '}
                        <strong>
                          {asNum(row.openingWeightKg) > 0
                            ? asNum(row.openingWeightKg).toLocaleString(undefined, { maximumFractionDigits: 1 })
                            : '—'}
                        </strong>
                      </span>
                      <span>job: <strong>{row.jobStatus || row.status || '—'}</strong></span>
                      <span>kg used: <strong>{row.kgUsed != null ? row.kgUsed.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</strong></span>
                      <span>meter: <strong>{row.meters > 0 ? row.meters.toLocaleString() : '—'}</strong></span>
                      <span>conversion: <strong>{fmtConv2(row.actualConv)}</strong></span>
                      {(row.cuttingListId || row.jobID) ? (
                        <Link
                          to="/operations"
                          state={{
                            focusOpsTab: 'production',
                            highlightCuttingListId: row.cuttingListId || row.jobID,
                          }}
                          className="text-[#134e4a] underline underline-offset-2 font-semibold"
                        >
                          Open trace
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section
            id="coil-conversion"
            className="rounded-zarewa border border-gray-100 bg-white shadow-sm p-5 mb-8 scroll-mt-28"
          >
            <h3 className="text-xs font-bold text-[#134e4a] uppercase tracking-widest mb-4">Conversion history</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-[9px] uppercase font-bold text-slate-400">Purchase conversion</p>
                <p className="text-lg font-black text-[#134e4a] tabular-nums">{fmtConv2(purchaseConversion)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-[9px] uppercase font-bold text-slate-400">Average conversion</p>
                <p className="text-lg font-black text-[#134e4a] tabular-nums">{fmtConv2(avgActualConversion)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-[9px] uppercase font-bold text-slate-400">Standard conversion</p>
                <p className="text-lg font-black text-[#134e4a] tabular-nums">{fmtConv2(avgStandardConversion)}</p>
              </div>
            </div>
            {linkedChecks.length === 0 ? (
              <p className="text-xs text-slate-500">No conversion checks recorded for this coil yet.</p>
            ) : (
              <ul className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
                {linkedChecks.map((c) => (
                  <li key={c.id} className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs">
                    <p className="font-bold text-[#134e4a]">
                      {c.cuttingListId || c.jobID || '—'} <span className="text-slate-400">· {c.atISO || c.createdAtISO || '—'}</span>
                    </p>
                    <p className="mt-1 text-slate-600">
                      actual <strong>{fmtConv2(Number(c.actualConversionKgPerM))}</strong> · standard{' '}
                      <strong>{fmtConv2(Number(c.standardConversionKgPerM))}</strong> · purchase{' '}
                      <strong>{fmtConv2(Number(c.supplierConversionKgPerM))}</strong>
                    </p>
                    <p className="mt-1">
                      <span className={`inline-flex rounded px-1.5 py-0.5 border font-semibold ${toneForAlert(c.alertState)}`}>
                        {c.alertState || 'Within band'}
                      </span>
                      {(c.cuttingListId || c.jobID) ? (
                        <Link
                          to="/operations"
                          state={{
                            focusOpsTab: 'production',
                            highlightCuttingListId: c.cuttingListId || c.jobID,
                          }}
                          className="ml-2 text-[#134e4a] underline underline-offset-2 font-semibold"
                        >
                          Open trace
                        </Link>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="coil-history" className="rounded-zarewa border border-gray-100 bg-white shadow-sm p-5 scroll-mt-28">
            <h3 className="text-xs font-bold text-[#134e4a] uppercase tracking-widest mb-4">Movement history</h3>
            {movementRows.length === 0 ? (
              <p className="text-xs text-slate-500">No movement rows referencing this coil yet.</p>
            ) : (
              <ul className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar">
                {movementRows.map((m) => (
                  <li key={m.id} className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs">
                    <p className="font-bold text-[#134e4a]">{movementTitle(m)} <span className="text-slate-400">· {m.atISO || '—'}</span></p>
                    <p className="text-slate-600 mt-0.5">{m.detail || '—'}</p>
                    {m.ref ? <p className="text-[10px] text-slate-500 mt-0.5">Ref: {m.ref}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </MainPanel>
      </div>
      <ModalFrame isOpen={actionModal === 'scrap'} onClose={() => !savingAction && setActionModal('')}>
        <form onSubmit={submitScrap} className="space-y-3">
          <h3 className="text-lg font-black text-[#134e4a]">Scrap from {coil.coilNo}</h3>
          <input className="z-input w-full" type="number" min="0.01" step="0.01" placeholder="Scrap kg" value={scrapForm.kg} onChange={(e) => setScrapForm((s) => ({ ...s, kg: e.target.value }))} />
          <input className="z-input w-full" type="number" min="0" step="0.01" placeholder="Metres (optional)" value={scrapForm.meters} onChange={(e) => setScrapForm((s) => ({ ...s, meters: e.target.value }))} />
          <input className="z-input w-full" placeholder="Book / offcut no. (optional)" value={scrapForm.bookRef} onChange={(e) => setScrapForm((s) => ({ ...s, bookRef: e.target.value }))} />
          <input className="z-input w-full" placeholder="Reason" value={scrapForm.reason} onChange={(e) => setScrapForm((s) => ({ ...s, reason: e.target.value }))} />
          <textarea className="z-input w-full min-h-20" placeholder="Note" value={scrapForm.note} onChange={(e) => setScrapForm((s) => ({ ...s, note: e.target.value }))} />
          <button className="z-btn-primary" type="submit" disabled={savingAction}>Post scrap</button>
        </form>
      </ModalFrame>
      <ModalFrame isOpen={actionModal === 'return'} onClose={() => !savingAction && setActionModal('')}>
        <form onSubmit={submitReturn} className="space-y-3">
          <h3 className="text-lg font-black text-[#134e4a]">Return material to {coil.coilNo}</h3>
          <input className="z-input w-full" type="number" min="0.01" step="0.01" placeholder="Return kg" value={returnForm.kg} onChange={(e) => setReturnForm((s) => ({ ...s, kg: e.target.value }))} />
          <input className="z-input w-full" placeholder="Reason" value={returnForm.reason} onChange={(e) => setReturnForm((s) => ({ ...s, reason: e.target.value }))} />
          <textarea className="z-input w-full min-h-20" placeholder="Note" value={returnForm.note} onChange={(e) => setReturnForm((s) => ({ ...s, note: e.target.value }))} />
          <button className="z-btn-primary" type="submit" disabled={savingAction}>Post return</button>
        </form>
      </ModalFrame>
      <ModalFrame isOpen={actionModal === 'edit'} onClose={() => !savingAction && setActionModal('')}>
        <form onSubmit={submitEditMaster} className="space-y-3">
          <h3 className="text-lg font-black text-[#134e4a]">Edit coil details</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            For branch managers, the MD, and administrators only. Received kg updates the GRN book figure (
            <code className="text-[11px]">qty_received</code> / <code className="text-[11px]">weight_kg</code>
            ). Current on-hand kg is unchanged — use <strong>Coil control</strong> for live mass adjustments.
          </p>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Colour</span>
            <input className="z-input w-full mt-0.5" value={editForm.colour} onChange={(e) => setEditForm((f) => ({ ...f, colour: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Gauge</span>
            <input className="z-input w-full mt-0.5" value={editForm.gaugeLabel} onChange={(e) => setEditForm((f) => ({ ...f, gaugeLabel: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Material type (description)</span>
            <input className="z-input w-full mt-0.5" value={editForm.materialTypeName} onChange={(e) => setEditForm((f) => ({ ...f, materialTypeName: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Stock form</span>
            <select
              className="z-input w-full mt-0.5"
              value={editForm.stockForm}
              onChange={(e) => setEditForm((f) => ({ ...f, stockForm: e.target.value }))}
            >
              <option value="coil">Coil (gross kg — spool deducted in register)</option>
              <option value="roll">Roll (net kg — no spool deduction)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Current on-hand kg</span>
            <input
              className="z-input w-full mt-0.5"
              type="number"
              min="0"
              step="0.01"
              value={editForm.currentKg}
              onChange={(e) => setEditForm((f) => ({ ...f, currentKg: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Received kg (GRN)</span>
            <input className="z-input w-full mt-0.5" type="number" min="0" step="0.01" value={editForm.receivedKg} onChange={(e) => setEditForm((f) => ({ ...f, receivedKg: e.target.value }))} />
          </label>
          <button className="z-btn-primary" type="submit" disabled={savingAction}>Save changes</button>
        </form>
      </ModalFrame>
    </PageShell>
  );
}

