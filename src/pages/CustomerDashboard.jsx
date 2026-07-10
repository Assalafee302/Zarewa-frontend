import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  MapPin,
  Building2,
  BadgeCheck,
  Pencil,
  FileText,
  Package,
  Receipt,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquarePlus,
  BarChart3,
  Printer,
  ChevronRight,
  X,
  LayoutDashboard,
  ScrollText,
  Activity,
  Scissors,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { PageHeader, PageShell, MainPanel, ModalFrame, ModalScrollShell, ModalScrollHeader, ModalScrollBody, Breadcrumbs } from '../components/layout';
import { StatusBadge, SalesStatusChip } from '../components/ui/StatusBadge';
import { refundStatusChipClass } from '../lib/salesStatusUi';
import { RefundAdvanceModal } from '../components/refund/RefundAdvanceModal';
import { ReportPrintModal } from '../components/reports/ReportPrintModal';
import { EditSecondApprovalInline } from '../components/EditSecondApprovalInline';
import { CustomerFormFields } from '../components/customers/CustomerFormFields';
import { CustomerProfileHero } from '../components/customers/CustomerProfileHero';
import { CustomerKpiStrip } from '../components/customers/CustomerKpiStrip';
import { useCustomers } from '../context/CustomersContext';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import { appConfirm } from '../lib/appConfirm';
import { setCustomerStaffLink } from '../lib/customerStaffLink';
import { formatNgn } from '../Data/mockData';
import { refundApprovedAmount, refundOutstandingAmount } from '../lib/refundsStore';
import {
  advanceBalanceNgn,
  overpayCreditBalanceNgn,
  receivableDueOnQuotation,
  entriesForCustomer,
  recordRefundAdvance,
} from '../lib/customerLedgerStore';
import { mergeReceiptRowsForSales, receiptCashReceivedNgn } from '../lib/salesReceiptsList';
import {
  SALES_TABLE_SORT_FIELD_OPTIONS,
  sortQuotationsList,
  sortReceiptsList,
  sortCuttingLists,
  sortRefundsList,
} from '../lib/salesListSorting';
import {
  SalesListTableFrame,
  SalesListSearchInput,
  SalesListSortBar,
} from '../components/sales/SalesListTableFrame';
import {
  allocatedQuotationRevenueForProductionJob,
  metersProducedByQuotationRef,
  productionOutputDateISO,
} from '../lib/liveAnalytics';

/** Local calendar date YYYY-MM-DD for comparisons (due dates, overdue, receipt windows). */
function localDateISO(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/**
 * Six consecutive calendar months ending with the month of `anchorIso` (YYYY-MM-DD), oldest first.
 * Each entry: `{ ym: 'YYYY-MM', month: 'Jan' }` for chart axis labels.
 */
function lastSixCalendarMonthBuckets(anchorIso) {
  const m = String(anchorIso || '').match(/^(\d{4})-(\d{2})/);
  const y = m ? Number(m[1]) : null;
  const mo = m ? Number(m[2]) : null;
  if (!y || !mo || mo < 1 || mo > 12) {
    return lastSixCalendarMonthBuckets(localDateISO());
  }
  const end = new Date(y, mo - 1, 1);
  const out = [];
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(end.getFullYear(), end.getMonth() - (5 - i), 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const ym = `${yy}-${mm}`;
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    out.push({ ym, month });
  }
  return out;
}

const EMPTY_CUSTOMER_CRM = { orders: [], interactions: [], salesTrendByCustomer: {} };

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'financial', label: 'Receipts & payments', icon: Receipt },
  { id: 'activity', label: 'Activity & notes', icon: Activity },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

/** DOM ids allowed in the URL hash (e.g. `#cd-financial`) for deep links and refresh. */
const CD_SECTION_IDS = new Set([
  ...NAV.map((n) => `cd-${n.id}`),
  'cd-cutting',
  'cd-refunds',
]);

function customerDashboardHashToSectionId(hash) {
  const raw = String(hash || '').trim();
  if (!raw || raw === '#') return null;
  const id = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!id || !CD_SECTION_IDS.has(id)) return null;
  return id;
}

function quotationUiStatusTone(tone) {
  if (tone === 'paid') return 'success';
  if (tone === 'overdue') return 'danger';
  return 'warn';
}

function quotationUiStatus(q, todayIso) {
  if (q.paymentStatus === 'Paid') return { label: 'Paid', tone: 'paid' };
  const due = q.dueDateISO;
  if (due && due < todayIso && q.paymentStatus !== 'Paid') {
    return { label: 'Overdue', tone: 'overdue' };
  }
  if (q.status === 'Approved' && q.paymentStatus === 'Partial') {
    return { label: 'Approved', tone: 'pending' };
  }
  return { label: q.status === 'Approved' ? 'Approved' : 'Pending', tone: 'pending' };
}

function ledgerTypeLabel(t) {
  switch (t) {
    case 'ADVANCE_IN':
      return 'Advance in';
    case 'ADVANCE_APPLIED':
      return 'Advance applied';
    case 'RECEIPT':
      return 'Receipt';
    case 'OVERPAY_APPLIED':
      return 'Overpay applied to quote';
    case 'OVERPAY_ADVANCE':
      return 'Overpayment credit';
    case 'OVERPAY_REVERSAL':
      return 'Overpayment reversal';
    case 'REFUND_OVERPAY':
      return 'Overpayment refunded';
    case 'REFUND_ADVANCE':
      return 'Advance refunded';
    default:
      return t;
  }
}

function orderStatusClass(s) {
  if (s === 'Delivered') return 'bg-emerald-100 text-emerald-800';
  if (s === 'Shipped') return 'bg-sky-100 text-sky-800';
  return 'bg-amber-100 text-amber-800';
}

function safeIso(v) {
  return String(v || '');
}

function safeLines(lines) {
  return Array.isArray(lines) ? lines : [];
}

const emptyEdit = (c) => ({
  name: c?.name ?? '',
  phoneNumber: c?.phoneNumber ?? '',
  email: c?.email ?? '',
  addressShipping: c?.addressShipping ?? '',
  addressBilling: c?.addressBilling ?? '',
  status: c?.status ?? 'Active',
  tier: c?.tier ?? 'Regular',
  paymentTerms: c?.paymentTerms ?? 'Net 30',
  companyName: c?.companyName ?? '',
  leadSource: c?.leadSource ?? '',
  preferredContact: c?.preferredContact ?? 'Phone',
  followUpISO: c?.followUpISO ?? '',
  crmTagsStr: Array.isArray(c?.crmTags) ? c.crmTags.join(', ') : '',
  crmProfileNotes: c?.crmProfileNotes ?? '',
  linkedStaffUserId: c?.staffUserId ?? '',
});

