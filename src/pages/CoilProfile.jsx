import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  LayoutDashboard,
  Factory,
  History,
  Pencil,
  ScrollText,
} from 'lucide-react';
import { MainPanel, ModalFrame, PageHeader, PageShell, Breadcrumbs } from '../components/layout';
import CoilDamageRecordModal from '../components/operations/CoilDamageRecordModal';
import CoilEditMasterModal from '../components/operations/CoilEditMasterModal';
import { INCIDENT_TYPES } from '../lib/materialIncidentConstants';
import { ProductionRegisterEditModal } from '../components/operations/ProductionRegisterEditModal';
import { pickProductionJobForFocusId } from '../lib/productionJobPick';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTrackedUnsavedForm } from '../hooks/useTrackedUnsavedForm';
import { apiFetch } from '../lib/apiBase';
import { fmtConv2 } from '../lib/conversionKgPerM.js';
import { coilFreeKg, coilKgUsed, coilOnHandKg, coilReceivedKg } from '../lib/coilStockKg.js';
import { buildCoilProfileJobRows, coilProfileProductionTotals } from '../lib/coilProfileJobRows.js';

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function liveKg(lot) {
  return coilOnHandKg(lot);
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

/** Matches server `COIL_PROFILE_FINISH_MAX_KG` (SOP-04 §4.3 ≤85 kg) — tail-only close from coil profile. */
const COIL_PROFILE_FINISH_MAX_KG = 85;

function movementTitle(m) {
  const t = String(m?.type || '').toUpperCase();
  const detail = String(m?.detail || '').toLowerCase();
  if (detail.includes('roll finished')) return 'Roll finished';
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
  const { coilLots, movements, refreshInventory } = useInventory();
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const [actionModal, setActionModal] = useState('');
  const [damageModalOpen, setDamageModalOpen] = useState(false);
  const [damageModalIncidentType, setDamageModalIncidentType] = useState('coil_stain');
  const [incidentTypePick, setIncidentTypePick] = useState('coil_stain');
  const [savingAction, setSavingAction] = useState(false);
  const [scrapForm, setScrapForm] = useState({ kg: '', meters: '', bookRef: '', reason: 'Damaged edge / offcut', note: '' });
  const [returnForm, setReturnForm] = useState({ kg: '', reason: 'Unused from production', note: '' });
  const [finishForm, setFinishForm] = useState({ note: '', cuttingListRef: '' });
  const [holdersMeta, setHoldersMeta] = useState(null);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [reconcilingReservation, setReconcilingReservation] = useState(false);
  const [recalculatingStock, setRecalculatingStock] = useState(false);
  const [productionTraceModal, setProductionTraceModal] = useState(null);

  const actionModalOpen = Boolean(actionModal);
  const { captureEdited, wrapClose } = useTrackedUnsavedForm('page-coil-profile', {
    isOpen: actionModalOpen,
    hydrateKey: `${coilNo}-${actionModal}`,
  });
  const closeActionModal = wrapClose(() => {
    if (savingAction) return;
    setActionModal('');
  });

  const coil = useMemo(
    () => coilLots.find((c) => coilKey(c.coilNo) === coilNoKey),
    [coilLots, coilNoKey]
  );

  const openMaterialIncident = (incidentType = 'coil_stain') => {
    setDamageModalIncidentType(incidentType);
    setIncidentTypePick(incidentType);
    setDamageModalOpen(true);
  };

  const mayEditCoilMaster = useMemo(
    () => canEditCoilLotMasterData(ws?.session?.user?.roleKey),
    [ws?.session?.user?.roleKey]
  );

  const cuttingLists = useMemo(
    () => (Array.isArray(ws?.snapshot?.cuttingLists) ? ws.snapshot.cuttingLists : []),
    [ws?.snapshot?.cuttingLists]
  );
  const productionJobs = useMemo(
    () => (Array.isArray(ws?.snapshot?.productionJobs) ? ws.snapshot.productionJobs : []),
    [ws?.snapshot?.productionJobs]
  );
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

  const jobRows = useMemo(
    () =>
      buildCoilProfileJobRows({
        holders: holdersMeta?.holders,
        linkedJobs,
        productionJobs,
        checkByKey,
        linkedCuttingSet,
      }),
    [linkedJobs, checkByKey, linkedCuttingSet, holdersMeta?.holders, productionJobs]
  );

  const productionTotals = useMemo(() => {
    if (
      holdersMeta != null &&
      Number.isFinite(Number(holdersMeta.jobsConsumedKgSum)) &&
      Number.isFinite(Number(holdersMeta.bookUsedKg))
    ) {
      return {
        jobsConsumedKgSum: Number(holdersMeta.jobsConsumedKgSum),
        openingClosingKgSum: Number(holdersMeta.openingClosingKgSum) || 0,
        gapKg: Number(holdersMeta.reconciliationGapKg),
        openingClosingGapKg: Number.isFinite(Number(holdersMeta.openingClosingGapKg))
          ? Number(holdersMeta.openingClosingGapKg)
          : null,
      };
    }
    return coil ? coilProfileProductionTotals(jobRows, coilKgUsed(coil)) : null;
  }, [jobRows, coil, holdersMeta]);

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
    { id: 'history', label: 'Movement history', icon: History },
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

  const currentKg =
    holdersMeta != null && Number.isFinite(Number(holdersMeta.onHandKg))
      ? Number(holdersMeta.onHandKg)
      : liveKg(coil);
  const receivedKg =
    holdersMeta != null && Number.isFinite(Number(holdersMeta.receivedKg))
      ? Number(holdersMeta.receivedKg)
      : coilReceivedKg(coil);
  const kgUsed =
    holdersMeta != null && Number.isFinite(Number(holdersMeta.bookUsedKg))
      ? Number(holdersMeta.bookUsedKg)
      : coilKgUsed(coil);
  const reservedKg = asNum(coil.qtyReserved);
  const expectedReservedKg =
    holdersMeta != null ? asNum(holdersMeta.expectedReservedKg) : null;
  const orphanReservedKg =
    holdersMeta != null
      ? Math.max(0, asNum(holdersMeta.orphanReservedKg))
      : Math.max(0, reservedKg - (expectedReservedKg ?? 0));
  const freeKg =
    holdersMeta != null && Number.isFinite(Number(holdersMeta.freeKg))
      ? Number(holdersMeta.freeKg)
      : coilFreeKg(coil);
  const canReconcileReservation = Boolean(
    ws?.canMutate && (ws?.hasPermission?.('production.manage') || ws?.hasPermission?.('operations.manage'))
  );
  const canFinishRoll = Boolean(
    ws?.canMutate &&
      (ws?.hasPermission?.('inventory.adjust') ||
        ws?.hasPermission?.('operations.manage') ||
        ws?.hasPermission?.('production.manage'))
  );
  const finishRollEligible = Boolean(
    canFinishRoll &&
      freeKg > 0.05 &&
      freeKg < COIL_PROFILE_FINISH_MAX_KG &&
      String(coil?.currentStatus || '').toLowerCase() !== 'consumed'
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

  const submitFinishRoll = async (e) => {
    e.preventDefault();
    const note = finishForm.note.trim();
    if (note.length < 8) return showToast('Enter a note (at least 8 characters) for the audit trail.', { variant: 'error' });
    if (!ws?.canMutate) return showToast('Workspace is read-only.', { variant: 'error' });
    if (!finishRollEligible) {
      return showToast(
        reservedKg > 0.05
          ? 'Clear reservations on this coil before finishing the roll.'
          : `Finish roll applies only when free kg is below ${COIL_PROFILE_FINISH_MAX_KG}.`,
        { variant: 'error' }
      );
    }
    setSavingAction(true);
    try {
      const { ok, data } = await apiFetch(`/api/coil-lots/${encodeURIComponent(coil.coilNo)}/finish-roll`, {
        method: 'POST',
        body: JSON.stringify({
          note,
          cuttingListRef: finishForm.cuttingListRef.trim() || undefined,
          dateISO: actionDateISO,
        }),
      });
      if (!ok || !data?.ok) return showToast(data?.error || 'Could not finish roll.', { variant: 'error' });
      await ws.refresh?.();
      showToast(
        `Roll finished — ${Number(data.tailKgCleared || freeKg).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg tail cleared from stock.`
      );
      setActionModal('');
      setFinishForm({ note: '', cuttingListRef: '' });
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

  const resolveProductionTraceFocus = (row) => {
    const cl = String(row?.cuttingListId || '').trim();
    if (cl) return cl;
    const jobId = String(row?.jobID || '').trim();
    if (!jobId) return '';
    const job = pickProductionJobForFocusId(jobId, productionJobs, cuttingLists);
    return String(job?.cuttingListId || jobId).trim();
  };

  const openProductionTrace = (row) => {
    if (!ws?.canMutate) {
      showToast('Connect API to open the production register.', { variant: 'info' });
      return;
    }
    const focusId = resolveProductionTraceFocus(row);
    if (!focusId) {
      showToast('No production job linked to this row yet.', { variant: 'info' });
      return;
    }
    const subtitle = [row?.customer, row?.quotationRef].filter(Boolean).join(' · ') || undefined;
    setProductionTraceModal({ cuttingListId: focusId, subtitle });
  };

  const submitRecalculateProductionStock = async () => {
    if (!coil || !canReconcileReservation) return;
    setRecalculatingStock(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/coil-lots/${encodeURIComponent(coil.coilNo)}/recalculate-production-stock`,
        { method: 'POST', body: JSON.stringify({}) }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not recalculate production stock.', { variant: 'error' });
        return;
      }
      await ws.refresh?.();
      await refreshProductionHolders();
      const count = Number(data.recalculatedJobCount || 0);
      const book = data.bookReconcile;
      const gapAfter = Number(data.summary?.reconciliationGapKg);
      const aligned = Number.isFinite(gapAfter) && Math.abs(gapAfter) <= 0.05;
      const onHandDelta = Number(book?.onHandDeltaKg);
      if (count === 0) {
        showToast('No production jobs linked to this coil.', { variant: 'info' });
      } else if (aligned && Number.isFinite(onHandDelta) && Math.abs(onHandDelta) > 0.05) {
        showToast(
          `Production stock recalculated for ${count} job(s). On-hand adjusted ${onHandDelta > 0 ? '+' : ''}${onHandDelta.toFixed(1)} kg — kg used now matches job consumption.`,
          { variant: 'info', duration: 8000 }
        );
      } else if (aligned) {
        showToast(`Production stock recalculated for ${count} job(s) — kg used matches job consumption.`, {
          variant: 'info',
        });
      } else {
        showToast(
          `Recalculated ${count} job(s). ${Math.abs(gapAfter).toFixed(1)} kg gap remains — check scrap, finish roll, or active reservations.`,
          { variant: 'info', duration: 8000 }
        );
      }
    } finally {
      setRecalculatingStock(false);
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

  return (
    <PageShell>
      <Breadcrumbs
        className="mb-4"
        items={[
          { label: 'Operations', to: '/operations' },
          { label: 'Inventory', to: '/operations' },
          { label: `Coil ${coil.coilNo}` },
        ]}
      />
      <PageHeader
        title={`Coil ${coil.coilNo}`}
        subtitle={`${coil.productID || '—'} · ${coil.colour || '—'} · ${coil.gaugeLabel || '—'}`}
        actions={
          <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
            <div className="flex flex-wrap gap-2 justify-end">
              {finishRollEligible ? (
                <button
                  type="button"
                  className="z-btn-primary inline-flex items-center gap-1.5"
                  onClick={() => setActionModal('finish')}
                >
                  <CheckCircle2 size={16} aria-hidden />
                  Finish roll
                </button>
              ) : null}
              <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1.5">
                <select
                  value={incidentTypePick}
                  onChange={(e) => setIncidentTypePick(e.target.value)}
                  className="rounded-lg border border-amber-200/80 bg-white py-1.5 pl-2 pr-7 text-ui-xs font-bold text-amber-950 outline-none max-w-[11rem]"
                  aria-label="Incident type"
                >
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="z-btn-secondary inline-flex items-center gap-1.5 border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200"
                  onClick={() => openMaterialIncident(incidentTypePick)}
                >
                  <AlertTriangle size={16} aria-hidden />
                  Record incident
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Link to="/operations" state={{ focusOpsTab: 'inventory' }} className="z-btn-secondary inline-flex">
                <ArrowLeft size={16} /> Inventory
              </Link>
              <Link
                to="/operations"
                state={{ focusOpsTab: 'coilControl' }}
                className="z-btn-secondary inline-flex text-center no-underline"
              >
                Coil control
              </Link>
              {mayEditCoilMaster ? (
                <button type="button" className="z-btn-secondary inline-flex items-center gap-1.5" onClick={() => setActionModal('edit')}>
                  <Pencil size={16} aria-hidden /> Edit
                </button>
              ) : null}
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
              <button
                type="button"
                className="z-btn-secondary inline-flex border-rose-200 text-rose-900 hover:bg-rose-50"
                onClick={() => setActionModal('scrap')}
              >
                Scrap
              </button>
              <button type="button" className="z-btn-secondary inline-flex" onClick={() => setActionModal('return')}>
                Return
              </button>
            </div>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start min-w-0">
        <aside className="w-full lg:w-56 shrink-0 lg:sticky lg:top-24 space-y-1">
          <p className="text-ui-xs font-black uppercase tracking-widest text-gray-400 px-3 mb-2">On this page</p>
          {NAV.map((item) => {
            const NavIcon = item.icon;
            return (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zarewa-teal hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all"
            >
              <NavIcon size={14} />
              {item.label}
            </button>
            );
          })}
        </aside>

        <MainPanel className="flex-1 min-w-0 !pt-0">
          <section id="coil-overview" className="rounded-zarewa border border-gray-100 bg-white shadow-sm p-5 mb-8 scroll-mt-28">
            <h3 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-4">Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-ui-xs uppercase font-bold text-slate-400">Received at GRN</p>
                <p className="text-lg font-black text-zarewa-teal tabular-nums">{receivedKg.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-ui-xs uppercase font-bold text-slate-400">Kg used</p>
                <p className="text-lg font-black text-zarewa-teal tabular-nums">{kgUsed.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-ui-xs uppercase font-bold text-slate-400">On-hand kg</p>
                <p className="text-lg font-black text-zarewa-teal tabular-nums">{currentKg.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-ui-xs uppercase font-bold text-slate-400">Reserved</p>
                <p className="text-lg font-black text-zarewa-teal tabular-nums">{reservedKg.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-zarewa-teal/30 bg-zarewa-teal/5 px-3 py-3 col-span-2 sm:col-span-1">
                <p className="text-ui-xs uppercase font-bold text-slate-500">Free to use</p>
                <p className="text-lg font-black text-zarewa-teal tabular-nums">{freeKg.toLocaleString()}</p>
              </div>
            </div>
            <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600 leading-relaxed tabular-nums">
              <strong className="text-slate-700">Book arithmetic:</strong>{' '}
              received <strong>{receivedKg.toLocaleString()}</strong> − used <strong>{kgUsed.toLocaleString()}</strong>{' '}
              = on-hand <strong>{currentKg.toLocaleString()}</strong>
              {' · '}
              on-hand <strong>{currentKg.toLocaleString()}</strong> − reserved <strong>{reservedKg.toLocaleString()}</strong>{' '}
              = free <strong>{freeKg.toLocaleString()}</strong> kg
            </p>
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
            {finishRollEligible ? (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-950">
                <p className="font-bold text-amber-900">
                  Near-finished tail on book — {freeKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg free
                </p>
                <p className="mt-1 leading-relaxed text-amber-900/90">
                  If this roll is physically finished (spool/core tail only), use <strong>Finish roll</strong> to clear
                  the remaining kg from raw stock. This fixes missed &ldquo;Roll finished&rdquo; at production complete
                  without posting new finished-goods metres or inflating stock value at month-end verification.
                </p>
              </div>
            ) : null}
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
                    className="mt-2 z-btn-secondary text-ui-xs"
                    disabled={reconcilingReservation}
                    onClick={submitReconcileReservation}
                  >
                    {reconcilingReservation ? 'Reconciling…' : 'Clear orphan reservation'}
                  </button>
                ) : null}
              </div>
            ) : reservedKg > 0.05 && freeKg <= 0.05 ? (
              <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-xs text-sky-950">
                <p className="font-bold text-sky-900">Fully reserved by active production</p>
                <p className="mt-1 leading-relaxed text-sky-900/90">
                  <strong>{reservedKg.toLocaleString()}</strong> kg is held by planned or running jobs (see Production
                  links below). This is not an orphan — <strong>Clear orphan reservation</strong> will report
                  &ldquo;unchanged&rdquo; until those jobs complete, cancel, or release coil. Open each job trace to
                  check opening kg or return the job to plan.
                </p>
              </div>
            ) : null}
            {holdersLoading ? (
              <p className="mt-3 text-ui-xs text-slate-500">Loading production holders…</p>
            ) : null}
          </section>

          <section id="coil-links" className="rounded-zarewa border border-gray-100 bg-white shadow-sm p-5 mb-8 scroll-mt-28">
            <h3 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-4">Production links</h3>
            <p className="text-ui-xs text-slate-500 mb-3 leading-relaxed">
              All jobs that ever allocated this coil (from server). Active planned/running openings should match
              reserved kg on the overview. Per-job <strong>kg used</strong> is the booked consumed weight on each
              allocation (not opening − closing when they differ after corrections).
            </p>
            {productionTotals && Math.abs(productionTotals.gapKg || 0) > 0.05 ? (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-950">
                <p className="font-bold text-amber-900">Job consumption vs coil book</p>
                <p className="mt-1 leading-relaxed text-amber-900/90 tabular-nums">
                  Sum of job consumed kg: <strong>{productionTotals.jobsConsumedKgSum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                  {' · '}
                  Coil book used: <strong>{kgUsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                  {' · '}
                  Gap: <strong>{Math.abs(productionTotals.gapKg).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> kg
                </p>
                {productionTotals.openingClosingGapKg != null &&
                Math.abs(productionTotals.openingClosingGapKg - (productionTotals.gapKg || 0)) > 0.05 ? (
                  <p className="mt-1 leading-relaxed text-amber-900/80 tabular-nums">
                    Opening − closing sum:{' '}
                    <strong>
                      {productionTotals.openingClosingKgSum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </strong>{' '}
                    kg — differs from booked consumed; completion corrections may have restored kg without updating
                    allocation rows.
                  </p>
                ) : null}
                <p className="mt-1 leading-relaxed text-amber-900/80">
                  {(productionTotals.gapKg || 0) > 0.05 ? (
                    <>
                      Jobs record <strong>more</strong> kg consumed than the coil book shows — often after completion
                      corrections or import drift.
                    </>
                  ) : (
                    <>
                      The coil book shows <strong>more</strong> kg used than jobs sum — often scrap, finish-roll tail,
                      or consumption posted without updating job rows.
                    </>
                  )}{' '}
                  <strong>Recalc production stock</strong> rebuilds kg used and on-hand from job consumption (plus
                  scrap, returns, and splits), syncs allocation consumed kg from opening − closing, and clears orphan
                  reservations.
                </p>
                {canReconcileReservation ? (
                  <button
                    type="button"
                    className="mt-2 z-btn-secondary text-ui-xs"
                    disabled={recalculatingStock}
                    onClick={submitRecalculateProductionStock}
                  >
                    {recalculatingStock ? 'Recalculating…' : 'Recalc production stock'}
                  </button>
                ) : null}
              </div>
            ) : productionTotals && jobRows.length > 0 ? (
              <p className="mb-3 text-ui-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 tabular-nums">
                Job consumed kg sum ({productionTotals.jobsConsumedKgSum.toLocaleString(undefined, { maximumFractionDigits: 2 })}) matches coil book used ({kgUsed.toLocaleString()}).
              </p>
            ) : null}
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
                      <span className="font-bold text-zarewa-teal">
                        {row.cuttingListId ? (
                          <span className="font-mono">{row.cuttingListId}</span>
                        ) : (
                          <span className="text-amber-800">No cutting list linked</span>
                        )}
                        {row.jobID ? (
                          <span className="ml-2 font-normal text-slate-500">
                            job <span className="font-mono font-semibold">{row.jobID}</span>
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 border ${toneForAlert(
                          row.alertState || row.conversionAlert || row.jobStatus || row.status
                        )}`}
                      >
                        {row.alertState || row.conversionAlert || row.jobStatus || row.status || '—'}
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
                      <span>job status: <strong>{row.jobStatus || row.status || '—'}</strong></span>
                      <span>kg used: <strong>{row.kgUsed != null ? row.kgUsed.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</strong></span>
                      <span>meter: <strong>{row.meters > 0 ? row.meters.toLocaleString() : '—'}</strong></span>
                      <span>conversion: <strong>{fmtConv2(row.actualConv)}</strong></span>
                      {(row.cuttingListId || row.jobID) ? (
                        <button
                          type="button"
                          onClick={() => openProductionTrace(row)}
                          className="text-zarewa-teal underline underline-offset-2 font-semibold"
                        >
                          Open trace
                        </button>
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
            <h3 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-4">Conversion history</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-ui-xs uppercase font-bold text-slate-400">Purchase conversion</p>
                <p className="text-lg font-black text-zarewa-teal tabular-nums">{fmtConv2(purchaseConversion)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-ui-xs uppercase font-bold text-slate-400">Average conversion</p>
                <p className="text-lg font-black text-zarewa-teal tabular-nums">{fmtConv2(avgActualConversion)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
                <p className="text-ui-xs uppercase font-bold text-slate-400">Standard conversion</p>
                <p className="text-lg font-black text-zarewa-teal tabular-nums">{fmtConv2(avgStandardConversion)}</p>
              </div>
            </div>
            {linkedChecks.length === 0 ? (
              <p className="text-xs text-slate-500">No conversion checks recorded for this coil yet.</p>
            ) : (
              <ul className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
                {linkedChecks.map((c) => (
                  <li key={c.id} className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs">
                    <p className="font-bold text-zarewa-teal">
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
                        <button
                          type="button"
                          onClick={() => openProductionTrace(c)}
                          className="ml-2 text-zarewa-teal underline underline-offset-2 font-semibold"
                        >
                          Open trace
                        </button>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="coil-history" className="rounded-zarewa border border-gray-100 bg-white shadow-sm p-5 scroll-mt-28">
            <h3 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-4">Movement history</h3>
            {movementRows.length === 0 ? (
              <p className="text-xs text-slate-500">No movement rows referencing this coil yet.</p>
            ) : (
              <ul className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar">
                {movementRows.map((m) => (
                  <li key={m.id} className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs">
                    <p className="font-bold text-zarewa-teal">{movementTitle(m)} <span className="text-slate-400">· {m.atISO || '—'}</span></p>
                    <p className="text-slate-600 mt-0.5">{m.detail || '—'}</p>
                    {m.ref ? <p className="text-ui-xs text-slate-500 mt-0.5">Ref: {m.ref}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </MainPanel>
      </div>
      <ModalFrame isOpen={actionModal === 'finish'} onClose={closeActionModal}>
        <form onSubmit={submitFinishRoll} className="space-y-3" onInput={captureEdited} onChange={captureEdited}>
          <h3 className="text-lg font-black text-zarewa-teal">Finish roll — {coil.coilNo}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Clears <strong>{freeKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</strong> of unusable
            spool/core tail from coil and raw-material stock. Use when production metres were already posted but
            &ldquo;Roll finished&rdquo; was not ticked. Does not add finished-goods metres.
          </p>
          <input
            className="z-input w-full"
            placeholder="Cutting list ref (optional, e.g. CL-55)"
            value={finishForm.cuttingListRef}
            onChange={(e) => setFinishForm((s) => ({ ...s, cuttingListRef: e.target.value }))}
          />
          <textarea
            className="z-input w-full min-h-24"
            placeholder="Note (required, min 8 characters) — e.g. Roll finished last month; CL-55 complete without finish tick"
            value={finishForm.note}
            onChange={(e) => setFinishForm((s) => ({ ...s, note: e.target.value }))}
            required
            minLength={8}
          />
          <button className="z-btn-primary" type="submit" disabled={savingAction}>
            {savingAction ? 'Clearing tail…' : 'Finish roll & clear stock'}
          </button>
        </form>
      </ModalFrame>
      <ModalFrame isOpen={actionModal === 'scrap'} onClose={closeActionModal}>
        <form onSubmit={submitScrap} className="space-y-3" onInput={captureEdited} onChange={captureEdited}>
          <h3 className="text-lg font-black text-zarewa-teal">Scrap from {coil.coilNo}</h3>
          <input className="z-input w-full" type="number" min="0.01" step="0.01" placeholder="Scrap kg" value={scrapForm.kg} onChange={(e) => setScrapForm((s) => ({ ...s, kg: e.target.value }))} />
          <input className="z-input w-full" type="number" min="0" step="0.01" placeholder="Metres (optional)" value={scrapForm.meters} onChange={(e) => setScrapForm((s) => ({ ...s, meters: e.target.value }))} />
          <input className="z-input w-full" placeholder="Book / offcut no. (optional)" value={scrapForm.bookRef} onChange={(e) => setScrapForm((s) => ({ ...s, bookRef: e.target.value }))} />
          <input className="z-input w-full" placeholder="Reason" value={scrapForm.reason} onChange={(e) => setScrapForm((s) => ({ ...s, reason: e.target.value }))} />
          <textarea className="z-input w-full min-h-20" placeholder="Note" value={scrapForm.note} onChange={(e) => setScrapForm((s) => ({ ...s, note: e.target.value }))} />
          <button className="z-btn-primary" type="submit" disabled={savingAction}>Post scrap</button>
        </form>
      </ModalFrame>
      <ModalFrame isOpen={actionModal === 'return'} onClose={closeActionModal}>
        <form onSubmit={submitReturn} className="space-y-3" onInput={captureEdited} onChange={captureEdited}>
          <h3 className="text-lg font-black text-zarewa-teal">Return material to {coil.coilNo}</h3>
          <input className="z-input w-full" type="number" min="0.01" step="0.01" placeholder="Return kg" value={returnForm.kg} onChange={(e) => setReturnForm((s) => ({ ...s, kg: e.target.value }))} />
          <input className="z-input w-full" placeholder="Reason" value={returnForm.reason} onChange={(e) => setReturnForm((s) => ({ ...s, reason: e.target.value }))} />
          <textarea className="z-input w-full min-h-20" placeholder="Note" value={returnForm.note} onChange={(e) => setReturnForm((s) => ({ ...s, note: e.target.value }))} />
          <button className="z-btn-primary" type="submit" disabled={savingAction}>Post return</button>
        </form>
      </ModalFrame>

      <CoilEditMasterModal
        isOpen={actionModal === 'edit'}
        onClose={closeActionModal}
        coil={coil}
        reservedKg={reservedKg}
        onSaved={async () => {
          await refreshInventory?.();
          await refreshProductionHolders();
        }}
      />

      <CoilDamageRecordModal
        isOpen={damageModalOpen}
        onClose={() => setDamageModalOpen(false)}
        coilLots={coilLots}
        defaultCoilNo={coil?.coilNo || coilNo}
        incidentType={damageModalIncidentType}
        onIncidentTypeChange={(next) => {
          setDamageModalIncidentType(next);
          setIncidentTypePick(next);
        }}
        onSuccess={async () => {
          refreshInventory?.();
          await ws?.refresh?.();
        }}
      />

      <ProductionRegisterEditModal
        isOpen={productionTraceModal != null}
        onClose={() => setProductionTraceModal(null)}
        cuttingListId={productionTraceModal?.cuttingListId}
        subtitle={productionTraceModal?.subtitle}
      />
    </PageShell>
  );
}

