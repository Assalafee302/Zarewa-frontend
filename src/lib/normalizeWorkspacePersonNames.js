import { formatPersonName } from './formatPersonName.js';

function fmt(value) {
  const s = String(value ?? '').trim();
  if (!s || s === '—' || s === '-') return value ?? '';
  return formatPersonName(s);
}

function mapList(list, mapRow) {
  return Array.isArray(list) ? list.map(mapRow) : list;
}

/**
 * Title-case person / company names on workspace bootstrap rows (display only).
 * @param {object | null | undefined} snapshot
 */
export function normalizeWorkspacePersonNames(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;

  const next = { ...snapshot };

  if (next.session?.user) {
    next.session = {
      ...next.session,
      user: {
        ...next.session.user,
        displayName: next.session.user.displayName ? fmt(next.session.user.displayName) : next.session.user.displayName,
      },
    };
  }

  next.customers = mapList(next.customers, (c) => ({
    ...c,
    name: c.name ? fmt(c.name) : c.name,
    companyName: c.companyName ? fmt(c.companyName) : c.companyName,
  }));

  next.quotations = mapList(next.quotations, (q) => ({
    ...q,
    customer: q.customer ? fmt(q.customer) : q.customer,
  }));

  next.receipts = mapList(next.receipts, (r) => ({
    ...r,
    customer: r.customer ? fmt(r.customer) : r.customer,
    handledBy: r.handledBy ? fmt(r.handledBy) : r.handledBy,
  }));

  next.refunds = mapList(next.refunds, (r) => ({
    ...r,
    customer: r.customer ? fmt(r.customer) : r.customer,
    payeeName: r.payeeName ? fmt(r.payeeName) : r.payeeName,
    payee_name: r.payee_name ? fmt(r.payee_name) : r.payee_name,
    requestedBy: r.requestedBy ? fmt(r.requestedBy) : r.requestedBy,
    approvedBy: r.approvedBy ? fmt(r.approvedBy) : r.approvedBy,
    paidBy: r.paidBy ? fmt(r.paidBy) : r.paidBy,
  }));

  next.cuttingLists = mapList(next.cuttingLists, (cl) => ({
    ...cl,
    customer: cl.customer ? fmt(cl.customer) : cl.customer,
  }));

  next.productionJobs = mapList(next.productionJobs, (j) => ({
    ...j,
    customerName: j.customerName ? fmt(j.customerName) : j.customerName,
  }));

  next.ledgerEntries = mapList(next.ledgerEntries, (e) => ({
    ...e,
    customerName: e.customerName ? fmt(e.customerName) : e.customerName,
    counterpartyName: e.counterpartyName ? fmt(e.counterpartyName) : e.counterpartyName,
  }));

  next.suppliers = mapList(next.suppliers, (s) => ({
    ...s,
    name: s.name ? fmt(s.name) : s.name,
  }));

  return next;
}