const CustomerDashboard = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { customers, setCustomers, deleteCustomer } = useCustomers();
  const { show: showToast } = useToast();
  const ws = useWorkspace();

  const routeCustomerId = useMemo(() => decodeURIComponent(String(customerId || '')).trim(), [customerId]);
  const allCustomers = useMemo(() => {
    const snapshotCustomers = Array.isArray(ws?.snapshot?.customers) ? ws.snapshot.customers : [];
    return customers.length > 0 ? customers : snapshotCustomers;
  }, [customers, ws?.snapshot?.customers]);

  const crm = useMemo(
    () =>
      ws?.hasWorkspaceData
        ? ws?.snapshot?.customerDashboard ?? EMPTY_CUSTOMER_CRM
        : EMPTY_CUSTOMER_CRM,
    [ws?.hasWorkspaceData, ws?.snapshot?.customerDashboard]
  );

  const customer = useMemo(
    () =>
      allCustomers.find(
        (c) => String(c.customerID || '').trim().toLowerCase() === routeCustomerId.toLowerCase()
      ),
    [allCustomers, routeCustomerId]
  );
  const customerKey = customer?.customerID || routeCustomerId;
  /** Refreshes each render so overdue / receipt windows stay correct across midnight without a full reload. */
  const todayIso = localDateISO();
  const [ledgerViewNonce, setLedgerViewNonce] = useState(0);
  const [paymentIntegrity, setPaymentIntegrity] = useState(null);

  useEffect(() => {
    if (!customerKey) {
      setPaymentIntegrity(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch(
        `/api/customers/${encodeURIComponent(customerKey)}/payment-integrity`
      );
      if (cancelled) return;
      if (ok && data?.ok) {
        setPaymentIntegrity({
          hasIssues: Boolean(data.hasIssues),
          criticalCount: Number(data.criticalCount) || 0,
          issues: Array.isArray(data.issues) ? data.issues : [],
        });
      } else {
        setPaymentIntegrity(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerKey, ledgerViewNonce]);

  const quotationRows = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.quotations) ? ws.snapshot.quotations : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.quotations]
  );
  const receiptRows = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.receipts) ? ws.snapshot.receipts : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.receipts]
  );
  const mergedReceiptRowsAll = useMemo(() => {
    void ledgerViewNonce;
    return mergeReceiptRowsForSales(receiptRows, quotationRows, ledgerViewNonce);
  }, [receiptRows, quotationRows, ledgerViewNonce]);
  const cuttingListRows = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.cuttingLists) ? ws.snapshot.cuttingLists : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.cuttingLists]
  );
  const refundRows = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.refunds) ? ws.snapshot.refunds : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.refunds]
  );
  const productionJobRows = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.productionJobs) ? ws.snapshot.productionJobs : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.productionJobs]
  );

  const quotations = useMemo(
    () => quotationRows.filter((q) => String(q.customerID || '').trim() === customerKey),
    [customerKey, quotationRows]
  );
  const receipts = useMemo(
    () => mergedReceiptRowsAll.filter((r) => String(r.customerID || '').trim() === customerKey),
    [customerKey, mergedReceiptRowsAll]
  );
  const cuttingLists = useMemo(
    () => cuttingListRows.filter((cl) => String(cl.customerID || '').trim() === customerKey),
    [customerKey, cuttingListRows]
  );
  const customerProductionJobs = useMemo(
    () => productionJobRows.filter((j) => String(j.customerID || '').trim() === customerKey),
    [customerKey, productionJobRows]
  );
  const refundsForCustomer = useMemo(
    () => refundRows.filter((r) => String(r.customerID || '').trim() === customerKey),
    [customerKey, refundRows]
  );

  const orders = useMemo(
    () => (crm.orders || []).filter((o) => String(o.customerID || '').trim() === customerKey),
    [customerKey, crm.orders]
  );
  const interactions = useMemo(
    () => (crm.interactions || []).filter((i) => String(i.customerID || '').trim() === customerKey),
    [customerKey, crm.interactions]
  );

  const [payWindow, setPayWindow] = useState('all');
  const [cdQuoteSearch, setCdQuoteSearch] = useState('');
  const [cdQuoteSort, setCdQuoteSort] = useState({ field: 'date', dir: 'desc' });
  const [cdCutSearch, setCdCutSearch] = useState('');
  const [cdCutSort, setCdCutSort] = useState({ field: 'date', dir: 'desc' });
  const [cdRcptSearch, setCdRcptSearch] = useState('');
  const [cdRcptSort, setCdRcptSort] = useState({ field: 'date', dir: 'desc' });
  const [cdRfSearch, setCdRfSearch] = useState('');
  const [cdRfSort, setCdRfSort] = useState({ field: 'date', dir: 'desc' });
  const [showEdit, setShowEdit] = useState(false);
  const [customerEditApprovalId, setCustomerEditApprovalId] = useState('');
  const [editForm, setEditForm] = useState(() => emptyEdit(customer));
  const [detail, setDetail] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [reportFrom, setReportFrom] = useState('2026-01-01');
  const [reportTo, setReportTo] = useState(() => localDateISO());
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [staffNotes, setStaffNotes] = useState([]);
  const [refundAdvanceOpen, setRefundAdvanceOpen] = useState(false);
  const [refundAdvanceAmt, setRefundAdvanceAmt] = useState('');
  const [refundAdvanceBusy, setRefundAdvanceBusy] = useState(false);
  const [collectionsNote, setCollectionsNote] = useState('');
  const [collectionsBusy, setCollectionsBusy] = useState(false);

   
  useEffect(() => {
    if (customer) setEditForm(emptyEdit(customer));
  }, [customer]);

  /** Deep links: `/customers/CUS-001#cd-financial` — keep section on refresh; shareable URLs. */
  useEffect(() => {
    if (!customer) return;
    const sectionId = customerDashboardHashToSectionId(location.hash);
    if (!sectionId) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const t1 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(t1);
    };
  }, [location.hash, location.pathname, customer, customer?.customerID]);

  useEffect(() => {
    if (!customerKey) return;
    if (!ws?.hasWorkspaceData) {
      setStaffNotes([]);
      return undefined;
    }
    if (!ws?.canMutate) {
      const fromCrm = (crm.interactions || [])
        .filter((i) => String(i.customerID || '').trim() === customerKey)
        .map((i) => ({
          id: i.id,
          text: i.detail,
          at: i.atIso,
          kind: i.kind,
          title: i.title,
          createdByName: i.createdByName,
        }));
      setStaffNotes(fromCrm);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch(
        `/api/customers/${encodeURIComponent(customerKey)}/interactions`
      );
      if (!ok || cancelled) return;
      const rows = (data?.interactions || []).map((i) => ({
        id: i.id,
        text: i.detail,
        at: i.atIso,
        kind: i.kind,
        title: i.title,
        createdByName: i.createdByName,
      }));
      setStaffNotes(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerKey, ws?.hasWorkspaceData, ws?.canMutate, crm.interactions]);
   

  const addNote = async (e) => {
    e.preventDefault();
    const t = noteDraft.trim();
    if (!t) return;
    if (!ws?.canMutate) {
      showToast('Reconnect to save staff notes — workspace is read-only.', { variant: 'info' });
      return;
    }
    const { ok, data } = await apiFetch(
      `/api/customers/${encodeURIComponent(customerKey)}/interactions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'note',
          title: 'Staff note',
          detail: t,
        }),
      }
    );
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not save note.', { variant: 'error' });
      return;
    }
    const inter = data.interaction;
    const row = {
      id: inter.id,
      text: inter.detail,
      at: inter.atIso,
      kind: inter.kind,
      title: inter.title,
      createdByName: inter.createdByName,
    };
    setStaffNotes((prev) => [row, ...prev]);
    setNoteDraft('');
    showToast('Note saved to customer CRM.');
  };

  const submitRefundAdvance = async (e) => {
    e.preventDefault();
    if (!customer || refundAdvanceBusy) return;
    const n = Number(String(refundAdvanceAmt).replace(/,/g, ''));
    if (Number.isNaN(n) || n <= 0) {
      showToast('Enter refund amount.', { variant: 'error' });
      return;
    }
    setRefundAdvanceBusy(true);
    try {
      if (ws?.canMutate) {
        const { ok, data } = await apiFetch('/api/ledger/refund-advance', {
          method: 'POST',
          body: JSON.stringify({
            customerID: customer.customerID,
            customerName: customer.name,
            amountNgn: n,
            note: 'Advance refunded to customer',
          }),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Refund failed on server.', { variant: 'error' });
          return;
        }
        await ws.refresh();
      } else if (!ws?.hasWorkspaceData) {
        const res = recordRefundAdvance({
          customerID: customer.customerID,
          customerName: customer.name,
          amountNgn: n,
          note: 'Advance refunded to customer',
        });
        if (!res.ok) {
          showToast(res.error, { variant: 'error' });
          return;
        }
      } else {
        showToast('Reconnect to post advance refunds — read-only workspace.', { variant: 'info' });
        return;
      }
      showToast(`Advance refund ${formatNgn(n)} recorded.`);
      setRefundAdvanceOpen(false);
      setRefundAdvanceAmt('');
      setLedgerViewNonce((x) => x + 1);
    } finally {
      setRefundAdvanceBusy(false);
    }
  };

  const quotationTableRows = useMemo(() => {
    const q = cdQuoteSearch.trim().toLowerCase();
    let rows = [...quotations];
    if (q) {
      rows = rows.filter((row) =>
        `${row.id} ${row.date} ${row.dateISO} ${row.total} ${row.status} ${row.paymentStatus} ${row.handledBy || ''}`
          .toLowerCase()
          .includes(q)
      );
    }
    return sortQuotationsList(rows, cdQuoteSort.field, cdQuoteSort.dir);
  }, [quotations, cdQuoteSearch, cdQuoteSort]);

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => safeIso(b.dateISO).localeCompare(safeIso(a.dateISO))),
    [orders]
  );

  const outstandingNgn = useMemo(
    () => quotations.reduce((s, q) => s + receivableDueOnQuotation(q, productionJobRows), 0),
    [quotations, productionJobRows]
  );

  const advanceBalNgn = useMemo(
    () => {
      void ledgerViewNonce;
      return advanceBalanceNgn(customerKey);
    },
    [customerKey, ledgerViewNonce]
  );

  const overpayCreditBalNgn = useMemo(
    () => {
      void ledgerViewNonce;
      return overpayCreditBalanceNgn(customerKey);
    },
    [customerKey, ledgerViewNonce]
  );

  const totalPaidReceiptsNgn = useMemo(
    () => receipts.reduce((s, r) => s + receiptCashReceivedNgn(r), 0),
    [receipts]
  );

  const ledgerLines = useMemo(
    () => {
      void ledgerViewNonce;
      return [...entriesForCustomer(customerKey)].sort((a, b) =>
        (b.atISO || '').localeCompare(a.atISO || '')
      );
    },
    [customerKey, ledgerViewNonce]
  );

  const totalInvoicedNgn = useMemo(
    () => quotations.reduce((s, q) => s + q.totalNgn, 0),
    [quotations]
  );

  const pendingQuotationsCount = useMemo(
    () => quotations.filter((q) => q.status === 'Pending').length,
    [quotations]
  );

  const overdueCount = useMemo(
    () =>
      quotations.filter((q) => {
        if (q.paymentStatus === 'Paid') return false;
        return q.dueDateISO && q.dueDateISO < todayIso;
      }).length,
    [quotations, todayIso]
  );

  const paymentProgressPct = useMemo(() => {
    if (totalInvoicedNgn <= 0) return 0;
    const paidOnBooks = quotations.reduce((s, q) => s + (q.paidNgn || 0), 0);
    return Math.min(100, Math.round((paidOnBooks / totalInvoicedNgn) * 100));
  }, [quotations, totalInvoicedNgn]);

  const filteredReceipts = useMemo(() => {
    let rows = [...receipts];
    if (payWindow !== 'all') {
      const days = payWindow === '30' ? 30 : 60;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const ciso = localDateISO(cutoff);
      rows = rows.filter((r) => (r.dateISO || '') >= ciso);
    }
    const q = cdRcptSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        `${r.id} ${r.date} ${r.dateISO} ${r.amount} ${r.method} ${r.quotationRef} ${r.source}`
          .toLowerCase()
          .includes(q)
      );
    }
    return sortReceiptsList(rows, cdRcptSort.field, cdRcptSort.dir);
  }, [receipts, payWindow, cdRcptSearch, cdRcptSort]);

  const cuttingTableRows = useMemo(() => {
    const q = cdCutSearch.trim().toLowerCase();
    let rows = [...cuttingLists];
    if (q) {
      rows = rows.filter((row) =>
        `${row.id} ${row.date} ${row.dateISO} ${row.total} ${row.status} ${row.handledBy || ''}`
          .toLowerCase()
          .includes(q)
      );
    }
    return sortCuttingLists(rows, cdCutSort.field, cdCutSort.dir);
  }, [cuttingLists, cdCutSearch, cdCutSort]);

  const refundTableRows = useMemo(() => {
    const q = cdRfSearch.trim().toLowerCase();
    let rows = [...refundsForCustomer];
    if (q) {
      rows = rows.filter((row) =>
        `${row.refundID} ${row.customer} ${row.quotationRef} ${row.status} ${row.reason} ${row.reasonCategory} ${formatNgn(row.amountNgn)}`
          .toLowerCase()
          .includes(q)
      );
    }
    return sortRefundsList(rows, cdRfSort.field, cdRfSort.dir);
  }, [refundsForCustomer, cdRfSearch, cdRfSort]);

  const outstandingLines = useMemo(() => {
    return quotations
      .map((q) => ({
        id: q.id,
        due: q.dueDateISO,
        amountNgn: receivableDueOnQuotation(q, productionJobRows),
        overdue: q.dueDateISO && q.dueDateISO < todayIso,
      }))
      .filter((o) => o.amountNgn > 0)
      .sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  }, [quotations, productionJobRows, todayIso]);

  /** Cash received per calendar month from this customer’s sales receipts (ledger + imported), last 6 months. */
  const trendData = useMemo(() => {
    const months = lastSixCalendarMonthBuckets(todayIso);
    const buckets = new Map(months.map(({ ym }) => [ym, 0]));
    for (const r of receipts) {
      const iso = String(r.dateISO || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
      const ym = iso.slice(0, 7);
      if (!buckets.has(ym)) continue;
      const cash = receiptCashReceivedNgn(r);
      if (!Number.isFinite(cash) || cash <= 0) continue;
      buckets.set(ym, (buckets.get(ym) || 0) + Math.round(cash));
    }
    return months.map(({ ym, month }) => {
      const amountNgn = buckets.get(ym) || 0;
      return {
        month,
        monthKey: ym,
        amountNgn,
        amountM: Math.round(amountNgn / 100_000) / 10,
      };
    });
  }, [receipts, todayIso]);

  /** `amountM` is millions of ₦; avoid axis labels like "₦0m" (reads as "metres"). */
  const salesTrendAxisTick = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    if (n === 0) return '0';
    return `${n}M`;
  };
  const salesTrendTooltipVolume = (v) => {
    const m = Number(v);
    if (!Number.isFinite(m)) return ['—', 'Volume'];
    const ngn = Math.round(m * 1_000_000);
    return [`₦${ngn.toLocaleString()}`, 'Volume'];
  };

  const mergedTimeline = useMemo(() => {
    const qSorted = [...quotations].sort((a, b) =>
      (b.dateISO || '').localeCompare(a.dateISO || '')
    );
    const fromQuotations = qSorted.map((q) => ({
      sort: q.dateISO || '',
      kind: 'quotation',
      title: `Quotation ${q.id}`,
      detail: `${q.total} · ${q.paymentStatus} · Owner: ${q.handledBy || '—'}`,
      source: 'tx',
      txType: 'quotation',
      txId: q.id,
    }));
    const rcSorted = [...receipts].sort((a, b) =>
      (b.dateISO || '').localeCompare(a.dateISO || '')
    );
    const fromReceipts = rcSorted.map((r) => ({
      sort: r.dateISO || '',
      kind: 'receipt',
      title: `Receipt ${r.id}`,
      detail: `${r.amount} · ${r.method || '—'} · Recorded by: ${r.handledBy || '—'}`,
      source: 'tx',
      txType: 'receipt',
      txId: r.id,
    }));
    const clSorted = [...cuttingLists].sort((a, b) =>
      (b.dateISO || '').localeCompare(a.dateISO || '')
    );
    const fromCutting = clSorted.map((cl) => ({
      sort: cl.dateISO || '',
      kind: 'cutting',
      title: `Cutting list ${cl.id}`,
      detail: `${cl.total} · ${cl.status} · ${cl.handledBy ? `By ${cl.handledBy}` : '—'}`,
      source: 'tx',
      txType: 'cutting',
      txId: cl.id,
    }));
    const rfSorted = [...refundsForCustomer].sort((a, b) =>
      (b.requestedAtISO || '').localeCompare(a.requestedAtISO || '')
    );
    const fromRefunds = rfSorted.map((r) => ({
      sort: (r.requestedAtISO || '').slice(0, 10) || '1970-01-01',
      kind: 'refund',
      title: `Refund ${r.refundID} (${r.status})`,
      detail: `${formatNgn(r.amountNgn)} · ${r.reasonCategory || r.reason} · Requested by: ${r.requestedBy || '—'}`,
      source: 'tx',
      txType: 'refund',
      txId: r.refundID,
    }));
    const fromInteractions = interactions.map((i) => ({
      sort: i.dateISO,
      kind: i.kind,
      title: i.title,
      detail: i.detail,
      source: 'log',
    }));
    const fromNotes = staffNotes.map((n) => ({
      sort: n.at,
      kind: n.kind || 'note',
      title: n.title?.trim() ? n.title : n.kind === 'call' ? 'Call log' : 'Staff note',
      detail: n.createdByName ? `${n.text} · ${n.createdByName}` : n.text,
      source: 'note',
    }));
    return [
      ...fromQuotations,
      ...fromReceipts,
      ...fromCutting,
      ...fromRefunds,
      ...fromInteractions,
      ...fromNotes,
    ].sort((a, b) => safeIso(b.sort).localeCompare(safeIso(a.sort)));
  }, [quotations, receipts, cuttingLists, refundsForCustomer, interactions, staffNotes]);

  const goSalesQuotation = (id) => {
    navigate('/sales', {
      state: { focusSalesTab: 'quotations', openSalesRecord: { type: 'quotation', id } },
    });
  };

  const goSalesReceipt = (id) => {
    navigate('/sales', {
      state: { focusSalesTab: 'receipts', openSalesRecord: { type: 'receipt', id } },
    });
  };

  const goSalesRefund = (id) => {
    navigate('/sales', {
      state: { focusSalesTab: 'refund', openSalesRecord: { type: 'refund', id } },
    });
  };

  const goSalesCutting = (id) => {
    navigate('/sales', {
      state: { focusSalesTab: 'cuttinglist', openSalesRecord: { type: 'cutting', id } },
    });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const staffLinked = Boolean(String(editForm.linkedStaffUserId || '').trim());
    if (!editForm.name.trim() || (!staffLinked && !editForm.phoneNumber.trim())) {
      showToast('Name and phone are required (phone optional for staff-linked accounts).', { variant: 'error' });
      return;
    }
    const priorStaffUserId = String(customer?.staffUserId || '').trim();
    const nextStaffUserId = String(editForm.linkedStaffUserId || '').trim();
    const staffLinkChanged = priorStaffUserId !== nextStaffUserId;

    if (ws?.canMutate) {
      const { ok, data } = await apiFetch(`/api/customers/${encodeURIComponent(customerKey)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(customerEditApprovalId.trim() ? { editApprovalId: customerEditApprovalId.trim() } : {}),
          name: editForm.name.trim(),
          phoneNumber: editForm.phoneNumber.trim(),
          email: editForm.email.trim(),
          addressShipping: editForm.addressShipping.trim(),
          addressBilling: editForm.addressBilling.trim() || editForm.addressShipping.trim(),
          status: editForm.status,
          tier: nextStaffUserId ? 'Staff' : editForm.tier,
          paymentTerms: nextStaffUserId ? 'Staff credit' : editForm.paymentTerms,
          companyName: editForm.companyName.trim(),
          leadSource: editForm.leadSource.trim(),
          preferredContact: editForm.preferredContact,
          followUpISO: editForm.followUpISO.trim(),
          crmTags: editForm.crmTagsStr
            .split(/[,;]+/)
            .map((x) => x.trim())
            .filter(Boolean),
          crmProfileNotes: editForm.crmProfileNotes.trim(),
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not update customer profile.', { variant: 'error' });
        return;
      }
      if (staffLinkChanged) {
        const linkRes = await setCustomerStaffLink(customerKey, nextStaffUserId || null);
        const linkData = linkRes.data || linkRes;
        if (!linkRes.ok || !linkData?.ok) {
          showToast(linkData?.error || 'Profile saved but staff link failed.', { variant: 'error' });
          await ws.refresh();
          return;
        }
      }
      await ws.refresh();
      setCustomerEditApprovalId('');
      setShowEdit(false);
      showToast(staffLinkChanged ? 'Customer profile and staff link updated.' : 'Customer profile updated.');
      return;
    }
    setCustomers((prev) =>
      prev.map((c) =>
        c.customerID === customerKey
          ? {
              ...c,
              name: editForm.name.trim(),
              phoneNumber: editForm.phoneNumber.trim(),
              email: editForm.email.trim() || '—',
              addressShipping: editForm.addressShipping.trim() || '—',
              addressBilling:
                editForm.addressBilling.trim() ||
                editForm.addressShipping.trim() ||
                '—',
              status: editForm.status,
              tier: editForm.tier,
              paymentTerms: editForm.paymentTerms,
              companyName: editForm.companyName.trim(),
              leadSource: editForm.leadSource.trim(),
              preferredContact: editForm.preferredContact,
              followUpISO: editForm.followUpISO.trim(),
              crmTags: editForm.crmTagsStr
                .split(/[,;]+/)
                .map((x) => x.trim())
                .filter(Boolean),
              crmProfileNotes: editForm.crmProfileNotes.trim(),
              createdBy: c.createdBy,
              createdAtISO: c.createdAtISO,
            }
          : c
      )
    );
    setShowEdit(false);
    showToast('Customer profile updated.');
  };

  const handleDeleteCustomerProfile = async () => {
    if (
      !(await appConfirm({
        title: 'Delete',
        message: `Permanently delete ${customer.name} (${customerKey})? This cannot be undone.`,
        variant: 'danger',
      }))
    ) {
      return;
    }
    try {
      await deleteCustomer(customerKey);
      showToast('Customer removed.');
      navigate('/sales', { state: { focusSalesTab: 'customers' } });
    } catch (e) {
      const blockers = e?.blockers;
      let msg = e?.message || 'Could not delete customer.';
      if (Array.isArray(blockers) && blockers.length) {
        msg += ` — ${blockers.map((b) => `${b.count} in ${b.table}`).join('; ')}`;
      }
      showToast(msg, { variant: 'error' });
    }
  };

  const openCustomerReportPreview = (kind) => {
    const customerLine = `${customer?.name || 'Customer'} · ${customerKey}`;
    const periodLabel = `${reportFrom} → ${reportTo}`;

    if (kind === 'sales') {
      const inRangeQuotes = quotations.filter(
        (q) =>
          (q.dateISO || '') >= reportFrom && (q.dateISO || '') <= reportTo
      );
      const quoteById = new Map(quotations.map((q) => [String(q.id || '').trim(), q]));
      const metersByRef = metersProducedByQuotationRef(productionJobRows);
      const jobsInRange = customerProductionJobs.filter((j) => {
        if (String(j.status || '').trim() !== 'Completed') return false;
        const iso = productionOutputDateISO(j);
        return iso && iso >= reportFrom && iso <= reportTo;
      });
      const quoteRows = inRangeQuotes.map((q) => ({
        section: 'Quotation',
        ref: String(q.id || '—'),
        date: q.date || q.dateISO || '—',
        detail: `${q.status || '—'} · ${q.paymentStatus || '—'}`,
        value: q.total || formatNgn(q.totalNgn || 0),
      }));
      const prodRows = jobsInRange.map((j) => {
        const ref = String(j.quotationRef || '').trim();
        const q = quoteById.get(ref);
        const ngn = Math.round(allocatedQuotationRevenueForProductionJob(j, q, metersByRef));
        const m = Number(j.actualMeters) || 0;
        return {
          section: 'Produced',
          ref: String(j.jobID || '—'),
          date: productionOutputDateISO(j) || '—',
          detail: `${m} m · Quote ${ref || '—'}`,
          value: formatNgn(ngn),
        };
      });
      const prodTotalNgn = jobsInRange.reduce((s, j) => {
        const ref = String(j.quotationRef || '').trim();
        const q = quoteById.get(ref);
        return s + Math.round(allocatedQuotationRevenueForProductionJob(j, q, metersByRef));
      }, 0);
      setReportPreview({
        title: 'Quotations & produced sales',
        periodLabel: `${periodLabel} · ${customerLine}`,
        columns: [
          { key: 'section', label: 'Section' },
          { key: 'ref', label: 'Reference' },
          { key: 'date', label: 'Date' },
          { key: 'detail', label: 'Detail' },
          { key: 'value', label: 'Amount / status' },
        ],
        rows: [...quoteRows, ...prodRows],
        summaryLines: [
          { label: 'Quotations in period (by quote date)', value: String(inRangeQuotes.length) },
          { label: 'Production jobs completed in period', value: String(jobsInRange.length) },
          { label: 'Allocated revenue from production (period)', value: formatNgn(prodTotalNgn) },
        ],
      });
    } else if (kind === 'payments') {
      const inRange = receipts.filter(
        (r) =>
          (r.dateISO || '') >= reportFrom && (r.dateISO || '') <= reportTo
      );
      const totalNgn = inRange.reduce((s, r) => s + receiptCashReceivedNgn(r), 0);
      setReportPreview({
        title: 'Payment history',
        periodLabel: `${periodLabel} · ${customerLine}`,
        columns: [
          { key: 'id', label: 'Receipt' },
          { key: 'date', label: 'Date' },
          { key: 'amount', label: 'Amount' },
          { key: 'method', label: 'Method' },
          { key: 'quote', label: 'Quotation' },
        ],
        rows: inRange.map((r) => ({
          id: String(r.id || '—'),
          date: r.date || r.dateISO || '—',
          amount: r.amount || formatNgn(receiptCashReceivedNgn(r)),
          method: r.method || '—',
          quote: String(r.quotationRef || '—'),
        })),
        summaryLines: [
          { label: 'Receipts in period', value: String(inRange.length) },
          { label: 'Cash received (period)', value: formatNgn(totalNgn) },
        ],
      });
    } else {
      const overdueN = outstandingLines.filter((o) => o.overdue).length;
      setReportPreview({
        title: 'Outstanding & overdue',
        periodLabel: `Open balances (current) · Range context ${periodLabel} · ${customerLine}`,
        columns: [
          { key: 'id', label: 'Quotation' },
          { key: 'due', label: 'Due date' },
          { key: 'amount', label: 'Balance due' },
          { key: 'status', label: 'Status' },
        ],
        rows: outstandingLines.map((o) => ({
          id: String(o.id || '—'),
          due: o.due || '—',
          amount: formatNgn(o.amountNgn),
          status: o.overdue ? 'Overdue' : 'Open',
        })),
        summaryLines: [
          { label: 'Total outstanding', value: formatNgn(outstandingNgn) },
          { label: 'Open lines', value: String(outstandingLines.length) },
          { label: 'Overdue lines', value: String(overdueN) },
        ],
      });
    }

    setShowReports(false);
    setReportPreviewOpen(true);
  };

  if (!customer) {
    return (
      <PageShell>
        <PageHeader title="Customer" subtitle="Not found" />
        <MainPanel>
          <div className="z-empty-state max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <User size={28} />
            </div>
            <p className="text-base font-bold text-zarewa-teal mb-2">Customer not found</p>
            <p className="text-sm text-slate-500 mb-6">
              No profile matches <span className="font-mono font-semibold">{routeCustomerId}</span>.
            </p>
            <Link
              to="/sales"
              state={{ focusSalesTab: 'customers' }}
              className="z-btn-primary inline-flex"
            >
              <ArrowLeft size={16} /> Back to customers
            </Link>
          </div>
        </MainPanel>
      </PageShell>
    );
  }

  const paymentRelationship =
    overdueCount > 0
      ? { label: 'Follow-up required', tone: 'danger' }
      : outstandingNgn > 0
        ? { label: 'Balance outstanding', tone: 'warn' }
        : { label: 'Up to date', tone: 'ok' };

  return (
    <PageShell blurred={showEdit || !!detail || showReports || reportPreviewOpen}>
      <Breadcrumbs
        className="mb-4"
        items={[
          { label: 'Sales', to: '/sales' },
          { label: 'Customers', to: '/customers' },
          { label: customer.name },
        ]}
      />
      <PageHeader
        title={customer.name}
        subtitle={`${customer.customerID} · ${customer.tier} · ${customer.paymentTerms}`}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() =>
                navigate('/sales', { state: { focusSalesTab: 'customers' } })
              }
              className="z-btn-secondary"
            >
              <ArrowLeft size={16} /> All customers
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomerEditApprovalId('');
                setShowEdit(true);
              }}
              className="z-btn-primary"
            >
              <Pencil size={16} /> Edit profile
            </button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start min-w-0">
        <aside className="w-full lg:w-60 shrink-0 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400 px-3 py-2">
              Sections
            </p>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 custom-scrollbar">
          {NAV.map((item) => {
            const NavIcon = item.icon;
            const hash = `#cd-${item.id}`;
            const isActive = location.hash === hash || (!location.hash && item.id === 'overview');
            return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                navigate(
                  { pathname: location.pathname, search: location.search, hash },
                  { replace: true }
                )
              }
              aria-current={isActive ? 'location' : undefined}
              className={`shrink-0 lg:w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all ${
                isActive
                  ? 'text-white bg-zarewa-teal shadow-md shadow-teal-900/15'
                  : 'text-zarewa-teal hover:bg-teal-50 border border-transparent hover:border-teal-100'
              }`}
            >
              <NavIcon size={14} />
              {item.label}
            </button>
            );
          })}
            </nav>
          </div>
        </aside>

        <MainPanel className="flex-1 min-w-0 !pt-0">
          <CustomerProfileHero customer={customer} paymentRelationship={paymentRelationship} />

          {(customer.companyName ||
            customer.leadSource ||
            customer.preferredContact ||
            customer.followUpISO ||
            (customer.crmTags && customer.crmTags.length) ||
            customer.crmProfileNotes) ? (
            <section
              className="rounded-2xl border border-slate-200/80 bg-white p-5 mb-8 shadow-sm"
              aria-label="CRM profile"
            >
              <p className="text-ui-xs font-black text-zarewa-teal uppercase tracking-widest mb-4 flex items-center gap-2">
                <User size={14} className="text-teal-600" />
                CRM profile
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {customer.companyName ? (
                  <div>
                    <span className="text-ui-xs font-bold text-gray-400 uppercase block">Company</span>
                    <span className="font-semibold text-gray-800">{customer.companyName}</span>
                  </div>
                ) : null}
                {customer.leadSource ? (
                  <div>
                    <span className="text-ui-xs font-bold text-gray-400 uppercase block">Lead source</span>
                    <span className="font-semibold text-gray-800">{customer.leadSource}</span>
                  </div>
                ) : null}
                {customer.preferredContact ? (
                  <div>
                    <span className="text-ui-xs font-bold text-gray-400 uppercase block">Preferred contact</span>
                    <span className="font-semibold text-gray-800">{customer.preferredContact}</span>
                  </div>
                ) : null}
                {customer.followUpISO ? (
                  <div>
                    <span className="text-ui-xs font-bold text-gray-400 uppercase block">Next follow-up</span>
                    <span className="font-semibold text-amber-900">{customer.followUpISO}</span>
                  </div>
                ) : null}
              </div>
              {customer.crmTags && customer.crmTags.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-4">
                  {customer.crmTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-ui-xs font-bold uppercase px-2.5 py-1 rounded-full bg-teal-50 border border-teal-100 text-zarewa-teal"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {customer.crmProfileNotes ? (
                <p className="text-xs text-gray-600 mt-4 leading-relaxed border-t border-gray-200/80 pt-4">
                  {customer.crmProfileNotes}
                </p>
              ) : null}
            </section>
          ) : null}

          {ws?.hasPermission?.('sales.manage') && ws?.canMutate ? (
            <section
              className="mb-8 rounded-2xl border border-red-100 bg-red-50/50 px-4 py-4"
              aria-label="Delete customer"
            >
              <p className="text-ui-xs font-black uppercase tracking-widest text-red-800 mb-1">
                Danger zone
              </p>
              <p className="text-xs text-red-900/85 mb-3 max-w-xl">
                Remove this customer only when they have no quotations, receipts, ledger entries, or other
                linked records. The server will list any blockers if delete is not allowed.
              </p>
              <button
                type="button"
                onClick={handleDeleteCustomerProfile}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-800 hover:bg-red-100/80"
              >
                <Trash2 size={16} />
                Delete customer
              </button>
            </section>
          ) : null}

          {paymentIntegrity?.hasIssues ? (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              <AlertTriangle className="shrink-0 mt-0.5 text-amber-700" size={18} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  Payment data issue{paymentIntegrity.criticalCount > 0 ? ' — review before refunding' : ''}
                </p>
                <ul className="mt-1.5 space-y-1 text-xs text-amber-900/95 list-disc pl-4">
                  {paymentIntegrity.issues.slice(0, 4).map((iss, idx) => (
                    <li key={iss.code || idx}>{iss.message}</li>
                  ))}
                </ul>
                {paymentIntegrity.issues.length > 4 ? (
                  <p className="text-ui-xs text-amber-800/80 mt-1">
                    +{paymentIntegrity.issues.length - 4} more — see refund screen per quotation.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {overdueCount > 0 ? (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-900">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold">{overdueCount} overdue invoice(s)</p>
                <p className="text-xs text-red-800/90 mt-0.5">
                  Review outstanding balances and send payment reminders from Sales →
                  Quotations.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/sales', { state: { focusSalesTab: 'quotations' } })}
                  className="mt-2 text-ui-xs font-black uppercase text-red-800 underline-offset-2 hover:underline"
                >
                  Open sales workspace
                </button>
              </div>
            </div>
          ) : null}

          <CustomerKpiStrip
            outstandingNgn={outstandingNgn}
            advanceBalNgn={advanceBalNgn}
            overpayCreditBalNgn={overpayCreditBalNgn}
            totalPaidReceiptsNgn={totalPaidReceiptsNgn}
            quotationsCount={quotations.length}
            pendingQuotationsCount={pendingQuotationsCount}
            paymentProgressPct={paymentProgressPct}
            onRefundAdvance={
              advanceBalNgn > 0
                ? () => {
                    setRefundAdvanceAmt('');
                    setRefundAdvanceOpen(true);
                  }
                : undefined
            }
          />

          <section className="mb-10 rounded-zarewa border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-1 flex items-center gap-2">
              <BarChart3 size={16} />
              Sales trend (last 6 months)
            </h2>
            <p className="text-ui-xs text-gray-500 mb-3">
              Totals from this customer’s sales receipts (cash received), by calendar month. Axis in millions of naira
              (e.g. 2M = ₦2,000,000).
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cdSalesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-zarewa-teal)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--color-zarewa-teal)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={salesTrendAxisTick}
                  />
                  <Tooltip
                    formatter={salesTrendTooltipVolume}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload;
                      if (row?.monthKey) {
                        const yy = String(row.monthKey).slice(0, 4);
                        return `${row.month} ${yy}`;
                      }
                      return String(_ ?? '');
                    }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amountM"
                    stroke="var(--color-zarewa-teal)"
                    strokeWidth={2}
                    fill="url(#cdSalesFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section id="cd-quotations" className="mb-10 scroll-mt-28">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} />
                Quotation history
              </h2>
              <button
                type="button"
                onClick={() => navigate('/sales', { state: { focusSalesTab: 'quotations' } })}
                className="text-ui-xs font-black uppercase text-zarewa-teal flex items-center gap-1 hover:underline"
              >
                Sales <ChevronRight size={14} />
              </button>
            </div>
            <SalesListTableFrame
              toolbar={
                <>
                  <SalesListSearchInput
                    value={cdQuoteSearch}
                    onChange={setCdQuoteSearch}
                    placeholder="Search quotation ID, date, total, status…"
                  />
                  <SalesListSortBar
                    fields={SALES_TABLE_SORT_FIELD_OPTIONS.quotations}
                    field={cdQuoteSort.field}
                    dir={cdQuoteSort.dir}
                    onFieldChange={(field) => setCdQuoteSort((s) => ({ ...s, field }))}
                    onDirToggle={() =>
                      setCdQuoteSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
                    }
                  />
                </>
              }
            >
              <div className="grid grid-cols-12 gap-2 px-2 py-2 bg-slate-50 text-ui-xs font-bold text-slate-400 uppercase tracking-widest rounded-t-lg border border-slate-100 border-b-0">
                <div className="col-span-3">ID</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-3 text-right">Total</div>
                <div className="col-span-4">Status</div>
              </div>
              {quotationTableRows.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest border border-t-0 border-slate-100 rounded-b-lg">
                  No quotations match
                </p>
              ) : (
                <div className="rounded-b-lg border border-t-0 border-slate-100 divide-y divide-slate-100 overflow-hidden">
                {quotationTableRows.map((q) => {
                  const st = quotationUiStatus(q, todayIso);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => goSalesQuotation(q.id)}
                      className="grid grid-cols-12 gap-2 w-full px-4 py-3 text-left hover:bg-teal-50/30 transition-colors items-center"
                    >
                      <div className="col-span-3 text-xs font-bold text-zarewa-teal">{q.id}</div>
                      <div className="col-span-2 text-xs text-gray-500">{q.date}</div>
                      <div className="col-span-3 text-right text-sm font-black text-zarewa-teal">
                        {q.total}
                      </div>
                      <div className="col-span-4">
                        <StatusBadge label={st.label} tone={quotationUiStatusTone(st.tone)} />
                      </div>
                      {q.handledBy ? (
                        <div className="col-span-12 text-ui-xs text-gray-500 mt-1">
                          Handled by{' '}
                          <span className="font-semibold text-gray-700">{q.handledBy}</span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
                </div>
              )}
            </SalesListTableFrame>
          </section>

          <section id="cd-cutting" className="mb-10 scroll-mt-28">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest flex items-center gap-2">
                <Scissors size={16} />
                Cutting lists
              </h2>
              <button
                type="button"
                onClick={() => navigate('/sales', { state: { focusSalesTab: 'cuttinglist' } })}
                className="text-ui-xs font-black uppercase text-zarewa-teal flex items-center gap-1 hover:underline"
              >
                Sales <ChevronRight size={14} />
              </button>
            </div>
            <SalesListTableFrame
              toolbar={
                <>
                  <SalesListSearchInput
                    value={cdCutSearch}
                    onChange={setCdCutSearch}
                    placeholder="Search list ID, date, total, status…"
                  />
                  <SalesListSortBar
                    fields={SALES_TABLE_SORT_FIELD_OPTIONS.cuttinglist}
                    field={cdCutSort.field}
                    dir={cdCutSort.dir}
                    onFieldChange={(field) => setCdCutSort((s) => ({ ...s, field }))}
                    onDirToggle={() =>
                      setCdCutSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
                    }
                  />
                </>
              }
            >
              {cuttingTableRows.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                  No cutting lists match
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
                  {cuttingTableRows.map((cl) => (
                    <li key={cl.id}>
                      <button
                        type="button"
                        onClick={() => goSalesCutting(cl.id)}
                        className="w-full grid grid-cols-12 gap-2 px-4 py-3 text-left hover:bg-teal-50/30 transition-colors items-center"
                      >
                        <div className="col-span-3 text-xs font-bold text-zarewa-teal">{cl.id}</div>
                        <div className="col-span-3 text-xs text-gray-500">{cl.date}</div>
                        <div className="col-span-3 text-right text-sm font-black text-zarewa-teal">
                          {cl.total}
                        </div>
                        <div className="col-span-3">
                          <span className="text-ui-xs font-bold uppercase px-2 py-1 rounded-full bg-sky-100 text-sky-800">
                            {cl.status}
                          </span>
                        </div>
                        {cl.handledBy ? (
                          <div className="col-span-12 text-ui-xs text-gray-500">
                            By <span className="font-semibold">{cl.handledBy}</span>
                          </div>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SalesListTableFrame>
          </section>

          <section id="cd-orders" className="mb-10 scroll-mt-28">
            <h2 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-4 flex items-center gap-2">
              <Package size={16} />
              Order history
            </h2>
            <div className="rounded-zarewa border border-gray-100 overflow-hidden bg-white shadow-sm">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-ui-xs font-bold text-gray-400 uppercase tracking-widest">
                <div className="col-span-2">Order</div>
                <div className="col-span-4">Products</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-2">Status</div>
              </div>
              {sortedOrders.length === 0 ? (
                <p className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
                  No orders on file
                </p>
              ) : (
                sortedOrders.map((o) => {
                  const lines = safeLines(o.lines);
                  const qtySum = lines.reduce((s, l) => s + (Number(l?.qty) || 0), 0);
                  const prodSummary = lines.map((l) => l?.product).filter(Boolean).join('; ');
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setDetail({ type: 'order', row: o })}
                      className="grid grid-cols-12 gap-2 w-full px-4 py-3 text-left border-t border-gray-50 hover:bg-teal-50/30 transition-colors items-center"
                    >
                      <div className="col-span-2 text-xs font-bold text-zarewa-teal">{o.id}</div>
                      <div className="col-span-4 text-xs text-gray-600 line-clamp-2">
                        {prodSummary}
                      </div>
                      <div className="col-span-2 text-xs font-bold text-gray-700">{qtySum}</div>
                      <div className="col-span-2 text-right text-sm font-black text-zarewa-teal">
                        {formatNgn(o.totalNgn)}
                      </div>
                      <div className="col-span-2">
                        <span
                          className={`text-ui-xs font-bold uppercase px-2 py-1 rounded-full ${orderStatusClass(o.status)}`}
                        >
                          {o.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section id="cd-financial" className="mb-10 scroll-mt-28">
            <h2 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-4 flex items-center gap-2">
              <Wallet size={16} />
              Financial — receipts & outstanding
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-zarewa border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <p className="text-ui-xs font-bold text-gray-400 uppercase tracking-widest">
                    Payment history
                  </p>
                  <select
                    value={payWindow}
                    onChange={(e) => setPayWindow(e.target.value)}
                    className="text-ui-xs font-bold uppercase border border-gray-100 rounded-lg py-1.5 px-2 bg-gray-50"
                  >
                    <option value="all">All (full history)</option>
                    <option value="30">Last 30 days</option>
                    <option value="60">Last 60 days</option>
                  </select>
                </div>
                <SalesListTableFrame
                  toolbar={
                    <>
                      <SalesListSearchInput
                        value={cdRcptSearch}
                        onChange={setCdRcptSearch}
                        placeholder="Search receipt ID, date, amount, method…"
                      />
                      <SalesListSortBar
                        fields={SALES_TABLE_SORT_FIELD_OPTIONS.receipts}
                        field={cdRcptSort.field}
                        dir={cdRcptSort.dir}
                        onFieldChange={(field) => setCdRcptSort((s) => ({ ...s, field }))}
                        onDirToggle={() =>
                          setCdRcptSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
                        }
                      />
                    </>
                  }
                >
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredReceipts.length === 0 ? (
                      <li className="text-xs text-slate-400 py-4 text-center">No receipts match</li>
                    ) : (
                      filteredReceipts.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => goSalesReceipt(r.id)}
                            className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-left hover:border-teal-100 hover:bg-white transition-all"
                          >
                            <div>
                              <p className="text-xs font-bold text-zarewa-teal">{r.id}</p>
                              <p className="text-ui-xs text-gray-500">
                                {r.date} · {r.method || '—'}
                              </p>
                            </div>
                            <span className="text-sm font-black text-zarewa-teal shrink-0">
                              {r.amount}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </SalesListTableFrame>
              </div>
              <div className="rounded-zarewa border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-ui-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Outstanding & due
                </p>
                {outstandingLines.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-bold py-4">
                    <CheckCircle2 size={18} />
                    No open balances
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {outstandingLines.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => goSalesQuotation(o.id)}
                          className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-50 px-3 py-2 text-left hover:bg-red-50/50 hover:border-red-100 transition-all"
                        >
                          <div>
                            <p className="text-xs font-bold text-zarewa-teal">{o.id}</p>
                            <p className="text-ui-xs text-gray-500">
                              Due {o.due || '—'}
                              {o.overdue ? (
                                <span className="ml-2 text-red-600 font-bold">Overdue</span>
                              ) : null}
                            </p>
                          </div>
                          <span className="text-sm font-black text-zarewa-teal">
                            {formatNgn(o.amountNgn)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {ws.hasPermission('finance.post') && outstandingLines.length > 0 ? (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-ui-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                      Collections follow-up (finance queue)
                    </p>
                    <p className="text-ui-xs text-slate-600 mb-2 leading-relaxed">
                      Creates an office work item for finance using the current branch scope. Use for agreed call-back
                      dates or payment promises.
                    </p>
                    <textarea
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs min-h-[4rem]"
                      value={collectionsNote}
                      onChange={(e) => setCollectionsNote(e.target.value)}
                      placeholder="Note for finance (next step, amount discussed, date)…"
                    />
                    <button
                      type="button"
                      disabled={collectionsBusy}
                      className="mt-2 z-btn-primary !text-xs"
                      onClick={async () => {
                        setCollectionsBusy(true);
                        try {
                          const { ok, data } = await apiFetch('/api/finance/collections-follow-up', {
                            method: 'POST',
                            body: JSON.stringify({
                              customerId: customerKey,
                              customerName: customer?.name || customer?.companyName || customerKey,
                              note: collectionsNote.trim(),
                            }),
                          });
                          if (!ok || !data?.ok) {
                            showToast(data?.error || 'Could not create work item.', { variant: 'error' });
                            return;
                          }
                          showToast('Collections work item created for finance.', { variant: 'success' });
                          setCollectionsNote('');
                          await ws.refresh?.();
                        } finally {
                          setCollectionsBusy(false);
                        }
                      }}
                    >
                      {collectionsBusy ? 'Sending…' : 'Queue for collections'}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="rounded-zarewa border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
                <p className="text-ui-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Customer ledger (browser — audit trail)
                </p>
                {ledgerLines.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">
                    No ledger movements yet. Post advances or receipts from Sales.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                    {ledgerLines.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-gray-50 bg-gray-50/50 px-3 py-2 text-left"
                      >
                        <div className="min-w-0">
                          <p className="text-ui-xs font-bold text-zarewa-teal">{ledgerTypeLabel(row.type)}</p>
                          <p className="text-ui-xs text-gray-500 font-mono">
                            {(row.atISO || '').slice(0, 10)} · {row.quotationRef || '—'}
                          </p>
                          {row.note ? (
                            <p className="text-ui-xs text-gray-600 mt-0.5 line-clamp-2">{row.note}</p>
                          ) : null}
                        </div>
                        <span className="text-sm font-black text-zarewa-teal tabular-nums shrink-0">
                          {formatNgn(row.amountNgn)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section id="cd-refunds" className="mb-10 scroll-mt-28">
            <h2 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-4 flex items-center gap-2">
              <RotateCcw size={16} />
              Refunds
            </h2>
            <SalesListTableFrame
              toolbar={
                <>
                  <SalesListSearchInput
                    value={cdRfSearch}
                    onChange={setCdRfSearch}
                    placeholder="Search refund ID, status, reason, amount…"
                  />
                  <SalesListSortBar
                    fields={SALES_TABLE_SORT_FIELD_OPTIONS.refund}
                    field={cdRfSort.field}
                    dir={cdRfSort.dir}
                    onFieldChange={(field) => setCdRfSort((s) => ({ ...s, field }))}
                    onDirToggle={() =>
                      setCdRfSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
                    }
                  />
                </>
              }
            >
              {refundTableRows.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                  No refunds match
                </p>
              ) : (
                <ul className="space-y-2">
                  {refundTableRows.map((r) => (
                    <li key={r.refundID}>
                      <button
                        type="button"
                        onClick={() => goSalesRefund(r.refundID)}
                        className="w-full flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left hover:border-rose-100 hover:bg-rose-50/20 transition-all"
                      >
                        <div>
                          <p className="text-xs font-mono font-bold text-zarewa-teal">{r.refundID}</p>
                          <p className="text-ui-xs text-gray-500">{r.reasonCategory || r.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-zarewa-teal tabular-nums">
                            {formatNgn(r.amountNgn)}
                          </p>
                          <SalesStatusChip label={r.status} chipClass={refundStatusChipClass(r.status)} />
                          {(r.status === 'Approved' || r.status === 'Paid') && (
                            <p className="text-ui-xs text-gray-500 tabular-nums">
                              Bal {formatNgn(refundOutstandingAmount(r))}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SalesListTableFrame>
          </section>

          <section id="cd-activity" className="mb-10 scroll-mt-28">
            <h2 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-4 flex items-center gap-2">
              <ScrollText size={16} />
              Transactions, interactions & notes
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 rounded-zarewa border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-ui-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Unified timeline
                </p>
                <ul className="space-y-4 border-l-2 border-gray-100 ml-2 pl-4">
                  {mergedTimeline.length === 0 ? (
                    <li className="text-xs text-gray-400">No activity logged</li>
                  ) : (
                    mergedTimeline.map((item, idx) => (
                      <li key={`${item.sort}-${item.source}-${idx}`} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-zarewa-teal ring-4 ring-white" />
                        {item.source === 'tx' && item.txType && item.txId ? (
                          <button
                            type="button"
                            className="w-full text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-teal-50/60"
                            onClick={() => {
                              if (item.txType === 'quotation') goSalesQuotation(item.txId);
                              if (item.txType === 'receipt') goSalesReceipt(item.txId);
                              if (item.txType === 'refund') goSalesRefund(item.txId);
                              if (item.txType === 'cutting') goSalesCutting(item.txId);
                            }}
                          >
                            <p className="text-ui-xs font-bold text-gray-400 uppercase">
                              {safeIso(item.sort).slice(0, 10) || '—'} · {item.kind} · record
                            </p>
                            <p className="text-sm font-bold text-zarewa-teal">{item.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{item.detail}</p>
                          </button>
                        ) : (
                          <>
                            <p className="text-ui-xs font-bold text-gray-400 uppercase">
                              {safeIso(item.sort).slice(0, 10) || '—'} · {item.kind}
                              {item.source === 'tx' ? ' · record' : ''}
                            </p>
                            <p className="text-sm font-bold text-zarewa-teal">{item.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{item.detail}</p>
                          </>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="lg:col-span-2 rounded-zarewa border border-gray-100 bg-gray-50/50 p-5 shadow-sm">
                <p className="text-ui-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <MessageSquarePlus size={14} />
                  Add staff note
                </p>
                <p className="text-ui-xs text-gray-500 mb-3 leading-snug">
                  When signed in, notes are stored on the server for the whole sales team. Offline entries stay
                  on this browser only.
                </p>
                <form onSubmit={addNote} className="space-y-3">
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={4}
                    placeholder="Preferences, complaints, follow-up reminders…"
                    className="w-full rounded-xl border border-gray-100 bg-white py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-zarewa-teal/15 resize-none"
                  />
                  <button type="submit" className="z-btn-primary w-full justify-center py-2.5 text-xs">
                    Save note
                  </button>
                </form>
              </div>
            </div>
          </section>

          <section id="cd-reports" className="scroll-mt-28">
            <h2 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart3 size={16} />
              Reporting
            </h2>
            <div className="rounded-zarewa border border-dashed border-gray-200 bg-white/80 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-zarewa-teal">Customer activity reports</p>
                <p className="text-xs text-gray-500 mt-1">
                  Sales, payment history, and outstanding balances for a chosen period.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReports(true)}
                className="z-btn-secondary shrink-0"
              >
                Generate report…
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-ui-xs font-bold text-gray-400 uppercase block">
                    Shipping
                  </span>
                  {customer.addressShipping}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-ui-xs font-bold text-gray-400 uppercase block">
                    Billing
                  </span>
                  {customer.addressBilling}
                </div>
              </div>
              <div className="flex items-start gap-2 md:col-span-2">
                <BadgeCheck size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-ui-xs font-bold text-gray-400 uppercase block">
                    Payment terms
                  </span>
                  {customer.paymentTerms}
                </div>
              </div>
            </div>
          </section>
        </MainPanel>
      </div>

      <ModalFrame
        isOpen={showEdit}
        onClose={() => {
          setShowEdit(false);
          setCustomerEditApprovalId('');
        }}
      >
        <ModalScrollShell size="md">
          <ModalScrollHeader>
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="text-ui-xs font-bold uppercase tracking-widest text-teal-600 mb-1">
                  {customerKey}
                </p>
                <h3 className="text-xl font-black text-zarewa-teal flex items-center gap-2">
                  <Pencil size={20} className="text-teal-600 shrink-0" />
                  Edit customer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEdit(false);
                  setCustomerEditApprovalId('');
                }}
                className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 shrink-0"
              >
                <X size={22} />
              </button>
            </div>
          </ModalScrollHeader>
          <ModalScrollBody>
            <form onSubmit={saveProfile} className="space-y-5">
              <CustomerFormFields
                form={editForm}
                setForm={setEditForm}
                customerId={customerKey}
                showBilling
                showCrm
                tierOptions={['Regular', 'VIP', 'Wholesale', 'Trade', 'Staff']}
                paymentTermsOptions={['Due on receipt', 'Net 14', 'Net 30', 'Net 60', 'Staff credit']}
              >
                <EditSecondApprovalInline
                  entityKind="customer"
                  entityId={customerKey}
                  value={customerEditApprovalId}
                  onChange={setCustomerEditApprovalId}
                />
              </CustomerFormFields>
              <button type="submit" className="z-btn-primary w-full justify-center py-3.5 mt-2">
                Save changes
              </button>
            </form>
          </ModalScrollBody>
        </ModalScrollShell>
      </ModalFrame>

      <ModalFrame isOpen={!!detail} onClose={() => setDetail(null)}>
        <div className="z-modal-panel max-w-md p-8">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-zarewa-teal">
              {detail?.type === 'quotation' && 'Quotation'}
              {detail?.type === 'order' && 'Order'}
              {detail?.type === 'receipt' && 'Receipt'}
              {detail?.type === 'cutting' && 'Cutting list'}
              {detail?.type === 'refund' && 'Refund'}
            </h3>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50"
            >
              <X size={22} />
            </button>
          </div>
          {detail?.type === 'quotation' && detail.row ? (
            <div className="space-y-3 text-sm">
              <p className="font-mono font-bold text-zarewa-teal">{detail.row.id}</p>
              <p className="text-gray-600">{detail.row.customer}</p>
              <p>
                <span className="text-gray-400 text-xs font-bold uppercase">Total</span>{' '}
                <span className="font-black">{detail.row.total}</span>
              </p>
              <p>
                <span className="text-gray-400 text-xs font-bold uppercase">Payment received</span>{' '}
                <span className="font-black">{formatNgn(detail.row.paidNgn || 0)}</span>
              </p>
              <p className="text-ui-xs text-gray-500">Total amount paid on this quotation (receipts + advance applied)</p>
              <p className="text-xs text-gray-500">{detail.row.customerFeedback || '—'}</p>
              {detail.row.handledBy ? (
                <p className="text-xs">
                  <span className="text-gray-400 font-bold uppercase">Handled by</span>{' '}
                  {detail.row.handledBy}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  goSalesQuotation(detail.row.id);
                  setDetail(null);
                }}
                className="z-btn-primary w-full justify-center mt-4"
              >
                Open in Sales
              </button>
            </div>
          ) : null}
          {detail?.type === 'order' && detail.row ? (
            <div className="space-y-3 text-sm">
              <p className="font-mono font-bold text-zarewa-teal">{detail.row.id}</p>
              <p className="text-xs text-gray-500">{detail.row.date}</p>
              <ul className="border border-gray-100 rounded-xl divide-y divide-gray-50">
                {safeLines(detail.row.lines).map((l, i) => (
                  <li key={i} className="px-3 py-2 flex justify-between gap-2">
                    <span className="text-gray-700">{l.product}</span>
                    <span className="font-bold text-zarewa-teal shrink-0">
                      {l.qty} {l.unit}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="font-black text-zarewa-teal">{formatNgn(detail.row.totalNgn)}</p>
              <p className="text-xs">
                Linked quote:{' '}
                <button
                  type="button"
                  className="font-bold text-zarewa-teal underline"
                  onClick={() => {
                    goSalesQuotation(detail.row.quotationRef);
                    setDetail(null);
                  }}
                >
                  {detail.row.quotationRef}
                </button>
              </p>
            </div>
          ) : null}
          {detail?.type === 'receipt' && detail.row ? (
            <div className="space-y-3 text-sm">
              <p className="font-mono font-bold text-zarewa-teal">{detail.row.id}</p>
              <p>{detail.row.amount}</p>
              <p className="text-xs text-gray-500">
                {detail.row.date} · {detail.row.method || '—'}
              </p>
              <p className="text-xs">
                Quotation: {detail.row.quotationRef}
              </p>
              {detail.row.handledBy ? (
                <p className="text-xs text-gray-600">Recorded by {detail.row.handledBy}</p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  goSalesReceipt(detail.row.id);
                  setDetail(null);
                }}
                className="z-btn-primary w-full justify-center mt-4"
              >
                Open in Sales
              </button>
            </div>
          ) : null}
          {detail?.type === 'cutting' && detail.row ? (
            <div className="space-y-3 text-sm">
              <p className="font-mono font-bold text-zarewa-teal">{detail.row.id}</p>
              <p>
                <span className="text-gray-400 text-xs font-bold uppercase">Total length</span>{' '}
                <span className="font-black">{detail.row.total}</span>
              </p>
              <p className="text-xs text-gray-500">{detail.row.date}</p>
              {detail.row.quotationRef ? (
                <p className="text-xs">
                  Linked quote:{' '}
                  <button
                    type="button"
                    className="font-bold text-zarewa-teal underline"
                    onClick={() => {
                      goSalesQuotation(detail.row.quotationRef);
                      setDetail(null);
                    }}
                  >
                    {detail.row.quotationRef}
                  </button>
                </p>
              ) : null}
              {detail.row.handledBy ? (
                <p className="text-xs text-gray-600">Prepared by {detail.row.handledBy}</p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  navigate('/sales', { state: { focusSalesTab: 'cuttinglist' } });
                  setDetail(null);
                }}
                className="z-btn-primary w-full justify-center mt-4"
              >
                Open cutting lists in Sales
              </button>
            </div>
          ) : null}
          {detail?.type === 'refund' && detail.row ? (
            <div className="space-y-3 text-sm">
              <p className="font-mono font-bold text-zarewa-teal">{detail.row.refundID}</p>
              <p className="font-black text-zarewa-teal">{formatNgn(detail.row.amountNgn)}</p>
              {(detail.row.status === 'Approved' || detail.row.status === 'Paid') && (
                <p className="text-xs text-gray-500 tabular-nums">
                  Approved {formatNgn(refundApprovedAmount(detail.row))} · Balance {formatNgn(refundOutstandingAmount(detail.row))}
                </p>
              )}
              <p className="text-xs text-gray-600">{detail.row.reason}</p>
              <p className="text-ui-xs text-gray-500">
                Status: {detail.row.status}
                {detail.row.requestedBy ? ` · Requested by ${detail.row.requestedBy}` : ''}
                {detail.row.approvedBy ? ` · Approved by ${detail.row.approvedBy}` : ''}
                {detail.row.paidBy ? ` · Paid by ${detail.row.paidBy}` : ''}
              </p>
              {Array.isArray(detail.row.calculationLines) && detail.row.calculationLines.length > 0 ? (
                <ul className="border border-gray-100 rounded-xl divide-y divide-gray-50 text-xs">
                  {detail.row.calculationLines.map((l, i) => (
                    <li key={i} className="px-3 py-2 flex justify-between gap-2">
                      <span className="text-gray-700">{l.label}</span>
                      <span className="font-bold text-zarewa-teal tabular-nums">
                        {formatNgn(l.amountNgn)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {detail.row.calculationNotes ? (
                <p className="text-xs text-gray-500">{detail.row.calculationNotes}</p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  goSalesRefund(detail.row.refundID);
                  setDetail(null);
                }}
                className="z-btn-primary w-full justify-center mt-4"
              >
                Open in Sales (Refunds)
              </button>
            </div>
          ) : null}
        </div>
      </ModalFrame>

      <ModalFrame isOpen={showReports} onClose={() => setShowReports(false)}>
        <div className="z-modal-panel max-w-lg w-full p-0 overflow-hidden rounded-2xl border border-slate-200/90 shadow-xl bg-white">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-br from-zarewa-teal/[0.07] via-white to-white">
            <div className="flex justify-between items-start gap-3">
              <div className="flex gap-3 min-w-0">
                <div
                  className="h-11 w-11 rounded-xl bg-zarewa-teal/10 flex items-center justify-center shrink-0"
                  aria-hidden
                >
                  <Printer className="text-zarewa-teal" size={22} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-zarewa-teal tracking-tight">Customer report</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Pick a date range, then open a print preview. Use your browser’s print dialog to print or save as PDF.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReports(false)}
                className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 shrink-0"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <p className="text-ui-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Period</p>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="z-field-label">From</label>
                  <input
                    type="date"
                    value={reportFrom}
                    onChange={(e) => setReportFrom(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-zarewa-teal outline-none focus:ring-2 focus:ring-zarewa-teal/20"
                  />
                </div>
                <div>
                  <label className="z-field-label">To</label>
                  <input
                    type="date"
                    value={reportTo}
                    onChange={(e) => setReportTo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-zarewa-teal outline-none focus:ring-2 focus:ring-zarewa-teal/20"
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="text-ui-xs font-bold text-slate-400 uppercase tracking-widest mb-3">What to include</p>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <button
                    type="button"
                    onClick={() => openCustomerReportPreview('sales')}
                    className="w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm hover:border-zarewa-teal/35 hover:bg-zarewa-teal/[0.03] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zarewa-teal group-hover:underline-offset-2">
                          Quotations & produced sales
                        </p>
                        <p className="text-xs text-slate-500 mt-1 leading-snug">
                          Quotes dated in range plus completed production with allocated revenue.
                        </p>
                      </div>
                      <Printer
                        size={18}
                        className="text-slate-300 group-hover:text-zarewa-teal shrink-0 mt-0.5"
                        aria-hidden
                      />
                    </div>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openCustomerReportPreview('payments')}
                    className="w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm hover:border-zarewa-teal/35 hover:bg-zarewa-teal/[0.03] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zarewa-teal">Payment history</p>
                        <p className="text-xs text-slate-500 mt-1 leading-snug">
                          Receipts recorded between the dates you chose.
                        </p>
                      </div>
                      <Printer
                        size={18}
                        className="text-slate-300 group-hover:text-zarewa-teal shrink-0 mt-0.5"
                        aria-hidden
                      />
                    </div>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openCustomerReportPreview('outstanding')}
                    className="w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm hover:border-zarewa-teal/35 hover:bg-zarewa-teal/[0.03] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zarewa-teal">Outstanding & overdue</p>
                        <p className="text-xs text-slate-500 mt-1 leading-snug">
                          Current open balances; period shows context only.
                        </p>
                      </div>
                      <Printer
                        size={18}
                        className="text-slate-300 group-hover:text-zarewa-teal shrink-0 mt-0.5"
                        aria-hidden
                      />
                    </div>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </ModalFrame>

      <ReportPrintModal
        isOpen={reportPreviewOpen}
        onClose={() => {
          setReportPreviewOpen(false);
          setReportPreview(null);
        }}
        title={reportPreview?.title || 'Report'}
        periodLabel={reportPreview?.periodLabel || ''}
        columns={reportPreview?.columns || []}
        rows={reportPreview?.rows || []}
        summaryLines={reportPreview?.summaryLines || []}
      />

      <RefundAdvanceModal
        isOpen={refundAdvanceOpen}
        onClose={() => {
          if (!refundAdvanceBusy) setRefundAdvanceOpen(false);
        }}
        advanceBalanceNgn={advanceBalNgn}
        amount={refundAdvanceAmt}
        onAmountChange={setRefundAdvanceAmt}
        onSubmit={submitRefundAdvance}
        busy={refundAdvanceBusy}
        formatNgn={formatNgn}
      />
    </PageShell>
  );
};

export default CustomerDashboard;
