import fs from 'fs';
import path from 'path';

const root = 'C:/Users/USER/OneDrive/Desktop/Zarewa-frontend-main/src/pages';
const srcPath = path.join(root, 'Procurement.jsx');
const procDir = path.join(root, 'procurement');
const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split('\n');

const asideLines = lines.slice(167, 284);
const payableRowLines = lines.slice(3386, 3470);
const tabPanelInner = lines.slice(1477, 2221);
const sharedConstLines = lines.slice(84, 163);

fs.writeFileSync(
  path.join(procDir, 'ProcurementPageContext.jsx'),
  `import { createContext, useContext } from 'react';

export const ProcurementPageContext = createContext(null);

export function useProcurementPage() {
  const ctx = useContext(ProcurementPageContext);
  if (!ctx) {
    throw new Error('useProcurementPage must be used within ProcurementPageContext.Provider');
  }
  return ctx;
}
`
);

const exportPrefixes = [
  'const TAB_LABELS',
  'const PROCUREMENT_PURCHASES_COLUMN_PAGE_SIZE',
  'const PAYABLES_TABLE_PAGE_SIZE',
  'const PROCUREMENT_COIL_MATERIALS',
  'const STANDARD_COIL_GAUGES_MM',
  'function procurementCoilMaterialByKey',
  'function kgPerMFromStripDensity',
  'function poLineSummaryLabel',
  'const PILL',
  'const statusChipBorder',
  'const CARD_ROW',
];
fs.writeFileSync(
  path.join(procDir, 'procurementTabShared.js'),
  sharedConstLines
    .map((l) => {
      if (exportPrefixes.some((p) => l.startsWith(p))) return `export ${l}`;
      return l;
    })
    .join('\n')
);

const asideContent = asideLines
  .join('\n')
  .replace(/^function ProcurementTransportAgentsAside/, 'export function ProcurementTransportAgentsAside');
fs.writeFileSync(
  path.join(procDir, 'ProcurementTransportAgentsAside.jsx'),
  `import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, Pencil, Trash2 } from 'lucide-react';
import { CARD_ROW, statusChipBorder } from './procurementTabShared.js';

${asideContent}
`
);

const payableContent = payableRowLines
  .join('\n')
  .replace(/^function ProcurementPayableRow/, 'export function ProcurementPayableRow');
fs.writeFileSync(
  path.join(procDir, 'ProcurementPayableRow.jsx'),
  `import React from 'react';
import { formatNgn } from '../../Data/mockData';
import { CARD_ROW } from './procurementTabShared.js';

${payableContent}
`
);

const contextKeys = [
  'activeTab',
  'setActiveTab',
  'searchQuery',
  'setSearchQuery',
  'canRecordSupplierPayment',
  'payablesOutstandingNgn',
  'payablesOpenSearchQuery',
  'setPayablesOpenSearchQuery',
  'payablesSettledSearchQuery',
  'setPayablesSettledSearchQuery',
  'payablesOpenSort',
  'setPayablesOpenSort',
  'payablesSettledSort',
  'setPayablesSettledSort',
  'sortedOpenPayables',
  'sortedSettledPayables',
  'openPayablesPage',
  'settledPayablesPage',
  'todayIso',
  'branchNameById',
  'wsCanMutate',
  'setPreviewAp',
  'setPreviewPo',
  'openApPaymentModal',
  'poTransportMissingLinkRows',
  'poTransportFilter',
  'setPoTransportFilter',
  'openPoTransportLink',
  'poTransportAwaitingTreasuryRows',
  'wsCanAccessFinance',
  'wsCanFinancePay',
  'wsSessionUserRoleKey',
  'procurementPoForApprovalUi',
  'procurementPoEditApprovalId',
  'setProcurementPoEditApprovalId',
  'poListSort',
  'setPoListSort',
  'coilPOsSorted',
  'stonePOsSorted',
  'accessoryPOsSorted',
  'mixedPOsSorted',
  'coilPoPurchasesPage',
  'stonePoPurchasesPage',
  'accessoryPoPurchasesPage',
  'mixedPoPurchasesPage',
  'poTransportMissingLinkIds',
  'poTransportCatchUpRows',
  'orphanHaulageRows',
  'canManagePo',
  'openPoPreviewById',
  'agents',
  'openEditAgent',
  'removeAgent',
  'openAgentModal',
  'transitRowsForAside',
  'purchaseOrders',
  'filteredSuppliers',
  'openEditSupplier',
  'removeSupplier',
  'canAccessPriceList',
  'saveStandardConversion',
  'standardConversionForm',
  'setStandardConversionForm',
  'standardConversionSaving',
  'standardPhysicsKgPerM',
  'standardEffectiveKgPerM',
  'stdOverrideKgPerM',
  'setShowMaterialPricingWorkbook',
];

