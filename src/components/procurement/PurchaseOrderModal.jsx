import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, UserPlus, X, ChevronDown, Save } from 'lucide-react';
import { ModalFrame } from '../layout/ModalFrame';
import { ProcurementFormSection } from './ProcurementFormSection';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { compareGaugeLabels, compareSelectLabels } from '../../lib/selectOptionSort';
import { colourSelectOptionsFromRows } from '../../lib/colourCanonicalization.js';
import {
  PO_LINE_TYPE_LABELS,
  PO_LINE_TYPES,
  validatePoLine,
} from '../../lib/poLineTypes.js';
import { emptyPoLine } from '../../lib/purchaseOrderDraft.js';
import PoUnifiedLineRow from './PoUnifiedLineRow.jsx';
import { PurchaseOrderBranchConfirm } from './PurchaseOrderBranchConfirm.jsx';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  isBranchScopedCreateBlocked,
  userNeedsPurchaseBranchDoubleConfirm,
  workspaceActiveBranchLabel,
} from '../../lib/workspaceBranchCreate';

const STONE_MATERIAL_TYPE_ID = 'MAT-005';
const labelClass =
  'text-[8px] font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-0.5 block';
const headerInputClass =
  'w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 min-h-[2rem] text-[11px] font-semibold text-[#134e4a] outline-none focus:ring-2 focus:ring-[#134e4a]/15';
const lineInputClass =
  'w-full bg-white border border-slate-200 rounded-md py-0.5 px-1.5 min-h-[1.625rem] h-[1.625rem] text-[10px] font-semibold text-[#134e4a] outline-none focus:ring-2 focus:ring-[#134e4a]/15 leading-none';

const MATERIAL_OPTS = [
  { value: 'aluminium', label: 'Aluminium' },
  { value: 'aluzinc', label: 'Aluzinc' },
];

function stockProductIdForMaterial(kind) {
  if (kind === 'aluzinc') return 'PRD-102';
  if (kind === 'aluminium') return 'COIL-ALU';
  return '';
}

const FALLBACK_GAUGES = ['0.70mm', '0.55mm', '0.45mm', '0.40mm', '0.30mm', '0.24mm'];

