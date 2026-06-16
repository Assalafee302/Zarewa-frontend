import { useEffect, useMemo, useState } from 'react';
import {
  filterQuotationsInRange,
  liveReceivablesNgn,
  paymentReconciliationExceptionQueue,
  productionAttributedRevenueNgn,
  productionOutputDateISO,
} from '../lib/liveAnalytics';
import { apiFetch } from '../lib/apiBase';

const EXCEPTION_STORAGE_KEY = 'reports.paymentExceptionClosureNotes';

export function useReportsSnapshot(ws, startDate, endDate) {
  const countOnlyOverview =
    ws.hasPermission('reports.view') &&
    !ws.canAccessModule('sales') &&
    !ws.canAccessModule('procurement') &&
    !ws.canAccessModule('operations') &&
    !ws.canAccessModule('finance');

  const [aggregateSummary, setAggregateSummary] = useState(null);
  const [summaryErr, setSummaryErr] = useState(null);
  const [exceptionClosureNotes, setExceptionClosureNotes] = useState({});

  useEffect(() => {
    if (!countOnlyOverview || !ws.hasWorkspaceData) return undefined;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/reports/summary');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setSummaryErr(data?.error || 'Could not load summary');
        setAggregateSummary(null);
        return;
      }
      setAggregateSummary(data.counts);
      setSummaryErr(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [countOnlyOverview, ws.hasWorkspaceData, ws.refreshEpoch]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EXCEPTION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') setExceptionClosureNotes(parsed);
    } catch {
      // ignore invalid cache
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(EXCEPTION_STORAGE_KEY, JSON.stringify(exceptionClosureNotes));
    } catch {
      // ignore storage write failures
    }
  }, [exceptionClosureNotes]);

  const snapshot = ws?.snapshot ?? {};

  const quotations = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.quotations) ? snapshot.quotations : []),
    [snapshot.quotations, ws.hasWorkspaceData]
  );
  const receipts = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.receipts) ? snapshot.receipts : []),
    [snapshot.receipts, ws.hasWorkspaceData]
  );
  const expenses = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.expenses) ? snapshot.expenses : []),
    [snapshot.expenses, ws.hasWorkspaceData]
  );
  const purchaseOrders = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.purchaseOrders) ? snapshot.purchaseOrders : []),
    [snapshot.purchaseOrders, ws.hasWorkspaceData]
  );
  const treasuryMovements = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.treasuryMovements) ? snapshot.treasuryMovements : []),
    [snapshot.treasuryMovements, ws.hasWorkspaceData]
  );
  const ledgerEntries = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.ledgerEntries) ? snapshot.ledgerEntries : []),
    [snapshot.ledgerEntries, ws.hasWorkspaceData]
  );
  const productionJobs = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.productionJobs) ? snapshot.productionJobs : []),
    [snapshot.productionJobs, ws.hasWorkspaceData]
  );
  const refunds = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.refunds) ? snapshot.refunds : []),
    [snapshot.refunds, ws.hasWorkspaceData]
  );
  const bankReconciliation = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(snapshot.bankReconciliation) ? snapshot.bankReconciliation : [],
    [snapshot.bankReconciliation, ws.hasWorkspaceData]
  );
  const coilLots = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.coilLots) ? snapshot.coilLots : []),
    [snapshot.coilLots, ws.hasWorkspaceData]
  );
  const paymentRequests = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(snapshot.paymentRequests) ? snapshot.paymentRequests : [],
    [snapshot.paymentRequests, ws.hasWorkspaceData]
  );
  const accessoryUsage = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(snapshot.productionJobAccessoryUsage)
        ? snapshot.productionJobAccessoryUsage
        : [],
    [snapshot.productionJobAccessoryUsage, ws.hasWorkspaceData]
  );

  const salesKpis = useMemo(() => {
    const quotes = filterQuotationsInRange(quotations, startDate, endDate);
    const quotationPipelineNgn = quotes.reduce((s, q) => s + (q.totalNgn ?? 0), 0);
    const producedSalesNgn = productionAttributedRevenueNgn(quotations, productionJobs, startDate, endDate);
    const totalPaid = receipts
      .filter((r) => r.dateISO >= startDate && r.dateISO <= endDate)
      .reduce((s, q) => s + (q.amountNgn ?? 0), 0);
    const outstanding = liveReceivablesNgn(quotations, ledgerEntries, productionJobs);
    const productionJobsCompletedInRange = productionJobs.filter((j) => {
      if (String(j.status || '').trim() !== 'Completed') return false;
      const iso = productionOutputDateISO(j);
      if (!iso) return false;
      return (!startDate || iso >= startDate) && (!endDate || iso <= endDate);
    }).length;
    return {
      quotationPipelineNgn,
      producedSalesNgn,
      totalPaid,
      outstanding,
      rowCount: quotes.length,
      productionJobsCompletedInRange,
    };
  }, [endDate, ledgerEntries, productionJobs, quotations, receipts, startDate]);

  const paymentExceptionQueue = useMemo(
    () =>
      paymentReconciliationExceptionQueue(
        ledgerEntries,
        treasuryMovements,
        quotations,
        receipts,
        startDate,
        endDate
      ),
    [endDate, ledgerEntries, quotations, receipts, startDate, treasuryMovements]
  );

  const openPaymentExceptionQueue = useMemo(
    () => paymentExceptionQueue.filter((row) => !exceptionClosureNotes[row.key]?.closed),
    [exceptionClosureNotes, paymentExceptionQueue]
  );

  const toggleExceptionClosed = (row, closed) => {
    setExceptionClosureNotes((prev) => ({
      ...prev,
      [row.key]: {
        ...prev[row.key],
        closed: Boolean(closed),
        closedAtISO: closed ? new Date().toISOString() : null,
      },
    }));
  };

  const updateExceptionNote = (row, note) => {
    setExceptionClosureNotes((prev) => ({
      ...prev,
      [row.key]: {
        ...prev[row.key],
        note,
      },
    }));
  };

  return {
    countOnlyOverview,
    aggregateSummary,
    summaryErr,
    quotations,
    receipts,
    expenses,
    purchaseOrders,
    treasuryMovements,
    ledgerEntries,
    productionJobs,
    refunds,
    bankReconciliation,
    coilLots,
    paymentRequests,
    accessoryUsage,
    salesKpis,
    paymentExceptionQueue,
    openPaymentExceptionQueue,
    exceptionClosureNotes,
    toggleExceptionClosed,
    updateExceptionNote,
  };
}