let tabInner = tabPanelInner.join('\n');
tabInner = tabInner
  .replace(/ws\?\.canMutate/g, 'wsCanMutate')
  .replace(
    /Boolean\(\s*ws\?\.canAccessModule\?\.\('finance'\) &&\s*\(ws\?\.hasPermission\?\.\('finance\.pay'\) \|\| ws\?\.hasPermission\?\.\('cashier\.desk\.view'\)\)\s*\)/g,
    'wsCanFinancePay'
  )
  .replace(/ws\?\.canAccessModule\?\.\('finance'\)/g, 'wsCanAccessFinance')
  .replace(/ws\?\.session\?\.user\?\.roleKey/g, 'wsSessionUserRoleKey');

const tabPanels = `import React from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Truck,
  Banknote,
  AlertTriangle,
  Pencil,
  Trash2,
  Info,
} from 'lucide-react';

import { MainPanel } from '../../components/layout';
import { EditSecondApprovalInline } from '../../components/EditSecondApprovalInline';
import { editMutationNeedsSecondApprovalRole } from '../../lib/editApprovalUi';
import { CONVERSION_FLAG_RATIO, formatNgn } from '../../Data/mockData';
import { purchaseOrderOrderedValueNgn } from '../../lib/liveAnalytics';
import { procurementKindFromPo } from '../../lib/procurementPoKind';
import {
  SalesListSearchInput,
  SalesListSortBar,
  SalesListTableFrame,
} from '../../components/sales/SalesListTableFrame';
import { PROCUREMENT_PO_SORT_FIELDS } from '../../lib/procurementPoListSorting';
import { TransportCatchUpPanel } from '../../components/procurement/TransportCatchUpPanel';
import { purchaseOrderTransportGapLabel } from '../../lib/purchaseOrderWorkflow';
import { PAYABLES_SORT_FIELDS } from '../../lib/procurementPayablesSorting';
import { AppTablePager } from '../../components/ui/AppDataTable';
import { ProcurementFormSection } from '../../components/procurement/ProcurementFormSection';
import { PriceListPanel } from '../../components/procurement/PriceListPanel';
import { useProcurementPage } from './ProcurementPageContext.jsx';
import { ProcurementPayableRow } from './ProcurementPayableRow.jsx';
import { ProcurementTransportAgentsAside } from './ProcurementTransportAgentsAside.jsx';
import {
  TAB_LABELS,
  PROCUREMENT_PURCHASES_COLUMN_PAGE_SIZE,
  PAYABLES_TABLE_PAGE_SIZE,
  PROCUREMENT_COIL_MATERIALS,
  STANDARD_COIL_GAUGES_MM,
  procurementCoilMaterialByKey,
  poLineSummaryLabel,
  PILL,
  statusChipBorder,
  CARD_ROW,
} from './procurementTabShared.js';

export function ProcurementTabPanels() {
  const {
    ${contextKeys.join(',\n    ')},
  } = useProcurementPage();

  return (
        <div className="col-span-full min-w-0 order-2">
${tabInner}
        </div>
  );
}
`;

fs.writeFileSync(path.join(procDir, 'ProcurementTabPanels.jsx'), tabPanels);

