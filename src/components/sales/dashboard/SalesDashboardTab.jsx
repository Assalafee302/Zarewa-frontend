import React, { useMemo, useState } from 'react';
import { formatNgn } from '../../../Data/mockData';
import { buildSalesDashboardModel } from '../../../lib/salesDashboardCore';
import SalesDashboardFilters from './SalesDashboardFilters';
import SalesRevenueTrendChart from './SalesRevenueTrendChart';
import SalesPipelineFunnel from './SalesPipelineFunnel';
import SalesTopCustomersPanel from './SalesTopCustomersPanel';
import SalesReceivablesAgingChart from './SalesReceivablesAgingChart';
import SalesDemandMixPanel from './SalesDemandMixPanel';
import SalesAlertsPanel from './SalesAlertsPanel';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
      <p className="text-[13px] font-black text-[#134e4a] mt-1">{value}</p>
      {hint ? <p className="text-[9px] text-slate-500 mt-0.5">{hint}</p> : null}
    </div>
  );
}

export default function SalesDashboardTab({
  quotations = [],
  receipts = [],
  refunds = [],
  cuttingLists = [],
  productionJobs = [],
  customers = [],
  canViewFinance = false,
}) {
  const [filters, setFilters] = useState(() => ({ from: monthStartISO(), to: todayISO() }));
  const model = useMemo(
    () =>
      buildSalesDashboardModel({
        quotations,
        receipts,
        refunds,
        cuttingLists,
        productionJobs,
        customers,
        from: filters.from,
        to: filters.to,
      }),
    [quotations, receipts, refunds, cuttingLists, productionJobs, customers, filters]
  );

  const { kpis, charts, alerts } = model;
  return (
    <div className="space-y-3">
      <SalesDashboardFilters filters={filters} onChange={(patch) => setFilters((s) => ({ ...s, ...patch }))} />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Kpi label="Sales MTD" value={formatNgn(kpis.salesMtdNgn)} />
        <Kpi label="Sales YTD" value={formatNgn(kpis.salesYtdNgn)} />
        <Kpi label="Receipts MTD" value={formatNgn(kpis.receiptsMtdNgn)} />
        <Kpi label="Pending quotes" value={String(kpis.pendingQuotations)} hint={`${kpis.approvedQuotations} approved`} />
        <Kpi label="Quote to cash" value={`${Math.round(kpis.quoteToCashRate * 100)}%`} hint={`${kpis.paidQuotations} paid`} />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SalesRevenueTrendChart rows={charts.revenueTrend} />
        <SalesPipelineFunnel rows={charts.pipeline} />
        <SalesTopCustomersPanel
          rowsByPaid={charts.topCustomersByPaid || charts.topCustomers || []}
          rowsByMeters={charts.topCustomersByMeters || []}
        />
        {canViewFinance ? <SalesReceivablesAgingChart buckets={charts.receivablesAging} /> : null}
        <SalesDemandMixPanel rows={charts.demandMix} bookedVsProduced={charts.bookedVsProduced} />
        <SalesAlertsPanel alerts={alerts} />
      </div>
    </div>
  );
}