export default function PurchaseOrderModal({
  isOpen,
  onClose,
  suppliers,
  masterData = null,
  products = [],
  editDraft = null,
  onSubmit,
  onQuickAddSupplier,
  editApprovalSlot = null,
}) {
  const [supplierID, setSupplierID] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [lines, setLines] = useState([emptyPoLine('coil_kg')]);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [branchConfirmed, setBranchConfirmed] = useState(false);
  const ws = useWorkspace();
  const editPoId = editDraft?.poID ?? '';
  const isNewPo = !editPoId;
  const poBranchBlocked = isNewPo && isBranchScopedCreateBlocked(ws);

  const colourOptions = useMemo(
    () => colourSelectOptionsFromRows(masterData?.colours || [], masterData),
    [masterData]
  );
  const gaugeOptions = useMemo(() => {
    const fromMaster = (masterData?.gauges || [])
      .filter((g) => g.active !== false)
      .map((g) => g.label)
      .filter(Boolean);
    return [...new Set([...fromMaster, ...FALLBACK_GAUGES])].sort(compareGaugeLabels);
  }, [masterData?.gauges]);
  const stoneProfiles = useMemo(() => {
    const rows = masterData?.profiles || [];
    return rows
      .filter((p) => String(p.materialTypeId || '') === STONE_MATERIAL_TYPE_ID && p.active !== false)
      .sort((a, b) => compareSelectLabels(a.name, b.name));
  }, [masterData?.profiles]);
  const accessoryProducts = useMemo(
    () =>
      [...(Array.isArray(products) ? products : []).filter((p) =>
        String(p.productID || '').startsWith('ACC-')
      )].sort((a, b) => compareSelectLabels(a.name || a.productID, b.name || b.productID)),
    [products]
  );
  const suppliersSorted = useMemo(
    () => [...(suppliers || [])].sort((a, b) => compareSelectLabels(a.name, b.name)),
    [suppliers]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (editPoId && editDraft) {
      setSupplierID(editDraft.supplierID || '');
      setOrderDate(editDraft.orderDateISO || new Date().toISOString().slice(0, 10));
      setExpectedDelivery(editDraft.expectedDeliveryISO || '');
      setLines(Array.isArray(editDraft.lines) && editDraft.lines.length ? editDraft.lines : [emptyPoLine('coil_kg')]);
      setFormError('');
      return;
    }
    setSupplierID('');
    setOrderDate(new Date().toISOString().slice(0, 10));
    setExpectedDelivery('');
    setLines([emptyPoLine('coil_kg')]);
    setFormError('');
    setBranchConfirmed(false);
  }, [isOpen, editPoId, editDraft]);

  const setLine = (idx, patch) => setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addRow = () => setLines((r) => [...r, emptyPoLine('coil_kg')]);
  const removeRow = (idx) => setLines((r) => (r.length <= 1 ? r : r.filter((_, i) => i !== idx)));

  const lineTotals = useMemo(
    () =>
      lines.map((l) => {
        if (l.lineType === 'stone_meter') return (Number(l.metres) || 0) * (Number(l.pricePerM) || 0);
        if (l.lineType === 'stone_flatsheet') return (Number(l.sheets) || 0) * (Number(l.pricePerSheet) || 0);
        if (l.lineType === 'accessory') return (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);
        if (l.lineType === 'coil_meter') return (Number(l.meters) || 0) * (Number(l.pricePerKg) || 0);
        const kg = Number(l.kg) || 0;
        const m = Number(l.meters) || 0;
        const price = Number(l.pricePerKg) || 0;
        if (m > 0 && !(kg > 0)) return m * price;
        return kg * price;
      }),
    [lines]
  );
  const grandTotal = useMemo(() => lineTotals.reduce((s, n) => s + n, 0), [lineTotals]);

  const buildApiLines = async () => {
    const built = [];
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i];
      const lineKey =
        typeof l.existingLineKey === 'string' && l.existingLineKey.trim()
          ? l.existingLineKey.trim()
          : `L${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;

      if (l.lineType === 'coil_kg' || l.lineType === 'coil_meter') {
        const kg = Number(l.kg);
        const metres = Number(l.meters);
        const price = Math.round(Number(l.pricePerKg) || 0);
        const meterOnly = l.lineType === 'coil_meter' || (metres > 0 && !(kg > 0));
        built.push({
          lineKey,
          lineType: meterOnly ? 'coil_meter' : 'coil_kg',
          productID: stockProductIdForMaterial(l.materialKind),
          productName: l.materialKind === 'aluzinc' ? 'Aluzinc coil (kg)' : 'Aluminium coil (kg)',
          color: String(l.color || '').trim(),
          gauge: String(l.gauge || '').trim(),
          metersOffered: meterOnly ? metres : metres > 0 ? metres : null,
          conversionKgPerM: kg > 0 && metres > 0 ? Math.round((kg / metres) * 100) / 100 : null,
          unitPricePerKgNgn: meterOnly ? null : price,
          unitPriceNgn: price,
          qtyOrdered: meterOnly ? metres : kg,
        });
        continue;
      }

      if (l.lineType === 'stone_meter') {
        const ens = await apiFetch('/api/inventory/ensure-stone-product', {
          method: 'POST',
          body: JSON.stringify({
            designLabel: String(l.designLabel || '').trim(),
            colourLabel: String(l.colourLabel || '').trim(),
            gaugeLabel: String(l.gaugeLabel || '').trim(),
          }),
        });
        const pid = ens.data?.productId;
        if (!ens.ok || !ens.data?.ok || !pid) throw new Error(ens.data?.error || 'Could not resolve stone SKU.');
        built.push({
          lineKey,
          lineType: 'stone_meter',
          productID: pid,
          productName: products.find((p) => p.productID === pid)?.name || pid,
          color: String(l.colourLabel || '').trim(),
          gauge: String(l.gaugeLabel || '').trim(),
          metersOffered: Number(l.metres),
          conversionKgPerM: null,
          unitPricePerKgNgn: null,
          unitPriceNgn: Math.round(Number(l.pricePerM) || 0),
          qtyOrdered: Number(l.metres),
        });
        continue;
      }

      if (l.lineType === 'stone_flatsheet') {
        const ens = await apiFetch('/api/inventory/ensure-stone-flatsheet-product', {
          method: 'POST',
          body: JSON.stringify({
            colourLabel: String(l.fsColour || '').trim(),
            lengthM: Number(l.fsLengthM),
          }),
        });
        const pid = ens.data?.productId;
        if (!ens.ok || !ens.data?.ok || !pid) {
          throw new Error(ens.data?.error || 'Could not resolve stone flatsheet SKU.');
        }
        built.push({
          lineKey,
          lineType: 'stone_flatsheet',
          productID: pid,
          productName: products.find((p) => p.productID === pid)?.name || pid,
          color: String(l.fsColour || '').trim(),
          gauge: '',
          metersOffered: Number(l.fsLengthM),
          conversionKgPerM: null,
          unitPricePerKgNgn: null,
          unitPriceNgn: Math.round(Number(l.pricePerSheet) || 0),
          qtyOrdered: Number(l.sheets),
        });
        continue;
      }

      if (l.lineType === 'accessory') {
        const unitPrice = Math.round(Number(l.unitPrice) || 0);
        built.push({
          lineKey,
          lineType: 'accessory',
          productID: String(l.productID || '').trim(),
          productName: accessoryProducts.find((p) => p.productID === l.productID)?.name || l.productID,
          color: '',
          gauge: '',
          metersOffered: null,
          conversionKgPerM: null,
          unitPricePerKgNgn: unitPrice,
          unitPriceNgn: unitPrice,
          qtyOrdered: Number(l.qty),
        });
      }
    }
    return built;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (isNewPo && poBranchBlocked) {
      setFormError(ws?.branchScopedCreateMessage || 'Select a single branch workspace before creating a purchase order.');
      return;
    }
    if (isNewPo && !branchConfirmed) {
      setFormError('Confirm the branch for this purchase using the checkbox above.');
      return;
    }
    if (isNewPo && userNeedsPurchaseBranchDoubleConfirm(ws?.session?.user?.roleKey)) {
      const { label } = workspaceActiveBranchLabel(ws);
      if (
        !window.confirm(
          `Save this purchase order for ${label}?\n\nStock receipts, payments, and reports will stay in that branch. Cancel if you meant a different factory.`
        )
      ) {
        return;
      }
    }
    if (!supplierID.trim()) {
      setFormError('Select a supplier.');
      return;
    }
    const sup = suppliers.find((s) => s.supplierID === supplierID);
    if (!sup) {
      setFormError('Supplier not found.');
      return;
    }
    setBusy(true);
    try {
      const builtLines = await buildApiLines();
      if (!builtLines.length) {
        setFormError('Add at least one line.');
        return;
      }
      for (const bl of builtLines) {
        const v = validatePoLine(bl);
        if (!v.ok) {
          setFormError(v.error);
          return;
        }
      }
      const payload = editPoId
        ? {
            poID: editPoId,
            supplierID: sup.supplierID,
            supplierName: sup.name,
            orderDateISO: orderDate,
            expectedDeliveryISO: expectedDelivery,
            lines: builtLines,
          }
        : {
            supplierID: sup.supplierID,
            supplierName: sup.name,
            orderDateISO: orderDate,
            expectedDeliveryISO: expectedDelivery,
            lines: builtLines,
          };
      const ok = await onSubmit?.(payload);
      if (ok !== false) onClose?.();
    } catch (err) {
      setFormError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={editPoId ? 'Edit purchase order' : 'New purchase order'}
      description="Coils, stone metres, stone flatsheet, and accessories on one supplier order."
    >
      <div className="z-modal-panel max-w-[min(100%,min(96vw,56rem))] w-full max-h-[min(92vh,860px)] flex flex-col mx-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#134e4a]">{editPoId ? 'Edit purchase order' : 'New purchase order'}</h2>
            <p className="text-[9px] text-slate-400 uppercase">Mixed line types</p>
          </div>
          <button type="button" onClick={onClose} className="p-2.5 rounded-xl bg-slate-50" aria-label="Close"><X size={20} /></button>
        </div>
        <form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit}>
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {isNewPo ? (
              <PurchaseOrderBranchConfirm confirmed={branchConfirmed} onConfirmedChange={setBranchConfirmed} />
            ) : null}
            <ProcurementFormSection letter="A" title="Supplier & dates" action={<button type="button" onClick={onQuickAddSupplier} className="text-[9px] font-semibold text-[#134e4a] uppercase"><UserPlus size={12} className="inline" /> New supplier</button>}>
              <div className="grid md:grid-cols-3 gap-4">
                <div><label className={labelClass}>Supplier *</label><select required value={supplierID} onChange={(e) => setSupplierID(e.target.value)} className={headerInputClass}><option value="">Select…</option>{suppliersSorted.map((s) => <option key={s.supplierID} value={s.supplierID}>{s.name}</option>)}</select></div>
                <div><label className={labelClass}>Order date</label><input required type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={headerInputClass} /></div>
                <div><label className={labelClass}>Expected</label><input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} className={headerInputClass} /></div>
              </div>
            </ProcurementFormSection>
            <ProcurementFormSection letter="B" title="Lines">
              <div className="space-y-2">{lines.map((row, idx) => (<PoUnifiedLineRow key={row.rowUid} row={row} idx={idx} lineTotal={lineTotals[idx]} colourOptions={colourOptions} gaugeOptions={gaugeOptions} stoneProfiles={stoneProfiles} accessoryProducts={accessoryProducts} onChange={setLine} onAdd={addRow} onRemove={removeRow} />))}</div>
            </ProcurementFormSection>
            {formError ? <p className="text-xs text-rose-600 font-semibold">{formError}</p> : null}
            {editApprovalSlot}
          </div>
          <div className="px-5 py-4 bg-[#134e4a] text-white flex justify-between shrink-0">
            <div><p className="text-[9px] uppercase text-white/60">Total</p><p className="text-xl font-bold">{formatNgn(grandTotal)}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg bg-white/10 text-[9px] uppercase">Cancel</button>
              <button
                type="submit"
                disabled={busy || (isNewPo && (poBranchBlocked || !branchConfirmed))}
                className="px-4 py-2 rounded-lg bg-white text-[#134e4a] text-[9px] uppercase inline-flex gap-1 items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} /> Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </ModalFrame>
  );
}

