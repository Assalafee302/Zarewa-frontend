import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Truck,
  Anchor,
  DollarSign,
  X,
  ChevronDown,
  Banknote,
  AlertTriangle,
  Award,
  Ruler,
  Package,
  Pencil,
  Trash2,
  Info,
  Building2,
  Users,
  Paperclip,
  RotateCcw,
} from 'lucide-react';

import { MainPanel, PageHeader, PageShell, PageTabs, ModalFrame } from '../components/layout';
import { AiAskButton } from '../components/AiAskButton';
import { ZareHelpButton } from '../components/ZareHelpButton';
import PurchaseOrderModal from '../components/procurement/PurchaseOrderModal';
import { purchaseOrderToUnifiedDraft } from '../lib/purchaseOrderDraft';
import CoilPurchaseOrderModal from '../components/procurement/CoilPurchaseOrderModal';
import StonePurchaseOrderModal from '../components/procurement/StonePurchaseOrderModal';
import AccessoryPurchaseOrderModal from '../components/procurement/AccessoryPurchaseOrderModal';
import { MaterialPricingWorkbookModal } from '../components/procurement/MaterialPricingWorkbookModal';
import { StockRegisterMonthEndModal } from '../components/reports/StockRegisterMonthEndModal';
import { formatNgn } from '../Data/mockData';
import { useToast } from '../context/ToastContext';
import { useInventory } from '../context/InventoryContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useWorkspaceDomain } from '../hooks/useWorkspaceDomain';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { apiFetch, apiUrl } from '../lib/apiBase';
import { appConfirm } from '../lib/appConfirm';
import { purchaseOrderOrderedValueNgn } from '../lib/liveAnalytics';
import { procurementKindFromPo } from '../lib/procurementPoKind';
import { buildTransitDisplayRows, shouldShowPoInTransit } from '../lib/inTransitVisibility.js';
import { EditSecondApprovalInline } from '../components/EditSecondApprovalInline';
import {
  ProcurementPayablePreviewSlideOver,
  ProcurementPoPreviewSlideOver,
} from '../components/procurement/ProcurementPreviewSlideOvers';
import { sortPurchaseOrdersList } from '../lib/procurementPoListSorting';

import {
  purchaseOrderCanAssignTransport,
} from '../lib/purchaseOrderWorkflow';
import { defaultTransportAgentProfile, mergeTransportAgentProfile } from '../lib/transportAgentIntel';
import { sortAccountsPayableList } from '../lib/procurementPayablesSorting';
import { useAppTablePaging } from '../lib/appDataTable';

import {
  defaultSupplierExtendedForm,
  extendedFormFromSupplier,
  padBankAccounts,
  padContacts,
  readFileAsBase64Data,
  SUPPLIER_BANK_ROW_TEMPLATE,
  SUPPLIER_CONTACT_ROW_TEMPLATE,
} from '../lib/supplierProfileForm';
import { treasuryAccountDisplayName, treasuryAccountsForWorkspace } from '../lib/treasuryAccountsStore';
import { createRequestPayLine, mapTreasuryPayoutLinesForApi } from '../lib/accountCore';
import {
  findTreasuryPayoutShortAccount,
  treasuryBookBalanceByAccountId,
  treasuryBookDisplayNgn,
} from '../lib/financeDeskTreasury';

import { TAB_LABELS, STANDARD_COIL_GAUGES_MM, PROCUREMENT_COIL_MATERIALS, procurementCoilMaterialByKey, kgPerMFromStripDensity } from './procurement/procurementTabShared.js';
import { ProcurementPageContext } from './procurement/ProcurementPageContext.jsx';
import { ProcurementTabPanels } from './procurement/ProcurementTabPanels.jsx';

/** Rows per column for Coil / Stone-coated / Accessories lists on Purchases. */
const PROCUREMENT_PURCHASES_COLUMN_PAGE_SIZE = 10;
const PAYABLES_TABLE_PAGE_SIZE = 10;

/** Kg coil SKUs below this on-hand level count as low stock on the Procurement KPI row. */
const APPROVED_PURCHASE_WINDOWS = [
  { id: '1m', label: '1 month', months: 1 },
  { id: '4m', label: '4 months', months: 4 },
  { id: '6m', label: '6 months', months: 6 },
  { id: '12m', label: '1 year', months: 12 },
];

const normalizeNairaInput = (value) => String(value ?? '').replace(/[^\d]/g, '');
const formatNairaInput = (value) => {
  const normalized = normalizeNairaInput(value);
  if (!normalized) return '';
  return Number(normalized).toLocaleString('en-NG');
};

