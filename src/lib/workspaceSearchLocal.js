import { canWorkspaceSearchProducts, canWorkspaceSearchRefunds } from './workspaceSearchClientGates.js';
import { customerPickerSearchBlob } from './customerPickerSearch.js';
import { canAccessModuleWithPermissions } from './moduleAccess.js';
import {
  filterNavSearchCommands,
  mergeWorkspaceSearchResults,
  applyContextBoostToByKind,
  scoreWorkspaceSearchMatch,
} from '../shared/lib/workspaceSearchCore.js';

/**
 * Search cached workspace snapshot (offline / degraded) with permission checks.
 * @param {object} snapshot
 * @param {string} rawQuery
 * @param {(p: string) => boolean} hasPermission
 * @param {number} [limit]
 * @param {{ roleKey?: string, canAccessModule?: (m: string) => boolean, contextPath?: string }} [opts]
 */
export function searchWorkspaceSnapshot(snapshot, rawQuery, hasPermission, limit = 20, opts = {}) {
  const q = String(rawQuery || '').trim();
  if (q.length < 2 || !snapshot) return [];

  const perm = (p) => hasPermission('*') || hasPermission(p);
  const cap = Math.max(1, limit | 0);
  const perKindCap = Math.min(12, Math.max(4, Math.ceil(cap / 2)));
  const canModule =
    opts.canAccessModule ||
    ((moduleKey) => canAccessModuleWithPermissions(snapshot.permissions || [], moduleKey));

  /** @type {Record<string, object[]>} */
  const byKind = {};

  byKind.nav = filterNavSearchCommands(q, perm, canModule, {
    roleKey: opts.roleKey || snapshot.session?.user?.roleKey,
    limit: 4,
  });

  if (perm('sales.view') || perm('customers.manage')) {
    byKind.customer = [];
    for (const c of snapshot.customers || []) {
      if (byKind.customer.length >= perKindCap) break;
      const blob = customerPickerSearchBlob(c);
      const score = scoreWorkspaceSearchMatch(q, blob);
      if (score <= 0) continue;
      byKind.customer.push({
        kind: 'customer',
        id: c.customerID,
        label: c.name,
        sublabel: c.customerID,
        path: `/customers/${encodeURIComponent(c.customerID)}`,
        _score: score,
      });
    }
  }

  if (perm('quotations.manage') || perm('sales.view')) {
    byKind.quotation = [];
    for (const row of snapshot.quotations || []) {
      if (byKind.quotation.length >= perKindCap) break;
      const fields = [row.id, row.customer, row.customerID, row.projectName];
      const score = scoreWorkspaceSearchMatch(q, fields);
      if (score <= 0) continue;
      byKind.quotation.push({
        kind: 'quotation',
        id: row.id,
        label: row.id,
        sublabel: row.customer,
        path: '/sales',
        state: { globalSearchQuery: row.id, focusSalesTab: 'quotations' },
        _score: score,
      });
    }
  }

  if (perm('receipts.post') || perm('finance.view') || perm('sales.view')) {
    byKind.receipt = [];
    for (const row of snapshot.receipts || []) {
      if (byKind.receipt.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [row.id, row.customer, row.customerID, row.quotationRef]);
      if (score <= 0) continue;
      byKind.receipt.push({
        kind: 'receipt',
        id: row.id,
        label: row.id,
        sublabel: row.customer,
        path: '/sales',
        state: { globalSearchQuery: row.id, focusSalesTab: 'receipts' },
        _score: score,
      });
    }
  }

  if (perm('procurement.view') || perm('purchase_orders.manage')) {
    byKind.purchase_order = [];
    for (const row of snapshot.purchaseOrders || []) {
      if (byKind.purchase_order.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [row.poID, row.supplierName, row.supplierID]);
      if (score <= 0) continue;
      byKind.purchase_order.push({
        kind: 'purchase_order',
        id: row.poID,
        label: row.poID,
        sublabel: row.supplierName,
        path: '/procurement',
        state: { focusTab: 'purchases' },
        _score: score,
      });
    }
    byKind.supplier = [];
    for (const s of snapshot.suppliers || []) {
      if (byKind.supplier.length >= perKindCap) break;
      const p = s.supplierProfile || {};
      const score = scoreWorkspaceSearchMatch(q, [
        s.supplierID,
        s.name,
        s.city,
        p.companyEmail,
        p.phoneMain,
      ]);
      if (score <= 0) continue;
      byKind.supplier.push({
        kind: 'supplier',
        id: s.supplierID,
        label: s.name,
        sublabel: s.supplierID,
        path: `/procurement/suppliers/${encodeURIComponent(s.supplierID)}`,
        _score: score,
      });
    }
  }

  if (perm('operations.view') || perm('production.manage')) {
    byKind.cutting_list = [];
    for (const row of snapshot.cuttingLists || []) {
      if (byKind.cutting_list.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [row.id, row.customer, row.customerID, row.quotationRef]);
      if (score <= 0) continue;
      byKind.cutting_list.push({
        kind: 'cutting_list',
        id: row.id,
        label: row.id,
        sublabel: row.customer,
        path: '/operations',
        state: { focusOpsTab: 'production', highlightCuttingListId: row.id },
        _score: score,
      });
    }
    byKind.coil = [];
    for (const lot of snapshot.coilLots || []) {
      if (byKind.coil.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [
        lot.coilNo,
        lot.productID,
        lot.poID,
        lot.supplierName,
        lot.colour,
        lot.gaugeLabel,
      ]);
      if (score <= 0) continue;
      byKind.coil.push({
        kind: 'coil',
        id: lot.coilNo,
        label: lot.coilNo,
        sublabel: `${lot.colour || '—'} · ${lot.gaugeLabel || '—'} · ${lot.productID || ''}`,
        path: `/operations/coils/${encodeURIComponent(lot.coilNo)}`,
        _score: score,
      });
    }
  }

  if (perm('operations.view') || perm('production.manage') || perm('manager.dashboard')) {
    byKind.production_job = [];
    for (const row of snapshot.productionJobs || []) {
      if (byKind.production_job.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [
        row.jobID,
        row.customerName,
        row.customerID,
        row.quotationRef,
        row.productName,
        row.cuttingListId,
        row.productID,
      ]);
      if (score <= 0) continue;
      byKind.production_job.push({
        kind: 'production_job',
        id: row.jobID,
        label: row.jobID,
        sublabel: [row.customerName, row.productName].filter(Boolean).join(' · ') || row.quotationRef,
        path: '/operations',
        state: { focusOpsTab: 'production', highlightProductionJobId: row.jobID },
        _score: score,
      });
    }
    byKind.delivery = [];
    for (const row of snapshot.deliveries || []) {
      if (byKind.delivery.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [
        row.id,
        row.customer,
        row.customerID,
        row.quotationRef,
        row.trackingNo,
        row.destination,
      ]);
      if (score <= 0) continue;
      byKind.delivery.push({
        kind: 'delivery',
        id: row.id,
        label: row.id,
        sublabel: [row.customer, row.trackingNo || row.destination].filter(Boolean).join(' · '),
        path: '/operations',
        state: { focusOpsTab: 'deliveries', globalSearchQuery: row.id },
        _score: score,
      });
    }
  }

  if (canWorkspaceSearchRefunds(hasPermission)) {
    byKind.refund = [];
    for (const row of snapshot.refunds || []) {
      if (byKind.refund.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [
        row.refundID,
        row.customer,
        row.customerID,
        row.quotationRef,
        row.product,
        row.reasonCategory,
      ]);
      if (score <= 0) continue;
      byKind.refund.push({
        kind: 'refund',
        id: row.refundID,
        label: row.refundID,
        sublabel: row.customer,
        path: '/sales',
        state: { globalSearchQuery: row.refundID, focusSalesTab: 'refund' },
        _score: score,
      });
    }
  }

  if (canWorkspaceSearchProducts(hasPermission)) {
    byKind.product = [];
    for (const row of snapshot.products || []) {
      if (byKind.product.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [row.productID, row.name]);
      if (score <= 0) continue;
      byKind.product.push({
        kind: 'product',
        id: row.productID,
        label: row.name || row.productID,
        sublabel: row.productID,
        path: '/operations',
        state: { focusOpsTab: 'inventory', opsInventorySkuQuery: row.productID },
        _score: score,
      });
    }
  }

  if (
    perm('finance.view') ||
    perm('finance.post') ||
    perm('cashier.desk.view') ||
    perm('manager.dashboard') ||
    perm('expenses.create')
  ) {
    byKind.payment_request = [];
    for (const row of snapshot.paymentRequests || []) {
      if (byKind.payment_request.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [row.requestID, row.description, row.expenseID]);
      if (score <= 0) continue;
      byKind.payment_request.push({
        kind: 'payment_request',
        id: row.requestID,
        label: row.requestID,
        sublabel: row.description || row.expenseID,
        path: '/accounts',
        state: { accountsTab: 'payment-requests', highlightPaymentRequestId: row.requestID },
        _score: score,
      });
    }
    byKind.expense = [];
    for (const row of snapshot.expenses || []) {
      if (byKind.expense.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [row.expenseID, row.expenseType, row.category, row.reference]);
      if (score <= 0) continue;
      byKind.expense.push({
        kind: 'expense',
        id: row.expenseID,
        label: row.expenseID,
        sublabel: [row.category, row.expenseType].filter(Boolean).join(' · ') || row.reference,
        path: '/accounts',
        state: { accountsTab: 'expenses', highlightExpenseId: row.expenseID },
        _score: score,
      });
    }
  }

  if (perm('finance.view')) {
    byKind.gl_journal = [];
    for (const row of snapshot.glJournalSearchSlice || []) {
      if (byKind.gl_journal.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [row.id, row.memo, row.sourceId, row.entryDateISO]);
      if (score <= 0) continue;
      byKind.gl_journal.push({
        kind: 'gl_journal',
        id: row.id,
        label: row.id,
        sublabel: [row.entryDateISO, row.memo || row.sourceId].filter(Boolean).join(' · ') || 'GL journal',
        path: '/accounts',
        state: { accountsTab: 'audit', highlightGlJournalId: row.id },
        _score: score,
      });
    }
  }

  if (perm('finance.view') || perm('receipts.post')) {
    byKind.ledger_entry = [];
    for (const row of snapshot.ledgerEntries || []) {
      if (byKind.ledger_entry.length >= perKindCap) break;
      const score = scoreWorkspaceSearchMatch(q, [
        row.id,
        row.customerName,
        row.customerID,
        row.quotationRef,
        row.note,
        row.bankReference,
        row.purpose,
      ]);
      if (score <= 0) continue;
      byKind.ledger_entry.push({
        kind: 'ledger_entry',
        id: row.id,
        label: row.id,
        sublabel: [row.customerName, row.quotationRef, row.type].filter(Boolean).join(' · '),
        path: row.customerID ? `/customers/${encodeURIComponent(row.customerID)}` : '/sales',
        state: row.quotationRef
          ? { globalSearchQuery: row.quotationRef, focusSalesTab: 'quotations' }
          : row.customerID
            ? {}
            : undefined,
        _score: score,
      });
    }
  }

  if (perm('office.use') || perm('dashboard.view') || perm('*')) {
    byKind.work_item = [];
    for (const row of snapshot.unifiedWorkItems || []) {
      if (byKind.work_item.length >= perKindCap) break;
      const docLabel = String(row.documentType || 'Item').replace(/_/g, ' ');
      const score = scoreWorkspaceSearchMatch(q, [row.title, row.referenceNo, row.documentType, row.id]);
      if (score <= 0) continue;
      byKind.work_item.push({
        kind: 'work_item',
        id: row.id,
        label: row.title || row.referenceNo || 'Work item',
        sublabel: [row.referenceNo, docLabel, row.status].filter(Boolean).join(' · '),
        path: row.routePath || '/',
        state: row.routeState || { workItemId: row.id },
        _score: score,
      });
    }
  }

  return mergeWorkspaceSearchResults(applyContextBoostToByKind(byKind, opts.contextPath), {
    totalCap: cap,
    minPerKind: 2,
  });
}