// Build new Procurement.jsx
const beforeAside = lines.slice(0, 84);
const normalizeBlock = lines.slice(146, 162);
const componentBodyBeforeTabs = lines.slice(285, 1476);
const afterTabPanels = lines.slice(2224, 3386);
const afterPayableRow = lines.slice(3470);

let importBlock = beforeAside.join('\n');
importBlock = importBlock
  .replace(
    "import { MainPanel, PageHeader, PageShell, PageTabs, ModalFrame } from '../components/layout';",
    "import { MainPanel, PageHeader, PageShell, PageTabs, ModalFrame } from '../components/layout';"
  )
  .replace(
    "import { ProcurementFormSection } from '../components/procurement/ProcurementFormSection';\nimport { PriceListPanel } from '../components/procurement/PriceListPanel';",
    ''
  )
  .replace(
    "import {\n  SalesListSearchInput,\n  SalesListSortBar,\n  SalesListTableFrame,\n} from '../components/sales/SalesListTableFrame';",
    ''
  )
  .replace(
    "import { PROCUREMENT_PO_SORT_FIELDS, sortPurchaseOrdersList } from '../lib/procurementPoListSorting';",
    "import { sortPurchaseOrdersList } from '../lib/procurementPoListSorting';"
  )
  .replace(
    "import { TransportCatchUpPanel } from '../components/procurement/TransportCatchUpPanel';",
    ''
  )
  .replace(
    "import { PAYABLES_SORT_FIELDS, sortAccountsPayableList } from '../lib/procurementPayablesSorting';",
    "import { sortAccountsPayableList } from '../lib/procurementPayablesSorting';"
  )
  .replace("import { AppTablePager } from '../components/ui/AppDataTable';", '')
  .replace("import { CONVERSION_FLAG_RATIO, formatNgn } from '../Data/mockData';", "import { formatNgn } from '../Data/mockData';");

// Add new imports before Procurement component
const newImports = `
import { TAB_LABELS, STANDARD_COIL_GAUGES_MM, PROCUREMENT_COIL_MATERIALS, procurementCoilMaterialByKey, kgPerMFromStripDensity } from './procurement/procurementTabShared.js';
import { ProcurementPageContext } from './procurement/ProcurementPageContext.jsx';
import { ProcurementTabPanels } from './procurement/ProcurementTabPanels.jsx';
`;

const constantsBlock = `/** Rows per column for Coil / Stone-coated / Accessories lists on Purchases. */
const PROCUREMENT_PURCHASES_COLUMN_PAGE_SIZE = 10;
const PAYABLES_TABLE_PAGE_SIZE = 10;

/** Kg coil SKUs below this on-hand level count as low stock on the Procurement KPI row. */
const APPROVED_PURCHASE_WINDOWS = [
  { id: '1m', label: '1 month', months: 1 },
  { id: '4m', label: '4 months', months: 4 },
  { id: '6m', label: '6 months', months: 6 },
  { id: '12m', label: '1 year', months: 12 },
];

${normalizeBlock.join('\n')}
`;

let bodyPart = componentBodyBeforeTabs.join('\n');

const pageContextBlock = `
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
`;

bodyPart = bodyPart.replace(
  /  return \(\n    <PageShell blurred=\{isAnyModalOpen\}>/,
  `${pageContextBlock}\n\n  return (\n    <ProcurementPageContext.Provider value={pageContextValue}>\n    <PageShell blurred={isAnyModalOpen}>`
);

const tabPanelsPlaceholder = '        <ProcurementTabPanels />\n';

let modalPart = afterTabPanels.join('\n');
modalPart = modalPart.replace(
  /    <\/PageShell>\n  \);/,
  `    </PageShell>\n    </ProcurementPageContext.Provider>\n  );`
);

const newProcurement = [
  importBlock.trimEnd(),
  newImports,
  constantsBlock,
  bodyPart,
  tabPanelsPlaceholder,
  '      </div>\n\n',
  modalPart,
  afterPayableRow.join('\n'),
].join('\n');

fs.writeFileSync(srcPath, newProcurement);
console.log('Updated Procurement.jsx, lines:', newProcurement.split('\n').length);
