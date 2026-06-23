/* eslint-disable react-refresh/only-export-components -- context + hook */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiFetch } from '../lib/apiBase';
import { roundConv2 } from '../lib/conversionKgPerM.js';
import { procurementKindFromPo } from '../lib/procurementPoKind';
import { purchaseOrderInTransitTransportWarning } from '../lib/purchaseOrderWorkflow';
import { branchScopedCreateBlockedMessage, isBranchScopedCreateBlocked } from '../lib/workspaceBranchCreate';
import { useWorkspace } from './WorkspaceContext';

const InventoryContext = createContext(null);

function clonePo(po) {
  return {
    ...po,
    lines: po.lines.map((l) => ({ ...l })),
  };
}

function nextPoId(list) {
  const nums = list
    .map((p) => parseInt(String(p.poID).replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `PO-2026-${String(n).padStart(3, '0')}`;
}

function productMatchesBranchScope(p, productID, branchScope) {
  if (p.productID !== productID) return false;
  if (!branchScope || branchScope === 'ALL') return true;
  return !p.branchId || String(p.branchId) === String(branchScope);
}

function normalizePoLine(l, idx, catalog = []) {
  const p = catalog.find((x) => x.productID === l.productID);
  const kg = Number(l.qtyOrdered) || 0;
  const perKg =
    l.unitPricePerKgNgn != null && l.unitPricePerKgNgn !== ''
      ? Number(l.unitPricePerKgNgn)
      : Number(l.unitPriceNgn) || 0;
  const legacyUnit = Number(l.unitPriceNgn) || 0;
  const hasExplicitPerKg = l.unitPricePerKgNgn != null && l.unitPricePerKgNgn !== '';
  return {
    ...l,
    lineKey: l.lineKey || `L${idx}-${l.productID}`,
    lineType: l.lineType || l.line_type || '',
    productName: l.productName || p?.name || l.productID,
    qtyOrdered: kg,
    unitPricePerKgNgn: hasExplicitPerKg ? perKg : legacyUnit,
    unitPriceNgn: hasExplicitPerKg ? perKg : legacyUnit,
    qtyReceived: Number(l.qtyReceived) || 0,
    color: l.color ?? '',
    gauge: l.gauge ?? '',
    metersOffered: l.metersOffered != null && l.metersOffered !== '' ? Number(l.metersOffered) : null,
    conversionKgPerM: roundConv2(l.conversionKgPerM),
  };
}

function normalizePurchaseOrder(po, catalog = []) {
  const lines = po.lines.map((l, i) => normalizePoLine(l, i, catalog));
  const procurementKind = procurementKindFromPo({ procurementKind: po.procurementKind, lines });
  return {
    ...po,
    procurementKind,
    transportAgentId: po.transportAgentId ?? '',
    transportAgentName: po.transportAgentName ?? '',
    transportReference: po.transportReference ?? '',
    transportNote: po.transportNote ?? '',
    transportFinanceAdvice: po.transportFinanceAdvice ?? '',
    transportTreasuryMovementId: po.transportTreasuryMovementId ?? '',
    transportAmountNgn: Number(po.transportAmountNgn) || 0,
    transportAdvanceNgn: Number(po.transportAdvanceNgn) || 0,
    transportPaidNgn: Number(po.transportPaidNgn) || 0,
    transportPaid: Boolean(po.transportPaid),
    transportPaidAtISO: po.transportPaidAtISO ?? '',
    supplierPaidNgn: Number(po.supplierPaidNgn) || 0,
    lines,
  };
}

function poLineFullyReceived(line) {
  return Number(line.qtyReceived) >= Number(line.qtyOrdered);
}

function findPoLine(po, entry) {
  if (entry.lineKey) return po.lines.find((l) => l.lineKey === entry.lineKey);
  return po.lines.find((l) => l.productID === entry.productID);
}

export function InventoryProvider({ children }) {
  const ws = useWorkspace();
  const wsBranchScope = ws?.branchScope ?? null;
  const wsHasWorkspaceData = ws?.hasWorkspaceData;
  const wsSnapshot = ws?.snapshot;
  const wsCanMutate = ws?.canMutate;
  const wsRefresh = ws?.refresh;
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [movements, setMovements] = useState([]);
  const [coilLots, setCoilLots] = useState([]);
  const [coilControlEvents, setCoilControlEvents] = useState([]);
  const [materialIncidents, setMaterialIncidents] = useState([]);
  const [materialPoolSummary, setMaterialPoolSummary] = useState(null);
  const [wipByProduct, setWipByProduct] = useState({});
  const [inTransitLoads, setInTransitLoads] = useState([]);

  /**
   * Mirror server lists into React state whenever the workspace snapshot advances (`refreshEpoch`:
   * initial load, saves, periodic background bootstrap). Local optimistic updates should merge back
   * via the next successful refresh or be re-applied after sync.
   */
  useEffect(() => {
    if (!wsHasWorkspaceData || !wsSnapshot) {
      setProducts([]);
      setPurchaseOrders([]);
      setMovements([]);
      setCoilLots([]);
      setCoilControlEvents([]);
      setMaterialIncidents([]);
      setMaterialPoolSummary(null);
      setWipByProduct({});
      setInTransitLoads([]);
      return;
    }
    const s = wsSnapshot;
    if (Array.isArray(s.products)) {
      setProducts(s.products.map((p) => ({ ...p })));
    }
    if (Array.isArray(s.purchaseOrders)) {
      const catalog = Array.isArray(s.products) ? s.products : [];
      setPurchaseOrders(s.purchaseOrders.map((po) => clonePo(normalizePurchaseOrder(po, catalog))));
    }
    if (Array.isArray(s.movements)) {
      setMovements(s.movements.map((m) => ({ ...m })));
    }
    if (Array.isArray(s.coilControlEvents)) {
      setCoilControlEvents(s.coilControlEvents.map((e) => ({ ...e })));
    } else {
      setCoilControlEvents([]);
    }
    if (Array.isArray(s.materialIncidents)) {
      setMaterialIncidents(s.materialIncidents.map((e) => ({ ...e })));
    } else {
      setMaterialIncidents([]);
    }
    setMaterialPoolSummary(s.materialPoolSummary ?? null);
    if (Array.isArray(s.coilLots)) {
      setCoilLots(
        s.coilLots.map((lot) => ({
          coilNo: lot.coilNo,
          productID: lot.productID,
          lineKey: lot.lineKey ?? null,
          qtyReceived: lot.qtyReceived,
          weightKg: lot.weightKg,
          colour: lot.colour ?? '',
          gaugeLabel: lot.gaugeLabel ?? '',
          materialTypeName: lot.materialTypeName ?? '',
          supplierExpectedMeters: lot.supplierExpectedMeters ?? null,
          supplierConversionKgPerM: roundConv2(lot.supplierConversionKgPerM),
          qtyRemaining: Number(lot.qtyRemaining) || 0,
          qtyReserved: Number(lot.qtyReserved) || 0,
          currentWeightKg: Number(lot.currentWeightKg) || 0,
          currentStatus: lot.currentStatus ?? 'Available',
          location: lot.location,
          poID: lot.poID,
          supplierID: lot.supplierID,
          supplierName: lot.supplierName,
          receivedAtISO: lot.receivedAtISO,
          parentCoilNo: lot.parentCoilNo ?? '',
          materialOriginNote: lot.materialOriginNote ?? '',
        }))
      );
    }
    if (s.wipByProduct && typeof s.wipByProduct === 'object') {
      setWipByProduct({ ...s.wipByProduct });
    }
    if (Array.isArray(s.inTransitLoads)) {
      setInTransitLoads(s.inTransitLoads.map((load) => ({ ...load, lines: Array.isArray(load.lines) ? load.lines.map((line) => ({ ...line })) : [] })));
    }
  }, [wsHasWorkspaceData, wsSnapshot]);
   

  const appendMovement = useCallback(
    (entry) => {
      const branchId =
        entry.branchId ??
        (wsBranchScope && wsBranchScope !== 'ALL' ? wsBranchScope : '');
      setMovements((prev) => [
        {
          id: `MV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          atISO: new Date().toISOString().slice(0, 19),
          ...entry,
          ...(branchId ? { branchId } : {}),
        },
        ...prev,
      ]);
    },
    [wsBranchScope]
  );

  const getProduct = useCallback(
    (productID) => {
      const pid = String(productID || '').trim();
      if (!pid) return undefined;
      if (wsBranchScope && wsBranchScope !== 'ALL') {
        return (
          products.find(
            (p) =>
              p.productID === pid &&
              (!p.branchId || String(p.branchId) === String(wsBranchScope))
          ) ?? products.find((p) => p.productID === pid)
        );
      }
      return products.find((p) => p.productID === pid);
    },
    [products, wsBranchScope]
  );

  const createPurchaseOrder = useCallback(
    async ({
      supplierID,
      supplierName,
      orderDateISO,
      expectedDeliveryISO,
      lines,
      status = 'Approved',
    }) => {
      if (isBranchScopedCreateBlocked(ws)) {
        return { ok: false, error: branchScopedCreateBlockedMessage(ws) };
      }
      const normalizedLines = lines
        .filter((l) => l.productID && Number(l.qtyOrdered) > 0)
        .map((l, idx) =>
          normalizePoLine(
            {
              lineKey: l.lineKey || `L${Date.now()}-${idx}-${l.productID}`,
              productID: l.productID,
              productName: l.productName,
              color: l.color,
              gauge: l.gauge,
              metersOffered: l.metersOffered,
              conversionKgPerM: l.conversionKgPerM,
              unitPricePerKgNgn: l.unitPricePerKgNgn ?? l.unitPriceNgn,
              qtyOrdered: l.qtyOrdered,
              unitPriceNgn: l.unitPriceNgn ?? l.unitPricePerKgNgn,
              qtyReceived: 0,
            },
            idx,
            products
          )
        );
      if (!normalizedLines.length) return { ok: false, error: 'Add at least one valid line.' };

      if (wsCanMutate) {
        const { ok, data } = await apiFetch('/api/purchase-orders', {
          method: 'POST',
          body: JSON.stringify({
            supplierID,
            supplierName,
            orderDateISO: orderDateISO || new Date().toISOString().slice(0, 10),
            expectedDeliveryISO: expectedDeliveryISO || '',
            status,
            lines: normalizedLines.map((l) => ({
              lineKey: l.lineKey,
              productID: l.productID,
              productName: l.productName,
              color: l.color,
              gauge: l.gauge,
              metersOffered: l.metersOffered,
              conversionKgPerM: l.conversionKgPerM,
              unitPricePerKgNgn: l.unitPricePerKgNgn,
              unitPriceNgn: l.unitPriceNgn,
              qtyOrdered: l.qtyOrdered,
              qtyReceived: 0,
            })),
          }),
        });
        if (!ok || !data?.ok) {
          return { ok: false, error: data?.error || 'Could not create PO on server.' };
        }
        const poID = String(data.poID || '').trim();
        setPurchaseOrders((prev) => {
          const row = normalizePurchaseOrder(
            {
              poID,
              supplierID,
              supplierName,
              orderDateISO: orderDateISO || new Date().toISOString().slice(0, 10),
              expectedDeliveryISO: expectedDeliveryISO || '',
              status,
              invoiceNo: '',
              invoiceDateISO: '',
              deliveryDateISO: '',
              transportAgentId: '',
              transportAgentName: '',
              transportReference: '',
              transportNote: '',
              transportPaid: false,
              transportPaidAtISO: '',
              supplierPaidNgn: 0,
              lines: normalizedLines,
            },
            products
          );
          return [row, ...prev.filter((p) => p.poID !== poID)];
        });
        appendMovement({
          type: 'PO_CREATED',
          ref: poID,
          detail: `${supplierName} · ${normalizedLines.length} coil line(s)`,
        });
        void wsRefresh?.();
        return { ok: true, poID };
      }

      let createdId = '';
      setPurchaseOrders((prev) => {
        const poID = nextPoId(prev);
        createdId = poID;
        const row = normalizePurchaseOrder(
          {
            poID,
            supplierID,
            supplierName,
            orderDateISO: orderDateISO || new Date().toISOString().slice(0, 10),
            expectedDeliveryISO: expectedDeliveryISO || '',
            status,
            invoiceNo: '',
            invoiceDateISO: '',
            deliveryDateISO: '',
            transportAgentId: '',
            transportAgentName: '',
            transportReference: '',
            transportNote: '',
            transportPaid: false,
            transportPaidAtISO: '',
            supplierPaidNgn: 0,
            lines: normalizedLines,
          },
          products
        );
        return [row, ...prev];
      });
      appendMovement({
        type: 'PO_CREATED',
        ref: createdId,
        detail: `${supplierName} · ${normalizedLines.length} coil line(s)`,
      });
      return { ok: true, poID: createdId };
    },
    [appendMovement, products, ws, wsCanMutate, wsRefresh]
  );

  const updatePurchaseOrder = useCallback(
    async ({
      poID,
      supplierID,
      supplierName,
      orderDateISO,
      expectedDeliveryISO,
      lines,
      editApprovalId,
    }) => {
      const id = String(poID || '').trim();
      if (!id) return { ok: false, error: 'Purchase order not found.' };

      const normalizedLines = lines
        .filter((l) => l.productID && Number(l.qtyOrdered) > 0)
        .map((l, idx) =>
          normalizePoLine(
            {
              lineKey: l.lineKey || `L${Date.now()}-${idx}-${l.productID}`,
              productID: l.productID,
              productName: l.productName,
              color: l.color,
              gauge: l.gauge,
              metersOffered: l.metersOffered,
              conversionKgPerM: l.conversionKgPerM,
              unitPricePerKgNgn: l.unitPricePerKgNgn ?? l.unitPriceNgn,
              qtyOrdered: l.qtyOrdered,
              unitPriceNgn: l.unitPriceNgn ?? l.unitPricePerKgNgn,
              qtyReceived: 0,
            },
            idx,
            products
          )
        );
      if (!normalizedLines.length) return { ok: false, error: 'Add at least one valid line.' };

      if (wsCanMutate) {
        const { ok, data } = await apiFetch(`/api/purchase-orders/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            supplierID,
            supplierName,
            orderDateISO: orderDateISO || new Date().toISOString().slice(0, 10),
            expectedDeliveryISO: expectedDeliveryISO || '',
            lines: normalizedLines.map((l) => ({
              lineKey: l.lineKey,
              productID: l.productID,
              productName: l.productName,
              color: l.color,
              gauge: l.gauge,
              metersOffered: l.metersOffered,
              conversionKgPerM: l.conversionKgPerM,
              unitPricePerKgNgn: l.unitPricePerKgNgn,
              unitPriceNgn: l.unitPriceNgn,
              qtyOrdered: l.qtyOrdered,
            })),
            ...(editApprovalId ? { editApprovalId: String(editApprovalId).trim() } : {}),
          }),
        });
        if (!ok || !data?.ok) {
          return { ok: false, error: data?.error || 'Could not update PO on server.' };
        }
        setPurchaseOrders((prev) =>
          prev.map((p) => {
            if (p.poID !== id) return p;
            const receivedByKey = new Map(p.lines.map((line) => [line.lineKey, line.qtyReceived]));
            const linesWithReceipts = normalizedLines.map((line) => ({
              ...line,
              qtyReceived: receivedByKey.get(line.lineKey) ?? line.qtyReceived ?? 0,
            }));
            return normalizePurchaseOrder(
              {
                ...p,
                supplierID,
                supplierName,
                orderDateISO: orderDateISO || new Date().toISOString().slice(0, 10),
                expectedDeliveryISO: expectedDeliveryISO || '',
                lines: linesWithReceipts,
              },
              products
            );
          })
        );
        appendMovement({
          type: 'PO_UPDATED',
          ref: id,
          detail: `${supplierName} · ${normalizedLines.length} line(s) revised`,
        });
        void wsRefresh?.();
        return { ok: true, poID: id };
      }

      setPurchaseOrders((prev) =>
        prev.map((p) =>
          p.poID === id
            ? normalizePurchaseOrder(
                {
                  ...p,
                  supplierID,
                  supplierName,
                  orderDateISO: orderDateISO || new Date().toISOString().slice(0, 10),
                  expectedDeliveryISO: expectedDeliveryISO || '',
                  lines: normalizedLines.map((line) => ({
                    ...line,
                    qtyReceived: p.lines.find((pl) => pl.lineKey === line.lineKey)?.qtyReceived ?? 0,
                  })),
                },
                products
              )
            : p
        )
      );
      appendMovement({
        type: 'PO_UPDATED',
        ref: id,
        detail: `${supplierName} · ${normalizedLines.length} line(s) revised`,
      });
      return { ok: true, poID: id };
    },
    [appendMovement, products, wsCanMutate, wsRefresh]
  );

  const linkTransportToPurchaseOrder = useCallback(
    async (
      poID,
      {
        transportAgentId,
        transportAgentName,
        transportReference,
        transportNote,
        transportFinanceAdvice,
        transportAmountNgn,
        transportAdvanceNgn,
        treasuryAccountId,
        dateISO,
        postedAtISO,
        note,
        createdBy,
        editApprovalId,
      } = {}
    ) => {
      if (!wsCanMutate) {
        return {
          ok: false,
          error:
            'Cannot save transport while the workspace is read-only. Reconnect to the server, then try again.',
        };
      }
      const { ok, data } = await apiFetch(
        `/api/purchase-orders/${encodeURIComponent(poID)}/link-transport`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            transportAgentId,
            transportAgentName,
            transportReference,
            transportNote,
            transportFinanceAdvice,
            transportAmountNgn,
            transportAdvanceNgn,
            treasuryAccountId,
            dateISO,
            postedAtISO,
            note,
            createdBy,
            ...(editApprovalId ? { editApprovalId: String(editApprovalId).trim() } : {}),
          }),
        }
      );
      if (!ok || !data?.ok) {
        return { ok: false, error: data?.error || 'Could not link transport.' };
      }
      await wsRefresh?.();
      return { ok: true };
    },
    [wsCanMutate, wsRefresh]
  );

  const postPurchaseOrderTransport = useCallback(
    async (poID, body = {}) => {
      if (!wsCanMutate) {
        return {
          ok: false,
          error:
            'Cannot post transport payment while the workspace is read-only. Reconnect to the server, then try again.',
        };
      }
      const { ok, data } = await apiFetch(`/api/purchase-orders/${encodeURIComponent(poID)}/post-transport`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!ok || !data?.ok) {
        return { ok: false, error: data?.error || 'Could not post transport.' };
      }
      await wsRefresh?.();
      return { ok: true };
    },
    [wsCanMutate, wsRefresh]
  );

  const recordPurchaseSupplierPayment = useCallback(
    async (poID, amountNgn, note = '', opts = {}) => {
      const amt = Number(amountNgn);
      if (Number.isNaN(amt) || amt <= 0) return { ok: false, error: 'Invalid amount.' };
      if (wsCanMutate) {
        const { ok, data } = await apiFetch(
          `/api/purchase-orders/${encodeURIComponent(poID)}/supplier-payment`,
          {
            method: 'POST',
            body: JSON.stringify({
              amountNgn: amt,
              note,
              treasuryAccountId: opts.treasuryAccountId,
              reference: opts.reference,
              dateISO: opts.dateISO,
              createdBy: opts.createdBy,
            }),
          }
        );
        if (!ok || !data?.ok) {
          return { ok: false, error: data?.error || 'Could not record payment.' };
        }
        await wsRefresh?.();
        return { ok: true };
      }
      setPurchaseOrders((prev) =>
        prev.map((p) =>
          p.poID === poID
            ? { ...p, supplierPaidNgn: (Number(p.supplierPaidNgn) || 0) + amt }
            : p
        )
      );
      appendMovement({
        type: 'PO_SUPPLIER_PAYMENT',
        ref: poID,
        detail: `${amt}${note ? ` — ${note}` : ''}`,
      });
      return { ok: true };
    },
    [appendMovement, wsCanMutate, wsRefresh]
  );

  const setPurchaseOrderStatus = useCallback(
    async (poID, status, { editApprovalId, acknowledgeTransportGap } = {}) => {
      const normalizedStatus = String(status || '').trim();
      let ackTransportGap = Boolean(acknowledgeTransportGap);
      if (normalizedStatus === 'In Transit' && !ackTransportGap) {
        const po = purchaseOrders.find((p) => p.poID === poID);
        const warning = purchaseOrderInTransitTransportWarning(po);
        if (warning && typeof window !== 'undefined') {
          if (!window.confirm(warning)) {
            return { ok: false, cancelled: true };
          }
          ackTransportGap = true;
        }
      }
      if (wsCanMutate) {
        const { ok, data } = await apiFetch(
          `/api/purchase-orders/${encodeURIComponent(poID)}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              status,
              ...(editApprovalId ? { editApprovalId: String(editApprovalId).trim() } : {}),
              ...(ackTransportGap ? { acknowledgeTransportGap: true } : {}),
            }),
          }
        );
        if (!ok || !data?.ok) {
          return {
            ok: false,
            error: data?.error || 'Could not update PO status.',
            needsAcknowledgement: Boolean(data?.needsAcknowledgement),
            code: data?.code,
          };
        }
        await wsRefresh?.();
        return { ok: true };
      }
      setPurchaseOrders((prev) =>
        prev.map((p) => (p.poID === poID ? { ...p, status } : p))
      );
      appendMovement({ type: 'PO_STATUS', ref: poID, detail: status });
      return { ok: true };
    },
    [appendMovement, purchaseOrders, wsCanMutate, wsRefresh]
  );

  const confirmStoreReceipt = useCallback(
    async (poID, entries, { supplierID: sid, supplierName: sname } = {}, opts = {}) => {
      const po = purchaseOrders.find((p) => p.poID === poID);
      if (!po) return { ok: false, error: 'Purchase order not found.' };
      if (!['On loading', 'In Transit', 'Approved'].includes(po.status)) {
        return {
          ok: false,
          error: 'PO must be on loading, in transit, or approved before store receipt.',
        };
      }
      for (const e of entries) {
        const qty = Number(e.qtyReceived);
        if (Number.isNaN(qty) || qty <= 0) {
          return { ok: false, error: 'Enter a valid quantity received.' };
        }
        const line = findPoLine(po, e);
        if (!line) {
          return {
            ok: false,
            error: e.lineKey
              ? `Line ${e.lineKey} not on this PO.`
              : `Product ${e.productID} not on this PO.`,
          };
        }
      }

      if (wsCanMutate) {
        const { ok, data } = await apiFetch(
          `/api/purchase-orders/${encodeURIComponent(poID)}/grn`,
          {
            method: 'POST',
            body: JSON.stringify({
              entries,
              supplierID: sid,
              supplierName: sname,
              allowConversionMismatch: Boolean(opts.allowConversionMismatch),
            }),
          }
        );
        if (!ok || !data?.ok) {
          return { ok: false, error: data?.error || 'GRN failed on server.' };
        }
        await wsRefresh?.();
        return {
          ok: true,
          coilNos: data.coilNos || [],
          mdShortReceiptAlerts: data.mdShortReceiptAlerts || [],
        };
      }

      /* Offline / demo GRN (no API): synthetic coil IDs (CL-YY-####) from a local counter only.
         The live server assigns coil numbers when POST /api/purchase-orders/:id/grn succeeds — do not expect IDs to match. */
      const coilYy = String(new Date().getFullYear()).slice(-2);
      const coilNumbers = [];

      setCoilLots((prevLots) => {
        let seq = prevLots.length;
        const newLots = entries.map((e) => {
          seq += 1;
          const coilNo =
            e.coilNo?.trim() ||
            `CL-${coilYy}-${String(seq).padStart(4, '0')}`;
          coilNumbers.push(coilNo);
          const w = e.weightKg != null && e.weightKg !== '' ? Number(e.weightKg) : null;
          const qty = Number(e.qtyReceived);
          const line = po.lines.find((l) =>
            e.lineKey ? l.lineKey === e.lineKey : l.productID === e.productID
          );
          const initialKg = w != null && !Number.isNaN(w) ? w : qty;
          return {
            coilNo,
            productID: e.productID,
            lineKey: e.lineKey ?? null,
            qtyReceived: qty,
            weightKg: w != null && !Number.isNaN(w) ? w : null,
            colour: line?.color ?? '',
            gaugeLabel: line?.gauge != null && line?.gauge !== '' ? String(line.gauge) : '',
            materialTypeName: '',
            supplierExpectedMeters: line?.metersOffered ?? null,
            supplierConversionKgPerM: roundConv2(line?.conversionKgPerM),
            qtyRemaining: initialKg,
            qtyReserved: 0,
            currentWeightKg: initialKg,
            currentStatus: 'Available',
            location: e.location?.trim() || null,
            poID,
            supplierID: sid ?? po.supplierID,
            supplierName: sname ?? po.supplierName,
            receivedAtISO: new Date().toISOString().slice(0, 10),
          };
        });
        return [...newLots, ...prevLots];
      });

      setPurchaseOrders((prev) =>
        prev.map((p) => {
          if (p.poID !== poID) return p;
          const nextLines = p.lines.map((l) => {
            const hit = entries.find((x) =>
              x.lineKey ? x.lineKey === l.lineKey : x.productID === l.productID
            );
            if (!hit) return l;
            const q = Number(hit.qtyReceived);
            const received = l.qtyReceived + q;
            const ordered = Number(l.qtyOrdered) || 0;
            const closedReceived =
              ordered > 0 && received > 0 && received < ordered ? ordered : received;
            return { ...l, qtyReceived: closedReceived };
          });
          const allIn = nextLines.every(poLineFullyReceived);
          const nextStatus = allIn ? 'Received' : p.status;
          return { ...p, lines: nextLines, status: nextStatus };
        })
      );

      const deltaByProduct = {};
      for (const e of entries) {
        const pid = e.productID;
        const w = e.weightKg != null && e.weightKg !== '' ? Number(e.weightKg) : null;
        const line = po.lines.find((l) =>
          e.lineKey ? l.lineKey === e.lineKey : l.productID === e.productID
        );
        const isStone = /^STONE-/i.test(String(line?.productID || e.productID || '').trim());
        const isAcc = /^ACC-/i.test(String(line?.productID || e.productID || '').trim());
        const qtyDelta = isStone || isAcc ? Number(e.qtyReceived) : w != null && !Number.isNaN(w) && w > 0 ? w : Number(e.qtyReceived);
        deltaByProduct[pid] = (deltaByProduct[pid] || 0) + qtyDelta;
      }
      setProducts((prev) =>
        prev.map((p) => {
          const d = deltaByProduct[p.productID];
          if (!d) return p;
          if (
            wsBranchScope &&
            wsBranchScope !== 'ALL' &&
            p.branchId &&
            String(p.branchId) !== String(wsBranchScope)
          ) {
            return p;
          }
          return { ...p, stockLevel: p.stockLevel + d };
        })
      );

      for (let i = 0; i < entries.length; i += 1) {
        const e = entries[i];
        appendMovement({
          type: 'STORE_GRN',
          ref: poID,
          productID: e.productID,
          qty: Number(e.qtyReceived),
          detail: `${coilNumbers[i] || 'GRN'} · ${e.location || 'main store'}`,
        });
      }

      return { ok: true, coilNos: coilNumbers };
    },
    [purchaseOrders, appendMovement, wsCanMutate, wsRefresh]
  );

  const adjustStock = useCallback(
    async (productID, type, qty, reasonCode, note, dateISO, opts = {}) => {
      const q = Number(qty);
      if (Number.isNaN(q) || q <= 0) return { ok: false, error: 'Invalid quantity.' };
      if (wsCanMutate) {
        const { ok, status, data } = await apiFetch('/api/inventory/adjust', {
          method: 'POST',
          body: JSON.stringify({
            productID,
            type,
            qty: q,
            reasonCode,
            note,
            dateISO: dateISO || new Date().toISOString().slice(0, 10),
            acknowledgeCoilSkuDrift: Boolean(opts.acknowledgeCoilSkuDrift),
          }),
        });
        if (status === 409 && data?.code === 'COIL_SKU_DRIFT') {
          return {
            ok: false,
            code: data.code,
            error: data?.error || 'Coil lots exist for this SKU.',
            coilLotCount: data?.coilLotCount,
          };
        }
        if (!ok || !data?.ok) {
          return { ok: false, error: data?.error || 'Adjustment failed on server.' };
        }
        await wsRefresh?.();
        return { ok: true };
      }
      const delta = type === 'Increase' ? q : -q;
      setProducts((prev) =>
        prev.map((p) => {
          if (!productMatchesBranchScope(p, productID, wsBranchScope)) return p;
          const raw = p.stockLevel + delta;
          const allowNeg = /^ACC-/i.test(String(productID));
          const next = allowNeg ? raw : Math.max(0, raw);
          return { ...p, stockLevel: next };
        })
      );
      appendMovement({
        type: 'ADJUSTMENT',
        productID,
        qty: delta,
        detail: `${reasonCode}${note ? ` — ${note}` : ''}`,
        dateISO: dateISO || new Date().toISOString().slice(0, 10),
      });
      return { ok: true };
    },
    [appendMovement, wsBranchScope, wsCanMutate, wsRefresh]
  );

  const transferToProduction = useCallback(
    async (productID, qty, productionOrderId, dateISO) => {
      const q = Number(qty);
      if (Number.isNaN(q) || q <= 0) return { ok: false, error: 'Invalid quantity.' };
      const p = getProduct(productID);
      if (!p || p.stockLevel < q) {
        return { ok: false, error: 'Insufficient stock in store.' };
      }
      if (wsCanMutate) {
        const { ok, data } = await apiFetch('/api/inventory/transfer-to-production', {
          method: 'POST',
          body: JSON.stringify({
            productID,
            qty: q,
            productionOrderId,
            dateISO: dateISO || new Date().toISOString().slice(0, 10),
          }),
        });
        if (!ok || !data?.ok) {
          return { ok: false, error: data?.error || 'Transfer failed on server.' };
        }
        await wsRefresh?.();
        return { ok: true };
      }
      setProducts((prev) =>
        prev.map((x) =>
          productMatchesBranchScope(x, productID, wsBranchScope)
            ? { ...x, stockLevel: x.stockLevel - q }
            : x
        )
      );
      setWipByProduct((prev) => ({
        ...prev,
        [productID]: (prev[productID] || 0) + q,
      }));
      appendMovement({
        type: 'TRANSFER_TO_PRODUCTION',
        productID,
        qty: q,
        ref: productionOrderId,
        dateISO: dateISO || new Date().toISOString().slice(0, 10),
      });
      return { ok: true };
    },
    [getProduct, appendMovement, wsBranchScope, wsCanMutate, wsRefresh]
  );

  const receiveFinishedGoods = useCallback(
    async (
      productID,
      qty,
      unitPriceNgn,
      productionOrderId,
      dateISO,
      wipRelease = null,
      extras = {}
    ) => {
      const q = Number(qty);
      if (Number.isNaN(q) || q <= 0) return { ok: false, error: 'Invalid quantity.' };

      const src = wipRelease?.wipSourceProductID?.trim?.() ?? '';
      const wqRaw = wipRelease?.wipQtyReleased;
      if (src) {
        const wq = Number(wqRaw);
        const cur = wipByProduct[src] || 0;
        if (Number.isNaN(wq) || wq <= 0) {
          return {
            ok: false,
            error: 'Enter WIP consumed (same unit as transfer, e.g. kg) for the selected source.',
          };
        }
        if (wq > cur) {
          return {
            ok: false,
            error: `Insufficient WIP on ${src} (${cur} available). Transfer from store first.`,
          };
        }
      }

      if (wsCanMutate) {
        const { ok, data } = await apiFetch('/api/inventory/finished-goods', {
          method: 'POST',
          body: JSON.stringify({
            productID,
            qty: q,
            unitPriceNgn: Number(unitPriceNgn) || 0,
            productionOrderId,
            dateISO: dateISO || new Date().toISOString().slice(0, 10),
            wipRelease: wipRelease || undefined,
            extras: extras || {},
          }),
        });
        if (!ok || !data?.ok) {
          return { ok: false, error: data?.error || 'Finished goods post failed on server.' };
        }
        await wsRefresh?.();
        return { ok: true };
      }

      if (src) {
        const wq = Number(wqRaw);
        setWipByProduct((prev) => ({
          ...prev,
          [src]: Math.max(0, (prev[src] || 0) - wq),
        }));
        appendMovement({
          type: 'WIP_CONSUMED',
          productID: src,
          qty: -wq,
          ref: productionOrderId,
          detail: `Released to FG ${productID}`,
          dateISO: dateISO || new Date().toISOString().slice(0, 10),
        });
      }

      setProducts((prev) =>
        prev.map((x) =>
          productMatchesBranchScope(x, productID, wsBranchScope)
            ? { ...x, stockLevel: x.stockLevel + q }
            : x
        )
      );
      const spool =
        extras.spoolKg != null && String(extras.spoolKg).trim() !== ''
          ? Number(extras.spoolKg)
          : null;
      const spoolPart =
        spool != null && !Number.isNaN(spool) && spool >= 0 ? `Spool ${spool} kg` : null;
      appendMovement({
        type: 'FINISHED_GOODS',
        productID,
        qty: q,
        unitPriceNgn: Number(unitPriceNgn) || 0,
        ref: productionOrderId,
        dateISO: dateISO || new Date().toISOString().slice(0, 10),
        ...(spoolPart ? { detail: spoolPart } : {}),
      });
      return { ok: true };
    },
    [appendMovement, wipByProduct, wsBranchScope, wsCanMutate, wsRefresh]
  );

  const value = useMemo(
    () => ({
      products,
      purchaseOrders,
      inTransitLoads,
      movements,
      coilLots,
      coilControlEvents,
      materialIncidents,
      materialPoolSummary,
      refreshInventory: ws?.refresh,
      wipByProduct,
      getProduct,
      createPurchaseOrder,
      updatePurchaseOrder,
      setPurchaseOrderStatus,
      confirmStoreReceipt,
      linkTransportToPurchaseOrder,
      postPurchaseOrderTransport,
      recordPurchaseSupplierPayment,
      adjustStock,
      transferToProduction,
      receiveFinishedGoods,
    }),
    [
      products,
      purchaseOrders,
      inTransitLoads,
      movements,
      coilLots,
      coilControlEvents,
      materialIncidents,
      materialPoolSummary,
      ws?.refresh,
      wipByProduct,
      getProduct,
      createPurchaseOrder,
      updatePurchaseOrder,
      setPurchaseOrderStatus,
      confirmStoreReceipt,
      linkTransportToPurchaseOrder,
      postPurchaseOrderTransport,
      recordPurchaseSupplierPayment,
      adjustStock,
      transferToProduction,
      receiveFinishedGoods,
    ]
  );

  return (
    <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return ctx;
}