const Procurement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  useWorkspaceDomain('procurement');
  const {
    purchaseOrders,
    inTransitLoads,
    coilLots,
    movements,
    products: invProducts,
    createPurchaseOrder,
    updatePurchaseOrder,
    setPurchaseOrderStatus,
    linkTransportToPurchaseOrder,
  } = useInventory();
  const canRecordSupplierPayment = Boolean(ws?.hasPermission?.('finance.pay'));
  const currentActorLabel = ws?.session?.user?.displayName ?? 'Accounts';
  const canAccessPriceList =
    (ws?.hasPermission?.('pricing.manage') || ws?.hasPermission?.('md.price_exception.approve')) ?? false;
  const [activeTab, setActiveTab] = useState('purchases');
  const [agents, setAgents] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [payablesOpenSearchQuery, setPayablesOpenSearchQuery] = useState('');
  const [payablesSettledSearchQuery, setPayablesSettledSearchQuery] = useState('');
  const [payablesOpenSort, setPayablesOpenSort] = useState({ field: 'due', dir: 'desc' });
  const [payablesSettledSort, setPayablesSettledSort] = useState({ field: 'due', dir: 'desc' });
  const [previewPo, setPreviewPo] = useState(null);
  const [previewAp, setPreviewAp] = useState(null);
  const [poListSort, setPoListSort] = useState({ field: 'date', dir: 'desc' });
  const [approvedPurchaseWindow, setApprovedPurchaseWindow] = useState('1m');

   
  useEffect(() => {
    if (!ws?.hasWorkspaceData || !ws?.snapshot) {
      setAgents([]);
      setSuppliers([]);
      return;
    }
    const s = ws.snapshot;
    setAgents(Array.isArray(s.transportAgents) ? s.transportAgents.map((a) => ({ ...a })) : []);
    setSuppliers(Array.isArray(s.suppliers) ? s.suppliers.map((x) => ({ ...x })) : []);
  }, [ws?.refreshEpoch, ws?.hasWorkspaceData, ws?.snapshot]);
   

  const [showMaterialPricingWorkbook, setShowMaterialPricingWorkbook] = useState(false);
  const [monthEndStockProcOpen, setMonthEndStockProcOpen] = useState(false);
  const [stockRegisterProcInbox, setStockRegisterProcInbox] = useState([]);
  const procBranchId = ws.viewAllBranches ? '' : ws.branchScope || ws.session?.currentBranchId || '';
  const procBranchLabel = useMemo(() => {
    if (!procBranchId) return '';
    return (
      (ws.snapshot?.branches || []).find((b) => String(b.id || b.branchId) === String(procBranchId))?.name ||
      procBranchId
    );
  }, [procBranchId, ws.snapshot?.branches]);

  useEffect(() => {
    if (!procBranchId) {
      setStockRegisterProcInbox([]);
      return;
    }
    void (async () => {
      const { ok, data } = await apiFetch('/api/stock-register/inbox?queue=procurement');
      if (ok && data?.ok) setStockRegisterProcInbox(data.items || []);
    })();
  }, [procBranchId, ws?.refreshEpoch]);
  const [showUnifiedPoModal, setShowUnifiedPoModal] = useState(false);
  const [unifiedPoEditDraft, setUnifiedPoEditDraft] = useState(null);
  const [showCoilPoModal, setShowCoilPoModal] = useState(false);
  const [coilPoEditDraft, setCoilPoEditDraft] = useState(null);
  const [showStonePoModal, setShowStonePoModal] = useState(false);
  const [stonePoEditDraft, setStonePoEditDraft] = useState(null);
  const [showAccessoryPoModal, setShowAccessoryPoModal] = useState(false);
  const [accessoryPoEditDraft, setAccessoryPoEditDraft] = useState(null);
  /** Single-use token for PATCH on a PO (server consumes per request). */
  const [procurementPoEditApprovalId, setProcurementPoEditApprovalId] = useState('');
  /** PO id for list-level second-approval strip (Approve / Reject / transport actions). */
  const [procurementPoForApprovalUi, setProcurementPoForApprovalUi] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showApPayModal, setShowApPayModal] = useState(false);
  const [selectedAp, setSelectedAp] = useState(null);
  const [apPayLines, setApPayLines] = useState(() => [createRequestPayLine('')]);
  const [apPayBusy, setApPayBusy] = useState(false);

  const [supplierForm, setSupplierForm] = useState(() => ({
    name: '',
    city: '',
    paymentTerms: 'Credit',
    qualityScore: '80',
    notes: '',
    ...defaultSupplierExtendedForm(),
  }));
  const [supplierPendingFiles, setSupplierPendingFiles] = useState([]);
  const [agentForm, setAgentForm] = useState(() => ({
    name: '',
    phone: '',
    region: '',
    ...defaultTransportAgentProfile(),
  }));
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [supplierEditApprovalId, setSupplierEditApprovalId] = useState('');
  const [editingAgentId, setEditingAgentId] = useState(null);
  const [agentEditApprovalId, setAgentEditApprovalId] = useState('');
  const [transportForm, setTransportForm] = useState({
    poID: '',
    agentId: '',
    transportReference: '',
    transportNote: '',
    transportFinanceAdvice: '',
    transportAmountNgn: '',
    transportAdvanceNgn: '',
  });
  /** Inline Conversion tab: standard kg/m by material (coil product) + gauge */
  const [standardConversionForm, setStandardConversionForm] = useState({
    materialKey: 'alu',
    gauge: STANDARD_COIL_GAUGES_MM.includes('0.24') ? '0.24' : STANDARD_COIL_GAUGES_MM[0] || '',
    color: PROCUREMENT_COIL_MATERIALS[0].defaultCatalogLabel,
    conversionKgPerM: '',
    label: '',
  });
  const [standardConversionSaving, setStandardConversionSaving] = useState(false);

   
  useEffect(() => {
    const t = location.state?.focusTab;
    if (!t || !TAB_LABELS[t]) return;
    setActiveTab(t);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  const outstandingSupplierNgn = useMemo(
    () =>
      purchaseOrders.reduce((s, p) => {
        if (p.status === 'Rejected') return s;
        const tot = purchaseOrderOrderedValueNgn(p);
        const paid = Number(p.supplierPaidNgn) || 0;
        return s + Math.max(0, tot - paid);
      }, 0),
    [purchaseOrders]
  );

  const openCommitmentsNgn = useMemo(
    () =>
      purchaseOrders
        .filter((p) => !['Received', 'Rejected'].includes(p.status))
        .reduce((s, p) => s + purchaseOrderOrderedValueNgn(p), 0),
    [purchaseOrders]
  );

  const transitLoadingCount = useMemo(
    () => purchaseOrders.filter((p) => shouldShowPoInTransit(p)).length,
    [purchaseOrders]
  );

  const bestSupplier = useMemo(() => {
    const byId = {};
    for (const p of purchaseOrders) {
      byId[p.supplierID] = (byId[p.supplierID] || 0) + purchaseOrderOrderedValueNgn(p);
    }
    let top = null;
    for (const s of suppliers) {
      const vol = byId[s.supplierID] || 0;
      const score = (s.qualityScore || 70) * Math.log10(10 + vol / 1e6);
      if (!top || score > top.score) top = { s, score, vol };
    }
    return top;
  }, [purchaseOrders, suppliers]);

  const approvedAndPaidTotalNgn = useMemo(() => {
    const win = APPROVED_PURCHASE_WINDOWS.find((w) => w.id === approvedPurchaseWindow) ?? APPROVED_PURCHASE_WINDOWS[0];
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - win.months);
    start.setHours(0, 0, 0, 0);

    return purchaseOrders.reduce((sum, po) => {
      const rawDate = String(po?.orderDateISO || '').trim();
      if (!rawDate) return sum;
      const poDate = new Date(rawDate);
      if (Number.isNaN(poDate.getTime())) return sum;
      if (poDate < start) return sum;
      const approvedValue = String(po?.status || '') === 'Approved' ? purchaseOrderOrderedValueNgn(po) : 0;
      const paidValue = Math.max(0, Number(po?.supplierPaidNgn) || 0);
      return sum + approvedValue + paidValue;
    }, 0);
  }, [approvedPurchaseWindow, purchaseOrders]);



  const treasuryAccounts = useMemo(
    () =>
      ws?.hasWorkspaceData
        ? treasuryAccountsForWorkspace(ws?.snapshot, ws?.session, {
            branchScope: ws?.branchScope,
            viewAllBranches: ws?.viewAllBranches,
          })
        : [],
    [
      ws?.hasWorkspaceData,
      ws?.snapshot,
      ws?.session,
      ws?.branchScope,
      ws?.viewAllBranches,
    ]
  );

  const treasuryMovements = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.treasuryMovements)
        ? ws.snapshot.treasuryMovements
        : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.treasuryMovements]
  );

  const treasuryBookByAccountId = useMemo(
    () => treasuryBookBalanceByAccountId(treasuryAccounts, treasuryMovements),
    [treasuryAccounts, treasuryMovements]
  );

  const payables = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.accountsPayable)
        ? ws.snapshot.accountsPayable.map((x) => ({ ...x }))
        : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.accountsPayable]
  );

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const branchOptions = useMemo(() => {
    if (Array.isArray(ws?.snapshot?.workspaceBranches)) return ws.snapshot.workspaceBranches;
    if (Array.isArray(ws?.session?.branches)) return ws.session.branches;
    return [];
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);
  const branchNameById = useMemo(
    () =>
      Object.fromEntries(
        branchOptions.map((b) => [String(b.id || '').trim(), b.name || b.code || b.id || 'Unknown branch'])
      ),
    [branchOptions]
  );

  const payablesOpenSource = useMemo(
    () =>
      payables.filter((p) => (Number(p.paidNgn) || 0) < (Number(p.amountNgn) || 0)),
    [payables]
  );
  const payablesSettledSource = useMemo(
    () =>
      payables.filter((p) => (Number(p.paidNgn) || 0) >= (Number(p.amountNgn) || 0)),
    [payables]
  );

  const filteredOpenPayables = useMemo(() => {
    const qq = payablesOpenSearchQuery.trim().toLowerCase();
    if (!qq) return payablesOpenSource;
    return payablesOpenSource.filter((p) => {
      const blob = [p.apID, p.supplierName, p.poRef, p.invoiceRef].join(' ').toLowerCase();
      return blob.includes(qq);
    });
  }, [payablesOpenSource, payablesOpenSearchQuery]);

  const filteredSettledPayables = useMemo(() => {
    const qq = payablesSettledSearchQuery.trim().toLowerCase();
    if (!qq) return payablesSettledSource;
    return payablesSettledSource.filter((p) => {
      const blob = [p.apID, p.supplierName, p.poRef, p.invoiceRef].join(' ').toLowerCase();
      return blob.includes(qq);
    });
  }, [payablesSettledSource, payablesSettledSearchQuery]);

  const sortedOpenPayables = useMemo(
    () => sortAccountsPayableList(filteredOpenPayables, payablesOpenSort.field, payablesOpenSort.dir),
    [filteredOpenPayables, payablesOpenSort]
  );
  const sortedSettledPayables = useMemo(
    () => sortAccountsPayableList(filteredSettledPayables, payablesSettledSort.field, payablesSettledSort.dir),
    [filteredSettledPayables, payablesSettledSort]
  );

  const openPayablesPage = useAppTablePaging(
    sortedOpenPayables,
    PAYABLES_TABLE_PAGE_SIZE,
    payablesOpenSort.field,
    payablesOpenSort.dir,
    payablesOpenSearchQuery
  );
  const settledPayablesPage = useAppTablePaging(
    sortedSettledPayables,
    PAYABLES_TABLE_PAGE_SIZE,
    payablesSettledSort.field,
    payablesSettledSort.dir,
    payablesSettledSearchQuery
  );

  const payablesOutstandingNgn = useMemo(
    () => payables.reduce((s, r) => s + Math.max(0, r.amountNgn - (r.paidNgn || 0)), 0),
    [payables]
  );

  const openSupplierModal = () => {
    setEditingSupplierId(null);
    setSupplierPendingFiles([]);
    setSupplierForm({
      name: '',
      city: '',
      paymentTerms: 'Credit',
      qualityScore: '80',
      notes: '',
      ...defaultSupplierExtendedForm(),
    });
    setShowSupplierModal(true);
  };

  const openEditSupplier = (s) => {
    setEditingSupplierId(s.supplierID);
    setSupplierEditApprovalId('');
    setSupplierPendingFiles([]);
    setSupplierForm({
      name: s.name || '',
      city: s.city && s.city !== '—' ? s.city : '',
      paymentTerms: s.paymentTerms || 'Credit',
      qualityScore: String(s.qualityScore ?? 80),
      notes: s.notes || '',
      ...extendedFormFromSupplier(s),
    });
    setShowSupplierModal(true);
  };

  const openAgentModal = () => {
    setEditingAgentId(null);
    setAgentEditApprovalId('');
    setAgentForm({
      name: '',
      phone: '',
      region: '',
      ...defaultTransportAgentProfile(),
    });
    setShowAgentModal(true);
  };

  const openEditAgent = (a) => {
    setEditingAgentId(a.id);
    setAgentEditApprovalId('');
    const pr = mergeTransportAgentProfile(a.profile);
    setAgentForm({
      name: a.name || '',
      phone: a.phone && a.phone !== '—' ? a.phone : '',
      region: a.region && a.region !== '—' ? a.region : '',
      ...pr,
    });
    setShowAgentModal(true);
  };

  const openPrimaryAction = () => {
    if (activeTab === 'purchases') {
      if (ws?.blocksBranchScopedCreate) {
        showToast(ws.branchScopedCreateMessage, { variant: 'error', duration: 12_000 });
        return;
      }
      setUnifiedPoEditDraft(null);
      setShowUnifiedPoModal(true);
    } else if (activeTab === 'suppliers') openSupplierModal();
  };

  const newButtonLabel =
    activeTab === 'purchases' ? null : activeTab === 'suppliers' ? 'New supplier' : null;

  const canManagePo = Boolean(ws?.hasPermission?.('purchase_orders.manage'));

  const poTransportAwaitingTreasuryRows = useMemo(
    () =>
      Array.isArray(ws?.snapshot?.poTransportAwaitingTreasury)
        ? ws.snapshot.poTransportAwaitingTreasury
        : [],
    [ws?.snapshot?.poTransportAwaitingTreasury]
  );

  const poTransportMissingLinkRows = useMemo(
    () =>
      Array.isArray(ws?.snapshot?.poTransportMissingLink) ? ws.snapshot.poTransportMissingLink : [],
    [ws?.snapshot?.poTransportMissingLink]
  );

  const poTransportCatchUpRows = useMemo(
    () => (Array.isArray(ws?.snapshot?.poTransportCatchUp) ? ws.snapshot.poTransportCatchUp : []),
    [ws?.snapshot?.poTransportCatchUp]
  );

  const orphanHaulageRows = useMemo(
    () =>
      Array.isArray(ws?.snapshot?.orphanHaulageTreasuryMovements)
        ? ws.snapshot.orphanHaulageTreasuryMovements
        : [],
    [ws?.snapshot?.orphanHaulageTreasuryMovements]
  );

  const transportCatchUpCount = poTransportCatchUpRows.length + orphanHaulageRows.length;

  const procurementTabs = useMemo(() => {
    return [
      { id: 'purchases', icon: <DollarSign size={16} />, label: 'Purchases' },
      { id: 'payables', icon: <Banknote size={16} />, label: 'Payments' },
      {
        id: 'transport',
        icon: <Truck size={16} />,
        label: transportCatchUpCount > 0 ? `Transport (${transportCatchUpCount})` : 'Transport catch-up',
      },
      { id: 'suppliers', icon: <Anchor size={16} />, label: 'Suppliers' },
      { id: 'conversion', icon: <Ruler size={16} />, label: 'Conversion' },
    ];
  }, [transportCatchUpCount]);

  const poTransportMissingLinkIds = useMemo(
    () => new Set(poTransportMissingLinkRows.map((row) => row.poID)),
    [poTransportMissingLinkRows]
  );

  const [poTransportFilter, setPoTransportFilter] = useState('all');

  const openPoPreviewById = (poID) => {
    const fullPo = purchaseOrders.find((po) => po.poID === poID);
    if (fullPo) {
      setPreviewPo(fullPo);
      setPreviewAp(null);
    }
  };

  const openPoTransportLink = (poID) => {
    const p = purchaseOrders.find((row) => row.poID === poID);
    if (!p) return;
    setPreviewPo(null);
    setPreviewAp(null);
    setProcurementPoForApprovalUi(p.poID);
    setTransportForm({
      poID: p.poID,
      agentId: p.transportAgentId || '',
      transportReference: p.transportReference || '',
      transportNote: p.transportNote || '',
      transportFinanceAdvice: p.transportFinanceAdvice || '',
      transportAmountNgn: p.transportAmountNgn > 0 ? String(p.transportAmountNgn) : '',
      transportAdvanceNgn: Number(p.transportAdvanceNgn) > 0 ? String(p.transportAdvanceNgn) : '',
    });
    setShowTransportModal(true);
  };

  const saveStandardConversion = async (e) => {
    e.preventDefault();
    const matOpt = procurementCoilMaterialByKey(standardConversionForm.materialKey);
    const colorFallback = matOpt.defaultCatalogLabel;
    const color = standardConversionForm.color.trim() || colorFallback;
    const gauge = standardConversionForm.gauge.trim();
    const gaugeMm = parseFloat(gauge, 10);
    const override = Number(standardConversionForm.conversionKgPerM);
    let conversion = null;
    if (Number.isFinite(override) && override > 0) {
      conversion = override;
    } else {
      conversion = kgPerMFromStripDensity(standardConversionForm.materialKey, gaugeMm);
    }
    if (!matOpt.productID || !gauge || conversion == null || !Number.isFinite(conversion) || conversion <= 0) {
      showToast('Select material and gauge, or enter a valid kg/m override.', { variant: 'error' });
      return false;
    }
    const payload = {
      color,
      gauge,
      productID: matOpt.productID,
      offerKg: 0,
      offerMeters: 0,
      conversionKgPerM: Number(conversion.toFixed(2)),
      label:
        standardConversionForm.label.trim() ||
        `Standard (density) · ${matOpt.label} · ${gauge} mm`,
    };
    if (!ws?.canMutate) {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to save — workspace is read-only.'
          : 'Connect to the API to save standard conversion.',
        { variant: 'info' }
      );
      return false;
    }
    setStandardConversionSaving(true);
    try {
      const { ok, data } = await apiFetch('/api/setup/procurementCatalog', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not save standard conversion.', { variant: 'error' });
        return false;
      }
      await ws.refresh();
      const opt = procurementCoilMaterialByKey(standardConversionForm.materialKey);
      setStandardConversionForm((f) => ({
        ...f,
        conversionKgPerM: '',
        label: '',
        color: opt.defaultCatalogLabel,
      }));
      showToast('Standard conversion saved.');
      return true;
    } finally {
      setStandardConversionSaving(false);
    }
  };

  const stdGaugeMm = parseFloat(standardConversionForm.gauge, 10);
  const stdOverrideKgPerM = Number(standardConversionForm.conversionKgPerM);
  const standardPhysicsKgPerM = kgPerMFromStripDensity(standardConversionForm.materialKey, stdGaugeMm);
  const standardEffectiveKgPerM =
    Number.isFinite(stdOverrideKgPerM) && stdOverrideKgPerM > 0
      ? stdOverrideKgPerM
      : standardPhysicsKgPerM;

  const saveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      showToast('Enter supplier name.', { variant: 'error' });
      return;
    }
    for (const f of supplierPendingFiles) {
      if (f.file.size > 720_000) {
        showToast(`File "${f.file.name}" is too large (max ~700 KB per agreement).`, { variant: 'error' });
        return;
      }
    }
    const city = supplierForm.city.trim() || '—';
    const qScore = Number(supplierForm.qualityScore) || 80;
    const notes = supplierForm.notes.trim() || 'Added from procurement.';
    const wasEditSupplier = Boolean(editingSupplierId);

    const banks = padBankAccounts(supplierForm.bankAccounts, 2, 6).filter(
      (b) => String(b.bankName || '').trim() || String(b.accountNumber || '').trim() || String(b.accountName || '').trim()
    );
    const contacts = padContacts(supplierForm.contacts, 3, 6).filter(
      (c) => String(c.name || '').trim() || String(c.email || '').trim() || String(c.phone || '').trim()
    );
    const removed = new Set(supplierForm.removedAgreementIds || []);
    const keptMeta = (supplierForm.agreementMeta || []).filter((a) => a?.id && !removed.has(a.id));
    const keptAgreements = keptMeta.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType || 'application/octet-stream',
      uploadedAtIso: a.uploadedAtIso || new Date().toISOString(),
    }));
    const newAgreements = [];
    for (const row of supplierPendingFiles) {
      try {
        const dataBase64 = await readFileAsBase64Data(row.file);
        newAgreements.push({
          id: row.id,
          fileName: row.file.name,
          mimeType: row.file.type || 'application/octet-stream',
          uploadedAtIso: new Date().toISOString(),
          dataBase64,
        });
      } catch {
        showToast(`Could not read file "${row.file.name}".`, { variant: 'error' });
        return;
      }
    }

    const supplierProfile = {
      companyEmail: supplierForm.companyEmail.trim(),
      website: supplierForm.website.trim(),
      vatTin: supplierForm.vatTin.trim(),
      rcNumber: supplierForm.rcNumber.trim(),
      registeredAddress: supplierForm.registeredAddress.trim(),
      billingAddress: supplierForm.billingAddress.trim(),
      phoneMain: supplierForm.phoneMain.trim(),
      whatsapp: supplierForm.whatsapp.trim(),
      notesCommercial: supplierForm.notesCommercial.trim(),
      bankAccounts: banks,
      contacts,
      agreements: [...keptAgreements, ...newAgreements],
    };

    if (ws?.canMutate) {
      if (editingSupplierId) {
        const patch = {
          name: supplierForm.name.trim(),
          city,
          paymentTerms: supplierForm.paymentTerms,
          qualityScore: qScore,
          notes,
          supplierProfile,
        };
        if (String(supplierEditApprovalId || '').trim()) {
          patch.editApprovalId = String(supplierEditApprovalId).trim();
        }
        const { ok, data } = await apiFetch(
          `/api/suppliers/${encodeURIComponent(editingSupplierId)}`,
          {
            method: 'PATCH',
            body: JSON.stringify(patch),
          }
        );
        if (!ok || !data?.ok) {
          const dupId = data?.existingSupplierId;
          showToast(
            data?.code === 'DUPLICATE_SUPPLIER_REGISTRATION' && dupId
              ? `${data.error || 'Duplicate supplier.'} Use ${dupId} instead.`
              : data?.error || 'Could not update supplier.',
            { variant: 'error' }
          );
          return;
        }
      } else {
        const { ok, data } = await apiFetch('/api/suppliers', {
          method: 'POST',
          body: JSON.stringify({
            name: supplierForm.name.trim(),
            city,
            paymentTerms: supplierForm.paymentTerms,
            qualityScore: qScore,
            notes,
            supplierProfile,
          }),
        });
        if (!ok || !data?.ok) {
          const dupId = data?.existingSupplierId;
          showToast(
            data?.code === 'DUPLICATE_SUPPLIER_REGISTRATION' && dupId
              ? `${data.error || 'Duplicate supplier.'} Use ${dupId} instead.`
              : data?.error || 'Could not create supplier.',
            { variant: 'error' }
          );
          return;
        }
      }
      await ws.refresh();
    } else {
      showToast('Reconnect to save suppliers — read-only workspace.', { variant: 'info' });
      return;
    }

    setSupplierForm({
      name: '',
      city: '',
      paymentTerms: 'Credit',
      qualityScore: '80',
      notes: '',
      ...defaultSupplierExtendedForm(),
    });
    setSupplierPendingFiles([]);
    setEditingSupplierId(null);
    setSupplierEditApprovalId('');
    setShowSupplierModal(false);
    showToast(wasEditSupplier ? 'Supplier updated.' : 'Supplier saved.');
  };

  const removeSupplier = async (s) => {
    if (!(await appConfirm({ message: `Delete supplier “${s.name}”? This cannot be undone.`, variant: 'danger' }))) return;
    if (ws?.canMutate) {
      const { ok, data } = await apiFetch(`/api/suppliers/${encodeURIComponent(s.supplierID)}`, {
        method: 'DELETE',
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not delete supplier.', { variant: 'error' });
        return;
      }
      await ws.refresh();
    } else {
      showToast('Reconnect to delete suppliers — read-only workspace.', { variant: 'info' });
      return;
    }
    showToast('Supplier removed.');
  };

  const saveAgent = async (e) => {
    e.preventDefault();
    if (!agentForm.name.trim()) {
      showToast('Enter agent name.', { variant: 'error' });
      return;
    }
    const phone = agentForm.phone.trim() || '—';
    const region = agentForm.region.trim() || '—';
    const wasEditAgent = Boolean(editingAgentId);
    const profile = {
      vehicleType: String(agentForm.vehicleType ?? '').trim(),
      vehicleReg: String(agentForm.vehicleReg ?? '').trim(),
      typicalRoutes: String(agentForm.typicalRoutes ?? '').trim(),
      paymentPreference: String(agentForm.paymentPreference ?? '').trim(),
      reliabilityNotes: String(agentForm.reliabilityNotes ?? '').trim(),
      emergencyContact: String(agentForm.emergencyContact ?? '').trim(),
    };

    if (ws?.canMutate) {
      if (editingAgentId) {
        const patch = {
          name: agentForm.name.trim(),
          phone,
          region,
          profile,
        };
        if (String(agentEditApprovalId || '').trim()) {
          patch.editApprovalId = String(agentEditApprovalId).trim();
        }
        const { ok, data } = await apiFetch(
          `/api/transport-agents/${encodeURIComponent(editingAgentId)}`,
          {
            method: 'PATCH',
            body: JSON.stringify(patch),
          }
        );
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not update agent.', { variant: 'error' });
          return;
        }
      } else {
        const { ok, data } = await apiFetch('/api/transport-agents', {
          method: 'POST',
          body: JSON.stringify({
            name: agentForm.name.trim(),
            phone,
            region,
            profile,
          }),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not create agent.', { variant: 'error' });
          return;
        }
      }
      await ws.refresh();
    } else {
      showToast('Reconnect to save transport agents — read-only workspace.', { variant: 'info' });
      return;
    }

    setAgentForm({
      name: '',
      phone: '',
      region: '',
      ...defaultTransportAgentProfile(),
    });
    setEditingAgentId(null);
    setAgentEditApprovalId('');
    setShowAgentModal(false);
    showToast(wasEditAgent ? 'Agent updated.' : 'Agent registered.');
  };

  const removeAgent = async (a) => {
    if (!(await appConfirm({ message: `Delete transport agent “${a.name}”?`, variant: 'danger' }))) return;
    if (ws?.canMutate) {
      const { ok, data } = await apiFetch(`/api/transport-agents/${encodeURIComponent(a.id)}`, {
        method: 'DELETE',
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not delete agent.', { variant: 'error' });
        return;
      }
      await ws.refresh();
    } else {
      showToast('Reconnect to delete transport agents — read-only workspace.', { variant: 'info' });
      return;
    }
    showToast('Agent removed.');
  };

  const filteredPOs = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    let rows = purchaseOrders;
    if (poTransportFilter === 'needs_transport') {
      rows = rows.filter((p) => poTransportMissingLinkIds.has(p.poID));
    }
    if (!q) return rows;
    return rows.filter((p) => {
      const lineProductIds = Array.isArray(p?.lines)
        ? p.lines.map((l) => String(l?.productID || '')).filter(Boolean)
        : [];
      const blob = [p?.poID, p?.supplierName, p?.status, ...lineProductIds].join(' ');
      return blob.toLowerCase().includes(q);
    });
  }, [purchaseOrders, debouncedSearchQuery, poTransportFilter, poTransportMissingLinkIds]);

  const coilPOsFiltered = useMemo(
    () => filteredPOs.filter((p) => procurementKindFromPo(p) === 'coil'),
    [filteredPOs]
  );
  const stonePOsFiltered = useMemo(
    () => filteredPOs.filter((p) => procurementKindFromPo(p) === 'stone'),
    [filteredPOs]
  );
  const accessoryPOsFiltered = useMemo(
    () => filteredPOs.filter((p) => procurementKindFromPo(p) === 'accessory'),
    [filteredPOs]
  );
  const mixedPOsFiltered = useMemo(
    () => filteredPOs.filter((p) => procurementKindFromPo(p) === 'mixed'),
    [filteredPOs]
  );

  const coilPOsSorted = useMemo(
    () => sortPurchaseOrdersList(coilPOsFiltered, poListSort.field, poListSort.dir),
    [coilPOsFiltered, poListSort]
  );
  const stonePOsSorted = useMemo(
    () => sortPurchaseOrdersList(stonePOsFiltered, poListSort.field, poListSort.dir),
    [stonePOsFiltered, poListSort]
  );
  const accessoryPOsSorted = useMemo(
    () => sortPurchaseOrdersList(accessoryPOsFiltered, poListSort.field, poListSort.dir),
    [accessoryPOsFiltered, poListSort]
  );
  const mixedPOsSorted = useMemo(
    () => sortPurchaseOrdersList(mixedPOsFiltered, poListSort.field, poListSort.dir),
    [mixedPOsFiltered, poListSort]
  );

  const coilPoPurchasesPage = useAppTablePaging(
    coilPOsSorted,
    PROCUREMENT_PURCHASES_COLUMN_PAGE_SIZE,
    poListSort.field,
    poListSort.dir,
    debouncedSearchQuery
  );
  const stonePoPurchasesPage = useAppTablePaging(
    stonePOsSorted,
    PROCUREMENT_PURCHASES_COLUMN_PAGE_SIZE,
    poListSort.field,
    poListSort.dir,
    debouncedSearchQuery
  );
  const accessoryPoPurchasesPage = useAppTablePaging(
    accessoryPOsSorted,
    PROCUREMENT_PURCHASES_COLUMN_PAGE_SIZE,
    poListSort.field,
    poListSort.dir,
    debouncedSearchQuery
  );
  const mixedPoPurchasesPage = useAppTablePaging(
    mixedPOsSorted,
    PROCUREMENT_PURCHASES_COLUMN_PAGE_SIZE,
    poListSort.field,
    poListSort.dir,
    debouncedSearchQuery
  );

  const filteredSuppliers = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => {
      const p = s.supplierProfile || {};
      const contactTokens = Array.isArray(p.contacts)
        ? p.contacts
            .filter((c) => c && typeof c === 'object')
            .map((c) => [c.name, c.email, c.phone].join(' '))
        : [];
      const blob = [
        s.supplierID,
        s.name,
        s.city,
        p.companyEmail,
        p.phoneMain,
        p.vatTin,
        p.rcNumber,
        ...contactTokens,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [suppliers, debouncedSearchQuery]);

  const openPoEditor = (p) => {
    setProcurementPoForApprovalUi(p.poID);
    setUnifiedPoEditDraft(purchaseOrderToUnifiedDraft(p, invProducts));
    setShowUnifiedPoModal(true);
  };

  const submitUnifiedPo = async (payload) => {
    if (payload.poID) {
      const { poID, ...rest } = payload;
      const res = await updatePurchaseOrder({
        poID,
        ...rest,
        editApprovalId: procurementPoEditApprovalId || undefined,
      });
      if (!res.ok) {
        showToast(res.error || 'Could not update PO', { variant: 'error' });
        return false;
      }
      setProcurementPoEditApprovalId('');
      showToast(`${poID} updated.`);
      return true;
    }
    const res = await createPurchaseOrder({ ...payload, status: 'Pending' });
    if (!res.ok) {
      showToast(res.error || 'Could not save PO', { variant: 'error' });
      return false;
    }
    showToast(`${res.poID} created — approve, then assign transport.`);
    return true;
  };

  const apPayTotalNgn = useMemo(
    () => apPayLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [apPayLines]
  );

  const updateApPayLine = (lineId, patch) => {
    setApPayLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const addApPayLine = () => {
    setApPayLines((prev) => [...prev, createRequestPayLine(treasuryAccounts[0]?.id ?? '')]);
  };

  const removeApPayLine = (lineId) => {
    setApPayLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== lineId)));
  };

  const resetApPaymentModal = () => {
    setShowApPayModal(false);
    setSelectedAp(null);
    setApPayLines([createRequestPayLine(treasuryAccounts[0]?.id ?? '')]);
    setApPayBusy(false);
  };

  const openApPaymentModal = (ap) => {
    const outstanding = Math.max(0, (Number(ap?.amountNgn) || 0) - (Number(ap?.paidNgn) || 0));
    setSelectedAp(ap);
    setApPayLines([createRequestPayLine(treasuryAccounts[0]?.id ?? '', outstanding)]);
    setShowApPayModal(true);
  };

  const saveApPayment = async (e) => {
    e.preventDefault();
    if (!selectedAp || apPayBusy) return;
    const invoiceRef = selectedAp.invoiceRef || selectedAp.poRef || selectedAp.apID;
    const paidBy = currentActorLabel;
    const remaining = Math.max(0, (Number(selectedAp.amountNgn) || 0) - (Number(selectedAp.paidNgn) || 0));
    const validLines = mapTreasuryPayoutLinesForApi(apPayLines);
    if (validLines.length === 0) {
      showToast('Add at least one payout line.', { variant: 'error' });
      return;
    }
    if (apPayTotalNgn <= 0) {
      showToast('Payout total must be positive.', { variant: 'error' });
      return;
    }
    if (remaining <= 0) {
      showToast('This payable is already fully paid in records.', { variant: 'info' });
      return;
    }
    if (apPayTotalNgn > remaining) {
      showToast('Payout total exceeds outstanding payable balance.', { variant: 'error' });
      return;
    }
    const shortAccount = findTreasuryPayoutShortAccount(
      validLines,
      treasuryAccounts,
      treasuryBookByAccountId
    );
    if (shortAccount) {
      showToast(`Insufficient balance in ${shortAccount.name}.`, { variant: 'error' });
      return;
    }
    const method = 'Bank Transfer';
    const newPaidTotal = (Number(selectedAp.paidNgn) || 0) + apPayTotalNgn;
    const fullySettled = newPaidTotal >= (Number(selectedAp.amountNgn) || 0);
    const poRef = selectedAp.poRef?.trim?.() ?? '';
    const poForAdvance = poRef ? purchaseOrders.find((p) => p.poID === poRef) : null;
    const hasQuotedTransport =
      poForAdvance &&
      Boolean(String(poForAdvance.transportAgentId || poForAdvance.transportAgentName || '').trim()) &&
      Number(poForAdvance.transportAmountNgn) > 0;
    const shouldAdvancePo = Boolean(
      fullySettled && poForAdvance?.status === 'Approved' && hasQuotedTransport
    );
    let procurementNote = '';
    if (ws?.canMutate) {
      setApPayBusy(true);
      for (const line of validLines) {
        const pay = await apiFetch(`/api/accounts-payable/${encodeURIComponent(selectedAp.apID)}/pay`, {
          method: 'POST',
          body: JSON.stringify({
            amountNgn: line.amountNgn,
            paymentMethod: method,
            treasuryAccountId: line.treasuryAccountId,
            reference: line.reference || invoiceRef,
            note: '',
            dateISO: line.dateISO,
            paidAtISO: line.dateISO,
            paidBy,
            createdBy: paidBy,
          }),
        });
        if (!pay.ok || !pay.data?.ok) {
          showToast(pay.data?.error || 'Could not record supplier payment.', { variant: 'error' });
          setApPayBusy(false);
          return;
        }
      }
      if (shouldAdvancePo) {
        const st = await setPurchaseOrderStatus(poRef, 'In Transit');
        if (st.ok) procurementNote = ` ${poRef} → In Transit (await GRN in Operations).`;
      } else if (fullySettled && poForAdvance?.status === 'Approved' && !hasQuotedTransport) {
        procurementNote =
          ' Supplier fully paid — assign transport on the PO before marking in transit.';
      }
      await ws.refresh?.();
      setApPayBusy(false);
    } else {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to record supplier payments — workspace is read-only.'
          : 'Connect to the API to record supplier payments.',
        { variant: 'info' }
      );
      return;
    }
    resetApPaymentModal();
    showToast(`${formatNgn(apPayTotalNgn)} recorded against ${invoiceRef} (${method}).${procurementNote}`);
  };

  const isAnyModalOpen =
    showMaterialPricingWorkbook ||
    showUnifiedPoModal ||
    showCoilPoModal ||
    showStonePoModal ||
    showAccessoryPoModal ||
    showSupplierModal ||
    showAgentModal ||
    showTransportModal ||
    showApPayModal;

  const transitRowsForAside = useMemo(
    () => buildTransitDisplayRows({ purchaseOrders, inTransitLoads }),
    [inTransitLoads, purchaseOrders]
  );

  const wsCanMutate = ws?.canMutate;
  const wsCanAccessFinance = Boolean(ws?.canAccessModule?.('finance'));
  const wsCanFinancePay = Boolean(
    ws?.canAccessModule?.('finance') &&
      (ws?.hasPermission?.('finance.pay') || ws?.hasPermission?.('cashier.desk.view'))
  );
  const wsSessionUserRoleKey = ws?.session?.user?.roleKey;

  const pageContextValue = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      searchQuery,
      setSearchQuery,
      canRecordSupplierPayment,
      payablesOutstandingNgn,
      payablesOpenSearchQuery,
      setPayablesOpenSearchQuery,
      payablesSettledSearchQuery,
      setPayablesSettledSearchQuery,
      payablesOpenSort,
      setPayablesOpenSort,
      payablesSettledSort,
      setPayablesSettledSort,
      sortedOpenPayables,
      sortedSettledPayables,
      openPayablesPage,
      settledPayablesPage,
      todayIso,
      branchNameById,
      wsCanMutate,
      setPreviewAp,
      setPreviewPo,
      openApPaymentModal,
      poTransportMissingLinkRows,
      poTransportFilter,
      setPoTransportFilter,
      openPoTransportLink,
      poTransportAwaitingTreasuryRows,
      wsCanAccessFinance,
      wsCanFinancePay,
      wsSessionUserRoleKey,
      procurementPoForApprovalUi,
      procurementPoEditApprovalId,
      setProcurementPoEditApprovalId,
      poListSort,
      setPoListSort,
      coilPOsSorted,
      stonePOsSorted,
      accessoryPOsSorted,
      mixedPOsSorted,
      coilPoPurchasesPage,
      stonePoPurchasesPage,
      accessoryPoPurchasesPage,
      mixedPoPurchasesPage,
      poTransportMissingLinkIds,
      poTransportCatchUpRows,
      orphanHaulageRows,
      canManagePo,
      openPoPreviewById,
      agents,
      openEditAgent,
      removeAgent,
      openAgentModal,
      transitRowsForAside,
      purchaseOrders,
      filteredSuppliers,
      openEditSupplier,
      removeSupplier,
      canAccessPriceList,
      saveStandardConversion,
      standardConversionForm,
      setStandardConversionForm,
      standardConversionSaving,
      standardPhysicsKgPerM,
      standardEffectiveKgPerM,
      stdOverrideKgPerM,
      setShowMaterialPricingWorkbook,
    }),
    [
      activeTab,
      searchQuery,
      canRecordSupplierPayment,
      payablesOutstandingNgn,
      payablesOpenSearchQuery,
      payablesSettledSearchQuery,
      payablesOpenSort,
      payablesSettledSort,
      sortedOpenPayables,
      sortedSettledPayables,
      openPayablesPage,
      settledPayablesPage,
      todayIso,
      branchNameById,
      wsCanMutate,
      poTransportMissingLinkRows,
      poTransportFilter,
      openPoTransportLink,
      poTransportAwaitingTreasuryRows,
      wsCanAccessFinance,
      wsCanFinancePay,
      wsSessionUserRoleKey,
      procurementPoForApprovalUi,
      procurementPoEditApprovalId,
      poListSort,
      coilPOsSorted,
      stonePOsSorted,
      accessoryPOsSorted,
      mixedPOsSorted,
      coilPoPurchasesPage,
      stonePoPurchasesPage,
      accessoryPoPurchasesPage,
      mixedPoPurchasesPage,
      poTransportMissingLinkIds,
      poTransportCatchUpRows,
      orphanHaulageRows,
      canManagePo,
      openPoPreviewById,
      agents,
      openEditAgent,
      removeAgent,
      openAgentModal,
      transitRowsForAside,
      purchaseOrders,
      filteredSuppliers,
      openEditSupplier,
      removeSupplier,
      canAccessPriceList,
      saveStandardConversion,
      standardConversionForm,
      standardConversionSaving,
      standardPhysicsKgPerM,
      standardEffectiveKgPerM,
      stdOverrideKgPerM,
    ]
  );

  return (
    <ProcurementPageContext.Provider value={pageContextValue}>
    <PageShell blurred={isAnyModalOpen}>
      <PageHeader
        title="Purchases"
        tabs={<PageTabs tabs={procurementTabs} value={activeTab} onChange={setActiveTab} />}
        toolbar={
          (activeTab === 'purchases' && canManagePo) ||
          activeTab === 'payables' ||
          activeTab === 'conversion' ||
          newButtonLabel ? (
            <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
              {(activeTab === 'purchases' || activeTab === 'payables') && (
                <ZareHelpButton
                  compact
                  transactionContext={{
                    module: 'procurement',
                    currentPage: activeTab,
                    pathname: '/procurement',
                    transactionType: activeTab === 'payables' ? 'supplier_payment' : 'purchase_order',
                  }}
                />
              )}
              <AiAskButton
                mode="procurement"
                prompt={
                  activeTab === 'purchases'
                    ? 'Summarize purchase-order pressure, what is in transit, and what procurement should track next.'
                    : activeTab === 'payables'
                      ? 'Summarize open supplier payables, what is overdue, and what should be paid next.'
                      : activeTab === 'suppliers'
                        ? 'Summarize supplier records, transport agents, and where procurement may need action.'
                        : 'Explain the current conversion and material planning issues.'
                }
                pageContext={{
                  source: 'procurement-page',
                  activeTab,
                  searchQuery:
                    activeTab === 'payables'
                      ? `${payablesOpenSearchQuery} ${payablesSettledSearchQuery}`.trim()
                      : searchQuery,
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wider text-zarewa-teal shadow-sm hover:bg-teal-100/70 shrink-0"
              >
                Ask AI
              </AiAskButton>
              {activeTab === 'purchases' && canManagePo ? (
                <div className="w-full min-w-0 overflow-x-auto sm:w-auto sm:overflow-visible">
                  <div className="flex w-max gap-1 pb-1 sm:w-auto sm:flex-wrap sm:justify-end sm:pb-0">
                    <button
                      type="button"
                      onClick={openPrimaryAction}
                      disabled={ws?.blocksBranchScopedCreate}
                      title={ws?.blocksBranchScopedCreate ? ws.branchScopedCreateMessage : undefined}
                      className={`inline-flex items-center justify-center gap-1 rounded-lg bg-zarewa-teal text-white px-2.5 py-1.5 text-ui-xs font-semibold uppercase tracking-wider shadow-sm hover:brightness-105${ws?.blocksBranchScopedCreate ? ' opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Plus size={12} strokeWidth={2} /> New purchase order
                    </button>
                  </div>
                </div>
              ) : null}
              {newButtonLabel ? (
                <button
                  type="button"
                  onClick={openPrimaryAction}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-zarewa-teal text-white px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wider shadow-sm hover:brightness-105 shrink-0"
                >
                  <Plus size={14} strokeWidth={2} /> {newButtonLabel}
                </button>
              ) : null}
            </div>
          ) : null
        }
      />

      {procBranchId ? (
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/40 px-4 py-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-zarewa-teal">Month-end stock costing</p>
            <p className="text-xs text-slate-600 mt-1">
              {stockRegisterProcInbox.length
                ? `${stockRegisterProcInbox.length} register(s) ready for net kg pricing.`
                : 'No registers awaiting procurement costing.'}
            </p>
          </div>
          <button type="button" className="z-btn-primary shrink-0" onClick={() => setMonthEndStockProcOpen(true)}>
            Open stock costing
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:gap-6 min-w-0">
        <div className="col-span-full order-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                <Package size={12} /> Open commitments
              </p>
              <p className="mt-1 text-xl font-black text-zarewa-teal tabular-nums">{formatNgn(openCommitmentsNgn)}</p>
              <div className="mt-2 border-t border-slate-100 pt-2 space-y-1 text-ui-xs">
                <p className="flex items-center justify-between text-slate-600">
                  <span>On road / loading</span>
                  <span className="font-bold tabular-nums text-zarewa-teal">{transitLoadingCount} PO</span>
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                <Banknote size={12} /> Outstanding
              </p>
              <p className="mt-1 text-xl font-black text-zarewa-teal tabular-nums">
                {formatNgn(outstandingSupplierNgn)}
              </p>
              <p className="mt-2 text-ui-xs text-slate-500 border-t border-slate-100 pt-2">Open PO value less paid</p>
            </div>
            <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-teal-700 flex items-center gap-1">
                <Award size={12} /> Best supplier
              </p>
              <p className="mt-1 text-sm font-bold text-zarewa-teal leading-tight line-clamp-2">
                {bestSupplier?.s.name ?? '—'}
              </p>
              <p className="mt-2 text-ui-xs text-teal-800/90 border-t border-teal-100/80 pt-2">Quality × volume</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-ui-xs font-bold uppercase tracking-wide text-amber-700 flex items-center gap-1">
                  <DollarSign size={12} /> Approved + paid
                </p>
                <select
                  value={approvedPurchaseWindow}
                  onChange={(e) => setApprovedPurchaseWindow(e.target.value)}
                  className="rounded-md border border-amber-200 bg-white px-1.5 py-1 text-ui-xs font-semibold text-amber-900"
                  aria-label="Approved purchase total period"
                >
                  {APPROVED_PURCHASE_WINDOWS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-xl font-black text-amber-900 tabular-nums">{formatNgn(approvedAndPaidTotalNgn)}</p>
              <p className="mt-2 text-ui-xs text-amber-800/85 border-t border-amber-100 pt-2">
                Combined total for selected period: <span className="font-semibold">Approved PO value</span> plus{' '}
                <span className="font-semibold">supplier payments posted</span>.
              </p>
            </div>
          </div>
        </div>

        <ProcurementTabPanels />

      </div>


      <MaterialPricingWorkbookModal
        open={showMaterialPricingWorkbook}
        onClose={() => setShowMaterialPricingWorkbook(false)}
        initialMaterialKey="alu"
      />

      <StockRegisterMonthEndModal
        isOpen={monthEndStockProcOpen}
        onClose={() => setMonthEndStockProcOpen(false)}
        roleMode="procurement"
        branchId={procBranchId}
        branchLabel={procBranchLabel}
        showToast={showToast}
        roleKey={ws.session?.user?.roleKey}
      />

      <PurchaseOrderModal
        isOpen={showUnifiedPoModal}
        editDraft={unifiedPoEditDraft}
        onClose={() => {
          setShowUnifiedPoModal(false);
          setUnifiedPoEditDraft(null);
        }}
        suppliers={suppliers}
        masterData={ws?.snapshot?.masterData ?? null}
        products={invProducts}
        editApprovalSlot={
          unifiedPoEditDraft?.poID ? (
            <EditSecondApprovalInline
              entityKind="purchase_order"
              changeSummary="Edit purchase order lines, dates, or supplier details"
              entityId={unifiedPoEditDraft.poID}
              value={procurementPoEditApprovalId}
              onChange={setProcurementPoEditApprovalId}
            />
          ) : null
        }
        onQuickAddSupplier={() => {
          setShowUnifiedPoModal(false);
          setUnifiedPoEditDraft(null);
          openSupplierModal();
        }}
        onSubmit={submitUnifiedPo}
      />

      <CoilPurchaseOrderModal
        isOpen={false}
        editDraft={coilPoEditDraft}
        onClose={() => {
          setShowCoilPoModal(false);
          setCoilPoEditDraft(null);
        }}
        suppliers={suppliers}
        masterData={ws?.snapshot?.masterData ?? null}
        editApprovalSlot={
          coilPoEditDraft?.poID ? (
            <EditSecondApprovalInline
              entityKind="purchase_order"
              changeSummary="Edit purchase order lines, dates, or supplier details"
              entityId={coilPoEditDraft.poID}
              value={procurementPoEditApprovalId}
              onChange={setProcurementPoEditApprovalId}
            />
          ) : null
        }
        onQuickAddSupplier={() => {
          setShowCoilPoModal(false);
          setCoilPoEditDraft(null);
          openSupplierModal();
        }}
        onSubmit={async (payload) => {
          if (payload.poID) {
            const { poID, ...rest } = payload;
            const res = await updatePurchaseOrder({
              poID,
              ...rest,
              editApprovalId: procurementPoEditApprovalId || undefined,
            });
            if (!res.ok) {
              showToast(res.error || 'Could not update PO', { variant: 'error' });
              return false;
            }
            setProcurementPoEditApprovalId('');
            showToast(`${poID} updated.`);
            return true;
          }
          const res = await createPurchaseOrder({ ...payload, status: 'Pending' });
          if (!res.ok) {
            showToast(res.error || 'Could not save PO', { variant: 'error' });
            return false;
          }
          showToast(`${res.poID} created — approve, then assign transport.`);
          return true;
        }}
      />

      <StonePurchaseOrderModal
        isOpen={false}
        editDraft={stonePoEditDraft}
        onClose={() => {
          setShowStonePoModal(false);
          setStonePoEditDraft(null);
        }}
        suppliers={suppliers}
        masterData={ws?.snapshot?.masterData ?? null}
        products={invProducts}
        editApprovalSlot={
          stonePoEditDraft?.poID ? (
            <EditSecondApprovalInline
              entityKind="purchase_order"
              changeSummary="Edit purchase order lines, dates, or supplier details"
              entityId={stonePoEditDraft.poID}
              value={procurementPoEditApprovalId}
              onChange={setProcurementPoEditApprovalId}
            />
          ) : null
        }
        onQuickAddSupplier={() => {
          setShowStonePoModal(false);
          setStonePoEditDraft(null);
          openSupplierModal();
        }}
        onSubmit={async (payload) => {
          if (payload.poID) {
            const { poID, ...rest } = payload;
            const res = await updatePurchaseOrder({
              poID,
              ...rest,
              editApprovalId: procurementPoEditApprovalId || undefined,
            });
            if (!res.ok) {
              showToast(res.error || 'Could not update PO', { variant: 'error' });
              return false;
            }
            setProcurementPoEditApprovalId('');
            showToast(`${poID} updated.`);
            return true;
          }
          const res = await createPurchaseOrder({ ...payload, status: 'Pending' });
          if (!res.ok) {
            showToast(res.error || 'Could not save PO', { variant: 'error' });
            return false;
          }
          showToast(`${res.poID} created — approve, then assign transport.`);
          return true;
        }}
      />

      <AccessoryPurchaseOrderModal
        isOpen={false}
        editDraft={accessoryPoEditDraft}
        onClose={() => {
          setShowAccessoryPoModal(false);
          setAccessoryPoEditDraft(null);
        }}
        suppliers={suppliers}
        products={invProducts}
        editApprovalSlot={
          accessoryPoEditDraft?.poID ? (
            <EditSecondApprovalInline
              entityKind="purchase_order"
              changeSummary="Edit purchase order lines, dates, or supplier details"
              entityId={accessoryPoEditDraft.poID}
              value={procurementPoEditApprovalId}
              onChange={setProcurementPoEditApprovalId}
            />
          ) : null
        }
        onQuickAddSupplier={() => {
          setShowAccessoryPoModal(false);
          setAccessoryPoEditDraft(null);
          openSupplierModal();
        }}
        onSubmit={async (payload) => {
          if (payload.poID) {
            const { poID, ...rest } = payload;
            const res = await updatePurchaseOrder({
              poID,
              ...rest,
              editApprovalId: procurementPoEditApprovalId || undefined,
            });
            if (!res.ok) {
              showToast(res.error || 'Could not update PO', { variant: 'error' });
              return false;
            }
            setProcurementPoEditApprovalId('');
            showToast(`${poID} updated.`);
            return true;
          }
          const res = await createPurchaseOrder({ ...payload, status: 'Pending' });
          if (!res.ok) {
            showToast(res.error || 'Could not save PO', { variant: 'error' });
            return false;
          }
          showToast(`${res.poID} created — approve, then assign transport.`);
          return true;
        }}
      />

      <ModalFrame
        isOpen={showTransportModal}
        onClose={() => setShowTransportModal(false)}
        title="Link transport"
        description="Assign transporter and transport fee; Finance (cashier) records payment and account elsewhere."
      >
        <form
          className="z-modal-panel w-full max-w-[min(100%,28rem)] max-h-[min(92vh,760px)] flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] overflow-hidden mx-auto"
          onSubmit={async (e) => {
            e.preventDefault();
            const ag = agents.find((a) => a.id === transportForm.agentId);
            if (!transportForm.poID || !ag) {
              showToast('Select PO and agent.', { variant: 'error' });
              return;
            }
            const amt = Number(transportForm.transportAmountNgn);
            const advRaw = String(transportForm.transportAdvanceNgn || '').trim();
            const advNum = advRaw === '' ? null : Number(advRaw);
            if (
              (Number.isNaN(amt) || amt <= 0) &&
              (advNum == null || Number.isNaN(advNum) || advNum <= 0)
            ) {
              showToast('Enter transport fee and/or advance amount for Finance to pay.', { variant: 'error' });
              return;
            }
            const feeNgn =
              !Number.isNaN(amt) && amt > 0 ? amt : advNum != null && !Number.isNaN(advNum) && advNum > 0 ? advNum : undefined;
            const r = await linkTransportToPurchaseOrder(transportForm.poID, {
              transportAgentId: ag.id,
              transportAgentName: ag.name,
              transportReference: transportForm.transportReference,
              transportNote: transportForm.transportNote,
              transportFinanceAdvice: transportForm.transportFinanceAdvice,
              transportAmountNgn: feeNgn,
              transportAdvanceNgn:
                advNum != null && !Number.isNaN(advNum) && advNum > 0 ? advNum : undefined,
              editApprovalId: procurementPoEditApprovalId || undefined,
            });
            if (!r.ok) {
              showToast(r.error || 'Link failed', { variant: 'error' });
              return;
            }
            setProcurementPoEditApprovalId('');
            setShowTransportModal(false);
            if (!Number.isNaN(amt) && amt > 0) {
              showToast(
                'Transport linked — Finance work queue updated. In transit and settlement follow treasury payments.'
              );
            } else if (advNum != null && !Number.isNaN(advNum) && advNum > 0) {
              showToast(
                'Transport linked with advance quote — Finance desk will show the haulage payout queue.'
              );
            } else {
              showToast('Transport linked.');
            }
          }}
        >
          <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-zarewa-teal/[0.07] to-transparent px-5 py-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-zarewa-teal text-white flex items-center justify-center shadow-md shadow-zarewa-teal/25 shrink-0">
                <Truck size={22} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-zarewa-teal tracking-tight">Link transport</h2>
                <p className="text-ui-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                  Transporter &amp; transport fee
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTransportModal(false)}
              className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors shrink-0"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 custom-scrollbar space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2.5">
              <strong className="text-slate-800">Transport fee</strong> is the cost to move this order (haulage/freight).
              Enter it here for visibility; <strong className="text-slate-800">which account to pay from</strong> is set
              in Finance when the cashier posts payment. Use finance advice for split payments (e.g. advance vs on
              arrival).
            </p>
            {transportForm.poID ? (
              <EditSecondApprovalInline
                entityKind="purchase_order"
                changeSummary="Edit purchase order lines, dates, or supplier details"
                entityId={transportForm.poID}
                value={procurementPoEditApprovalId}
                onChange={setProcurementPoEditApprovalId}
              />
            ) : null}
            <div>
              <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">Agent</label>
              <select
                required
                value={transportForm.agentId}
                onChange={(e) => setTransportForm((f) => ({ ...f, agentId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-3 px-3 text-sm font-semibold"
              >
                <option value="">Select…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.region}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">
                Transport reference
              </label>
              <input
                value={transportForm.transportReference}
                onChange={(e) =>
                  setTransportForm((f) => ({ ...f, transportReference: e.target.value }))
                }
                placeholder="Waybill / trip / transport transaction ref"
                className="w-full rounded-xl border border-slate-200 py-3 px-3 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">
                Transport fee (₦)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={transportForm.transportAmountNgn}
                onChange={(e) =>
                  setTransportForm((f) => ({ ...f, transportAmountNgn: e.target.value }))
                }
                placeholder="0 = not set yet"
                className="w-full rounded-xl border border-slate-200 py-3 px-3 text-sm font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">
                Advance to move in transit (₦)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={transportForm.transportAdvanceNgn}
                onChange={(e) =>
                  setTransportForm((f) => ({ ...f, transportAdvanceNgn: e.target.value }))
                }
                placeholder="Leave blank = full fee (single payment)"
                className="w-full rounded-xl border border-slate-200 py-3 px-3 text-sm font-bold tabular-nums"
              />
              <p className="text-ui-xs text-slate-500 mt-1">
                When cumulative payments reach this amount, the PO becomes In Transit. When they reach the full
                transport fee above, transport is settled.
              </p>
            </div>
            <div>
              <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">
                Operations note
              </label>
              <textarea
                rows={2}
                value={transportForm.transportNote}
                onChange={(e) => setTransportForm((f) => ({ ...f, transportNote: e.target.value }))}
                placeholder="Pickup split, shared route, loading instruction…"
                className="w-full rounded-xl border border-slate-200 py-3 px-3 text-sm font-medium resize-none"
              />
            </div>
            <div>
              <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">
                Finance advice (DAV / cashier)
              </label>
              <textarea
                rows={2}
                value={transportForm.transportFinanceAdvice}
                onChange={(e) =>
                  setTransportForm((f) => ({ ...f, transportFinanceAdvice: e.target.value }))
                }
                placeholder="e.g. Advise pay ₦500k advance to transporter; balance on proof of delivery…"
                className="w-full rounded-xl border border-slate-200 py-3 px-3 text-sm font-medium resize-none"
              />
            </div>
          </div>
          <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-5 sm:px-6 py-3">
            <button
              type="submit"
              className="z-btn-primary w-full justify-center py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm"
            >
              Save transport
            </button>
          </div>
        </form>
      </ModalFrame>

      <ModalFrame
        isOpen={showApPayModal}
        onClose={resetApPaymentModal}
      >
        <div className="z-modal-panel max-w-lg w-full max-h-[min(92vh,820px)] flex flex-col p-0 overflow-hidden">
          <div className="shrink-0 flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-200">
            <h3 className="text-xl font-bold text-zarewa-teal flex items-center gap-2">
              <RotateCcw size={22} className="text-rose-600" />
              Supplier payment
            </h3>
            <button
              type="button"
              onClick={resetApPaymentModal}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
          {selectedAp ? (
            <form className="flex-1 min-h-0 flex flex-col" onSubmit={saveApPayment}>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-4 space-y-4">
                <div className="bg-rose-50/80 rounded-2xl p-4 border border-rose-100 text-sm space-y-1">
                <p className="font-mono font-bold text-zarewa-teal">{selectedAp.apID}</p>
                <p className="font-bold text-gray-800">{selectedAp.supplierName}</p>
                <p className="text-xs text-gray-600">
                  {selectedAp.invoiceRef ? `${selectedAp.invoiceRef} · ` : ''}PO {selectedAp.poRef || '—'}
                </p>
                <div className="grid grid-cols-3 gap-3 pt-2 text-ui-xs text-gray-600 tabular-nums">
                  <div>
                    <p className="uppercase text-gray-400">Invoice</p>
                    <p className="text-sm font-black text-zarewa-teal">{formatNgn(Number(selectedAp.amountNgn) || 0)}</p>
                  </div>
                  <div>
                    <p className="uppercase text-gray-400">Paid</p>
                    <p className="text-sm font-black text-zarewa-teal">{formatNgn(Number(selectedAp.paidNgn) || 0)}</p>
                  </div>
                  <div>
                    <p className="uppercase text-gray-400">Balance</p>
                    <p className="text-sm font-black text-rose-700">
                      {formatNgn(Math.max(0, (Number(selectedAp.amountNgn) || 0) - (Number(selectedAp.paidNgn) || 0)))}
                    </p>
                  </div>
                </div>
                </div>
              <div className="flex items-center justify-between">
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1">Payout breakdown</label>
                <button
                  type="button"
                  onClick={addApPayLine}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-ui-xs font-black uppercase tracking-wide text-rose-800"
                >
                  <Plus size={14} /> Add line
                </button>
              </div>
              <div className="space-y-1.5">
                {apPayLines.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-2 px-2.5 shadow-sm flex flex-col gap-2"
                  >
                    <select
                      value={line.treasuryAccountId}
                      onChange={(e) => updateApPayLine(line.id, { treasuryAccountId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-xs font-semibold"
                    >
                      <option value="">Select account…</option>
                      {treasuryAccounts.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a, treasuryBookByAccountId))})
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <input
                        type="date"
                        value={line.dateISO}
                        onChange={(e) => updateApPayLine(line.id, { dateISO: e.target.value })}
                        className="sm:col-span-3 rounded-lg border border-slate-200 bg-white py-2 px-2 text-xs font-semibold"
                        title="Payment date"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNairaInput(line.amount)}
                        onChange={(e) =>
                          updateApPayLine(line.id, { amount: normalizeNairaInput(e.target.value) })
                        }
                        className="sm:col-span-3 rounded-lg border border-slate-200 bg-white py-2 px-2 text-xs font-bold text-zarewa-teal"
                        placeholder="Amount ₦"
                      />
                      <input
                        type="text"
                        value={line.reference}
                        onChange={(e) => updateApPayLine(line.id, { reference: e.target.value })}
                        className="sm:col-span-4 rounded-lg border border-slate-200 bg-white py-2 px-2 text-xs"
                        placeholder="Reference"
                      />
                      <button
                        type="button"
                        onClick={() => removeApPayLine(line.id)}
                        className="sm:col-span-2 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-500"
                        title="Remove line"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md px-3 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-ui-xs tracking-wide">This payout</span>
                  <span className="font-black text-zarewa-teal">{formatNgn(apPayTotalNgn)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-ui-xs tracking-wide">Remaining after post</span>
                  <span className="font-black text-gray-700">
                    {formatNgn(
                      Math.max(
                        0,
                        Math.max(0, (Number(selectedAp.amountNgn) || 0) - (Number(selectedAp.paidNgn) || 0)) - apPayTotalNgn
                      )
                    )}
                  </span>
                </div>
              </div>
              <p className="text-ui-xs text-gray-500 leading-relaxed">
                Saving this payout writes treasury movements and keeps the payable open until the invoice balance is fully paid.
              </p>
              </div>
              <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-6 py-3">
                <button type="submit" disabled={apPayBusy} className="z-btn-primary w-full justify-center py-3 disabled:opacity-70 disabled:cursor-not-allowed">
                  {apPayBusy ? 'Saving...' : 'Save payment'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false);
          setEditingSupplierId(null);
          setSupplierEditApprovalId('');
          setSupplierPendingFiles([]);
        }}
      >
        <div className="z-modal-panel max-w-3xl w-full max-h-[min(92vh,820px)] flex flex-col p-0">
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 shrink-0">
            <div>
              <h3 className="text-lg font-bold text-zarewa-teal">
                {editingSupplierId ? 'Edit supplier' : 'Register supplier'}
              </h3>
              <p className="text-ui-xs text-slate-500 mt-0.5">
                Company details, bank accounts, contacts, and agreement uploads (stored securely on your server DB).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSupplierModal(false);
                setEditingSupplierId(null);
                setSupplierEditApprovalId('');
                setSupplierPendingFiles([]);
              }}
              className="p-2 text-slate-400"
            >
              <X size={22} />
            </button>
          </div>
          <form className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-6" onSubmit={saveSupplier}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Legal / trading name *</label>
                <input
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">City / region</label>
                <input
                  value={supplierForm.city}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Kano / Lagos / Abuja"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Main phone</label>
                <input
                  value={supplierForm.phoneMain}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, phoneMain: e.target.value }))}
                  placeholder="+234…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Company email</label>
                <input
                  type="email"
                  value={supplierForm.companyEmail}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, companyEmail: e.target.value }))}
                  placeholder="accounts@vendor.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Website</label>
                <input
                  value={supplierForm.website}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">WhatsApp</label>
                <input
                  value={supplierForm.whatsapp}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="Optional"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">VAT / TIN</label>
                <input
                  value={supplierForm.vatTin}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, vatTin: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">RC / CAC no.</label>
                <input
                  value={supplierForm.rcNumber}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, rcNumber: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Registered address</label>
                <textarea
                  value={supplierForm.registeredAddress}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, registeredAddress: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Billing address (if different)</label>
                <textarea
                  value={supplierForm.billingAddress}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, billingAddress: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-3">
              <p className="text-ui-xs font-black text-zarewa-teal uppercase tracking-widest flex items-center gap-2">
                <Building2 size={14} /> Bank accounts (add all accounts you pay to)
              </p>
              {padBankAccounts(supplierForm.bankAccounts, 2, 6).map((row, idx) => (
                <div
                  key={`bank-${idx}`}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 p-2 rounded-lg bg-white border border-slate-100"
                >
                  <input
                    placeholder="Bank name"
                    value={row.bankName}
                    onChange={(e) => {
                      const next = padBankAccounts(supplierForm.bankAccounts, 2, 6);
                      next[idx] = { ...next[idx], bankName: e.target.value };
                      setSupplierForm((f) => ({ ...f, bankAccounts: next }));
                    }}
                    className="lg:col-span-2 rounded-lg border border-slate-200 py-2 px-2 text-xs"
                  />
                  <input
                    placeholder="Account name"
                    value={row.accountName}
                    onChange={(e) => {
                      const next = padBankAccounts(supplierForm.bankAccounts, 2, 6);
                      next[idx] = { ...next[idx], accountName: e.target.value };
                      setSupplierForm((f) => ({ ...f, bankAccounts: next }));
                    }}
                    className="lg:col-span-2 rounded-lg border border-slate-200 py-2 px-2 text-xs"
                  />
                  <input
                    placeholder="Account no."
                    value={row.accountNumber}
                    onChange={(e) => {
                      const next = padBankAccounts(supplierForm.bankAccounts, 2, 6);
                      next[idx] = { ...next[idx], accountNumber: e.target.value };
                      setSupplierForm((f) => ({ ...f, bankAccounts: next }));
                    }}
                    className="rounded-lg border border-slate-200 py-2 px-2 text-xs font-mono"
                  />
                  <input
                    placeholder="Sort / routing"
                    value={row.sortCode}
                    onChange={(e) => {
                      const next = padBankAccounts(supplierForm.bankAccounts, 2, 6);
                      next[idx] = { ...next[idx], sortCode: e.target.value };
                      setSupplierForm((f) => ({ ...f, bankAccounts: next }));
                    }}
                    className="rounded-lg border border-slate-200 py-2 px-2 text-xs"
                  />
                </div>
              ))}
              {supplierForm.bankAccounts.length < 6 ? (
                <button
                  type="button"
                  className="text-ui-xs font-bold text-orange-700 uppercase flex items-center gap-1"
                  onClick={() =>
                    setSupplierForm((f) => ({
                      ...f,
                      bankAccounts: [...padBankAccounts(f.bankAccounts, 2, 6), SUPPLIER_BANK_ROW_TEMPLATE()],
                    }))
                  }
                >
                  <Plus size={12} /> Add bank row
                </button>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-3">
              <p className="text-ui-xs font-black text-zarewa-teal uppercase tracking-widest flex items-center gap-2">
                <Users size={14} /> Contacts (sales, dispatch, accounts…)
              </p>
              {padContacts(supplierForm.contacts, 3, 6).map((row, idx) => (
                <div
                  key={`contact-${idx}`}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-2 rounded-lg bg-white border border-slate-100"
                >
                  <input
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => {
                      const next = padContacts(supplierForm.contacts, 3, 6);
                      next[idx] = { ...next[idx], name: e.target.value };
                      setSupplierForm((f) => ({ ...f, contacts: next }));
                    }}
                    className="rounded-lg border border-slate-200 py-2 px-2 text-xs"
                  />
                  <input
                    placeholder="Role"
                    value={row.role}
                    onChange={(e) => {
                      const next = padContacts(supplierForm.contacts, 3, 6);
                      next[idx] = { ...next[idx], role: e.target.value };
                      setSupplierForm((f) => ({ ...f, contacts: next }));
                    }}
                    className="rounded-lg border border-slate-200 py-2 px-2 text-xs"
                  />
                  <input
                    placeholder="Email"
                    value={row.email}
                    onChange={(e) => {
                      const next = padContacts(supplierForm.contacts, 3, 6);
                      next[idx] = { ...next[idx], email: e.target.value };
                      setSupplierForm((f) => ({ ...f, contacts: next }));
                    }}
                    className="rounded-lg border border-slate-200 py-2 px-2 text-xs"
                  />
                  <input
                    placeholder="Phone"
                    value={row.phone}
                    onChange={(e) => {
                      const next = padContacts(supplierForm.contacts, 3, 6);
                      next[idx] = { ...next[idx], phone: e.target.value };
                      setSupplierForm((f) => ({ ...f, contacts: next }));
                    }}
                    className="rounded-lg border border-slate-200 py-2 px-2 text-xs"
                  />
                </div>
              ))}
              {supplierForm.contacts.length < 6 ? (
                <button
                  type="button"
                  className="text-ui-xs font-bold text-orange-700 uppercase flex items-center gap-1"
                  onClick={() =>
                    setSupplierForm((f) => ({
                      ...f,
                      contacts: [...padContacts(f.contacts, 3, 6), SUPPLIER_CONTACT_ROW_TEMPLATE()],
                    }))
                  }
                >
                  <Plus size={12} /> Add contact row
                </button>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-amber-50/40 p-3 space-y-2">
              <p className="text-ui-xs font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
                <Paperclip size={14} /> Agreements & certificates (PDF, scans — max ~700 KB each, up to 6 files)
              </p>
              {(supplierForm.agreementMeta || []).map((a) =>
                supplierForm.removedAgreementIds?.includes(a.id) ? null : (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border border-amber-100 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-zarewa-teal truncate">{a.fileName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.hasFile ? (
                        <a
                          href={apiUrl(
                            `/api/suppliers/${encodeURIComponent(editingSupplierId || '')}/agreements/${encodeURIComponent(a.id)}/file`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ui-xs font-bold text-orange-800 underline"
                          onClick={(ev) => {
                            if (!editingSupplierId) ev.preventDefault();
                          }}
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-ui-xs text-slate-400">No file</span>
                      )}
                      <button
                        type="button"
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="Remove from record"
                        onClick={() =>
                          setSupplierForm((f) => ({
                            ...f,
                            removedAgreementIds: [...(f.removedAgreementIds || []), a.id],
                          }))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              )}
              {supplierPendingFiles.map((pf) => (
                <div
                  key={pf.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs"
                >
                  <span className="truncate font-medium">{pf.file.name}</span>
                  <button
                    type="button"
                    className="text-red-500 p-1"
                    onClick={() => setSupplierPendingFiles((prev) => prev.filter((x) => x.id !== pf.id))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <label className="inline-flex items-center gap-2 text-ui-xs font-bold text-amber-900 cursor-pointer">
                <span className="rounded-lg border border-amber-300 bg-white px-3 py-2">Add files…</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = '';
                    setSupplierPendingFiles((prev) => {
                      const next = [...prev];
                      const cap = 6 - (supplierForm.agreementMeta || []).filter((x) => !supplierForm.removedAgreementIds?.includes(x.id)).length;
                      let room = Math.max(0, cap - next.length);
                      for (const file of files) {
                        if (room <= 0) break;
                        next.push({ id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file });
                        room -= 1;
                      }
                      return next;
                    });
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Payment terms</label>
                <select
                  value={supplierForm.paymentTerms}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold"
                >
                  <option value="Credit">Credit</option>
                  <option value="Advance">Advance</option>
                </select>
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Quality score (0–100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={supplierForm.qualityScore}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, qualityScore: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Commercial / onboarding notes</label>
                <textarea
                  value={supplierForm.notesCommercial}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, notesCommercial: e.target.value }))}
                  rows={2}
                  placeholder="Delivery terms, MOQ, lead times, certifications…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-ui-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Internal procurement notes</label>
                <textarea
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Visible on supplier card; not shown to vendor."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm"
                />
              </div>
            </div>

            {editingSupplierId ? (
              <EditSecondApprovalInline
                entityKind="supplier"
                entityId={editingSupplierId}
                value={supplierEditApprovalId}
                onChange={setSupplierEditApprovalId}
              />
            ) : null}
            <div className="sticky bottom-0 bg-white pt-2 pb-1 border-t border-slate-100">
              <button type="submit" className="z-btn-primary w-full justify-center py-3">
                {editingSupplierId ? 'Update supplier' : 'Save supplier'}
              </button>
            </div>
          </form>
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={showAgentModal}
        onClose={() => {
          setShowAgentModal(false);
          setEditingAgentId(null);
          setAgentEditApprovalId('');
        }}
      >
        <div className="z-modal-panel max-w-lg max-h-[min(92vh,720px)] overflow-y-auto custom-scrollbar p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-zarewa-teal">
              {editingAgentId ? 'Edit transport agent' : 'New transport agent'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowAgentModal(false);
                setEditingAgentId(null);
                setAgentEditApprovalId('');
              }}
              className="p-2 text-slate-400"
            >
              <X size={22} />
            </button>
          </div>
          <form className="space-y-4" onSubmit={saveAgent}>
            <div>
              <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">Name</label>
              <input
                required
                placeholder="Agent or company name"
                value={agentForm.name}
                onChange={(e) => setAgentForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm font-bold"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">Phone</label>
                <input
                  placeholder="Primary phone"
                  value={agentForm.phone}
                  onChange={(e) => setAgentForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">
                  Region / base
                </label>
                <input
                  placeholder="e.g. Kano — Lagos"
                  value={agentForm.region}
                  onChange={(e) => setAgentForm((f) => ({ ...f, region: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm"
                />
              </div>
            </div>
            <p className="text-ui-xs font-bold text-slate-500 uppercase tracking-wide border-t border-slate-100 pt-3">
              Fleet &amp; operations
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">Vehicle type</label>
                <input
                  placeholder="e.g. Flatbed, trailer"
                  value={agentForm.vehicleType}
                  onChange={(e) => setAgentForm((f) => ({ ...f, vehicleType: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">Registration</label>
                <input
                  placeholder="Plate / fleet ID"
                  value={agentForm.vehicleReg}
                  onChange={(e) => setAgentForm((f) => ({ ...f, vehicleReg: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">Typical routes</label>
              <textarea
                placeholder="Corridors and cities this transporter usually runs"
                value={agentForm.typicalRoutes}
                onChange={(e) => setAgentForm((f) => ({ ...f, typicalRoutes: e.target.value }))}
                rows={2}
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm resize-y min-h-[2.5rem]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">
                  Payment preference
                </label>
                <select
                  value={agentForm.paymentPreference}
                  onChange={(e) => setAgentForm((f) => ({ ...f, paymentPreference: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-semibold bg-white"
                >
                  <option value="">Not specified</option>
                  <option value="Bank transfer">Bank transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Mixed (advance + balance)">Mixed (advance + balance)</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">
                  Emergency contact
                </label>
                <input
                  placeholder="Alt phone / dispatcher"
                  value={agentForm.emergencyContact}
                  onChange={(e) => setAgentForm((f) => ({ ...f, emergencyContact: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">
                Internal notes (reliability, timing)
              </label>
              <textarea
                placeholder="What finance and procurement should know — punctuality, damage history, negotiation notes…"
                value={agentForm.reliabilityNotes}
                onChange={(e) => setAgentForm((f) => ({ ...f, reliabilityNotes: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm resize-y min-h-[3rem]"
              />
            </div>
            {editingAgentId ? (
              <EditSecondApprovalInline
                entityKind="transport_agent"
                entityId={editingAgentId}
                value={agentEditApprovalId}
                onChange={setAgentEditApprovalId}
              />
            ) : null}
            <button type="submit" className="z-btn-primary w-full justify-center py-3">
              {editingAgentId ? 'Update agent' : 'Save agent'}
            </button>
          </form>
        </div>
      </ModalFrame>

      <ProcurementPoPreviewSlideOver
        po={previewPo}
        isOpen={Boolean(previewPo)}
        coilLots={coilLots}
        movements={movements}
        inTransitLoads={inTransitLoads}
        treasuryMovements={treasuryMovements}
        accountsPayable={payables}
        onClose={() => {
          setPreviewPo(null);
          setPreviewAp(null);
        }}
        onEdit={(po) => {
          setPreviewPo(null);
          setPreviewAp(null);
          openPoEditor(po);
        }}
        canEdit={Boolean(ws?.hasPermission?.('purchase_orders.manage'))}
        wsCanMutate={ws?.canMutate}
        canApprovePo={Boolean(ws?.hasPermission?.('purchase_orders.manage') && ws?.canMutate)}
        onApprove={async (p) => {
          setProcurementPoForApprovalUi(p.poID);
          const r = await setPurchaseOrderStatus(p.poID, 'Approved', {
            editApprovalId: procurementPoEditApprovalId || undefined,
          });
          if (r.ok) {
            setProcurementPoEditApprovalId('');
            showToast(`${p.poID} approved.`);
            if (
              purchaseOrderCanAssignTransport({ ...p, status: 'Approved' }) &&
              (await appConfirm({ message: `${p.poID} approved. Assign transport (haulier and fee) now?` }))
            ) {
              openPoTransportLink(p.poID);
            }
          } else showToast(r.error || 'Update failed', { variant: 'error' });
        }}
        onReject={async (p) => {
          setProcurementPoForApprovalUi(p.poID);
          const r = await setPurchaseOrderStatus(p.poID, 'Rejected', {
            editApprovalId: procurementPoEditApprovalId || undefined,
          });
          if (r.ok) {
            setProcurementPoEditApprovalId('');
            showToast(`${p.poID} rejected.`);
          } else showToast(r.error || 'Update failed', { variant: 'error' });
        }}
        onAssignTransport={(p) => openPoTransportLink(p.poID)}
      />
      <ProcurementPayablePreviewSlideOver
        payable={previewAp}
        isOpen={Boolean(previewAp)}
        onClose={() => {
          setPreviewPo(null);
          setPreviewAp(null);
        }}
        branchNameById={branchNameById}
        todayIso={todayIso}
        canPay={canRecordSupplierPayment}
        wsCanMutate={ws?.canMutate}
        onPay={(ap) => {
          setPreviewPo(null);
          setPreviewAp(null);
          openApPaymentModal(ap);
        }}
      />
    </PageShell>
    </ProcurementPageContext.Provider>
  );
};


class ProcurementRouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Procurement route crashed during render.', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <PageShell>
          <MainPanel className="!rounded-xl !border-slate-200/90 !shadow-sm !bg-white !p-6">
            <h2 className="text-lg font-bold text-zarewa-teal">Procurement temporarily unavailable</h2>
            <p className="mt-2 text-sm text-slate-600">
              A screen error occurred while loading Procurement. Refresh the page, and if this persists, share this
              time with support so we can trace the exact row causing the issue.
            </p>
          </MainPanel>
        </PageShell>
      );
    }
    return this.props.children;
  }
}

export default function ProcurementPage() {
  return (
    <ProcurementRouteErrorBoundary>
      <Procurement />
    </ProcurementRouteErrorBoundary>
  );
}

