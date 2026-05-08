import React, { useMemo, useState } from 'react';
import ProcurementDashboardFilters from './ProcurementDashboardFilters';
import ProcurementKpiStrip from './ProcurementKpiStrip';
import ProcurementSpendTrendChart from './ProcurementSpendTrendChart';
import ProcurementCategoryDonut from './ProcurementCategoryDonut';
import ProcurementTopItemsBar from './ProcurementTopItemsBar';
import SupplierScorecardTable from './SupplierScorecardTable';
import PayablesAgingChart from './PayablesAgingChart';
import GoodsInTransitPanel from './GoodsInTransitPanel';
import ProcurementAlertsPanel from './ProcurementAlertsPanel';
import CoilColourGaugeRiskHeatmap from './CoilColourGaugeRiskHeatmap';
import { buildProcurementDashboardModel } from '../../../lib/procurementDashboardCore';

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function isoMonthStart() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function buildAlerts(model) {
  const out = [];
  if (model.kpis.stockOutIncidents > 0) {
    out.push({ severity: 'high', type: 'Stock-out', message: `${model.kpis.stockOutIncidents} item(s) at zero stock.` });
  }
  if (model.kpis.outstandingSupplierPaymentsNgn > 0) {
    out.push({
      severity: 'medium',
      type: 'Outstanding payables',
      message: 'Supplier obligations pending settlement.',
      amountNgn: model.kpis.outstandingSupplierPaymentsNgn,
    });
  }
  if (model.kpis.pendingPoCount > 0) {
    out.push({ severity: 'medium', type: 'PO approvals', message: `${model.kpis.pendingPoCount} purchase orders awaiting action.` });
  }
  return out;
}

function buildCoilRiskRows(products = []) {
  return products
    .filter((p) => String(p?.unit || '').toLowerCase() === 'kg')
    .map((p) => {
      const attrs = p.dashboardAttrs || {};
      const stockKg = Number(p.stockLevel) || 0;
      const avgDailyKg = Math.max(1, Number(attrs.avgDailyConsumptionKg) || 3);
      const daysCover = stockKg / avgDailyKg;
      const targetCoverDays = 30;
      return {
        key: String(p.productID || `${attrs.colour}-${attrs.gauge}`),
        color: attrs.colour || attrs.color || '—',
        gauge: attrs.gauge || '—',
        stockKg,
        avgDailyKg,
        daysCover,
        recommendedReorderKg: Math.max(0, targetCoverDays * avgDailyKg - stockKg),
      };
    })
    .sort((a, b) => a.daysCover - b.daysCover)
    .slice(0, 18);
}

const EMPTY_MODEL = {
  kpis: {
    totalPurchasesNgn: 0,
    pendingPoCount: 0,
    approvedPoCount: 0,
    outstandingSupplierPaymentsNgn: 0,
    activeSuppliers: 0,
    goodsInTransitCount: 0,
    lowStockItemsCount: 0,
    stockOutIncidents: 0,
    posCreatedToday: 0,
    payablesOutstandingNgn: 0,
  },
  charts: {
    spendTrend: [],
    categorySpend: [],
    topItems: [],
    supplierSpend: [],
    payablesAging: { '0_30': 0, '31_60': 0, '61_90': 0, over_90: 0 },
    poStatusFlow: [],
  },
};

function safeBuildModel(args) {
  try {
    return buildProcurementDashboardModel(args);
  } catch (error) {
    console.error('Procurement dashboard model failed; rendering safe fallback.', error);
    return EMPTY_MODEL;
  }
}

export default function ProcurementDashboardTab({
  purchaseOrders = [],
  suppliers = [],
  accountsPayable = [],
  products = [],
  inTransitLoads = [],
  transportAgents = [],
  workspaceBranches = [],
  canViewFinance = false,
  canViewExecutive = false,
}) {
  const [filters, setFilters] = useState({
    from: isoMonthStart(),
    to: isoToday(),
    branchId: 'all',
    supplierId: 'all',
    materialClass: 'all',
    colour: '',
    gauge: '',
    transportAgentId: 'all',
  });

  const filteredPo = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (filters.supplierId !== 'all' && String(po?.supplierID) !== filters.supplierId) return false;
      if (filters.transportAgentId !== 'all' && String(po?.transportAgentId || '') !== filters.transportAgentId) return false;
      if (filters.branchId !== 'all' && String(po?.branchId || '') !== filters.branchId) return false;
      return true;
    });
  }, [purchaseOrders, filters]);

  const model = useMemo(
    () =>
      safeBuildModel({
        purchaseOrders: filteredPo,
        suppliers,
        accountsPayable,
        products,
        inTransitLoads,
        from: filters.from,
        to: filters.to,
      }),
    [filteredPo, suppliers, accountsPayable, products, inTransitLoads, filters.from, filters.to]
  );

  const alerts = useMemo(() => buildAlerts(model), [model]);
  const coilRiskRows = useMemo(() => buildCoilRiskRows(products), [products]);

  return (
    <div className="space-y-3">
      <ProcurementDashboardFilters
        filters={filters}
        onChange={(patch) => setFilters((p) => ({ ...p, ...patch }))}
        branchOptions={workspaceBranches}
        supplierOptions={suppliers}
        transporterOptions={transportAgents}
      />
      <ProcurementKpiStrip kpis={model.kpis} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ProcurementSpendTrendChart rows={model.charts.spendTrend} />
        <ProcurementCategoryDonut rows={model.charts.categorySpend} />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ProcurementTopItemsBar rows={model.charts.topItems} />
        <SupplierScorecardTable rows={model.charts.supplierSpend} />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {canViewFinance ? <PayablesAgingChart buckets={model.charts.payablesAging} /> : <GoodsInTransitPanel loads={inTransitLoads} />}
        <GoodsInTransitPanel loads={inTransitLoads} />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <CoilColourGaugeRiskHeatmap rows={coilRiskRows} />
        <ProcurementAlertsPanel alerts={canViewExecutive ? alerts : alerts.filter((a) => a.type !== 'payable_due')} />
      </div>
    </div>
  );
}

