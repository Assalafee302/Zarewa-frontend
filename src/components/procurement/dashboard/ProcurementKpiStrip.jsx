import React from 'react';
import { formatNgn } from '../../../Data/mockData';

function KpiCard({ label, value, money = false }) {
  return (
    <div className="min-w-[9.5rem] rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black tabular-nums text-zarewa-teal">{money ? formatNgn(Number(value) || 0) : value}</p>
    </div>
  );
}

export default function ProcurementKpiStrip({ kpis }) {
  const rows = [
    { label: 'Purchases (period)', value: kpis.totalPurchasesMonthNgn, money: true },
    { label: 'Purchases (year)', value: kpis.totalPurchasesYearNgn, money: true },
    { label: 'Pending PO', value: kpis.pendingPoCount },
    { label: 'Approved PO', value: kpis.approvedPoCount },
    { label: 'Outstanding payables', value: kpis.outstandingSupplierPaymentsNgn, money: true },
    { label: 'Active suppliers', value: kpis.activeSuppliers },
    { label: 'Inventory value', value: kpis.inventoryValueNgn, money: true },
    { label: 'Low stock items', value: kpis.lowStockItemsCount },
    { label: 'Stock-out', value: kpis.stockOutIncidents },
    { label: 'In transit', value: kpis.goodsInTransitCount },
    { label: 'PO today', value: kpis.posCreatedToday },
    { label: 'Delivered', value: kpis.posDelivered },
  ];
  return (
    <div className="z-scroll-x overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-50/60 p-2">
      <div className="flex w-max gap-2">
        {rows.map((r) => (
          <KpiCard key={r.label} label={r.label} value={r.value ?? 0} money={r.money} />
        ))}
      </div>
    </div>
  );
}

