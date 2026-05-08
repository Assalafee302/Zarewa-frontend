import React from 'react';

export default function ProcurementDashboardFilters({
  filters,
  onChange,
  branchOptions = [],
  supplierOptions = [],
  transporterOptions = [],
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        <label className="text-[10px]">
          <span className="mb-1 block font-bold uppercase tracking-wide text-slate-500">From</span>
          <input type="date" value={filters.from} onChange={(e) => onChange({ from: e.target.value })} className="z-input !py-1.5 !text-[11px]" />
        </label>
        <label className="text-[10px]">
          <span className="mb-1 block font-bold uppercase tracking-wide text-slate-500">To</span>
          <input type="date" value={filters.to} onChange={(e) => onChange({ to: e.target.value })} className="z-input !py-1.5 !text-[11px]" />
        </label>
        <label className="text-[10px]">
          <span className="mb-1 block font-bold uppercase tracking-wide text-slate-500">Branch</span>
          <select value={filters.branchId} onChange={(e) => onChange({ branchId: e.target.value })} className="z-input !py-1.5 !text-[11px]">
            <option value="all">All</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || b.code || b.id}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px]">
          <span className="mb-1 block font-bold uppercase tracking-wide text-slate-500">Supplier</span>
          <select value={filters.supplierId} onChange={(e) => onChange({ supplierId: e.target.value })} className="z-input !py-1.5 !text-[11px]">
            <option value="all">All</option>
            {supplierOptions.map((s) => (
              <option key={s.supplierID} value={s.supplierID}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px]">
          <span className="mb-1 block font-bold uppercase tracking-wide text-slate-500">Class</span>
          <select value={filters.materialClass} onChange={(e) => onChange({ materialClass: e.target.value })} className="z-input !py-1.5 !text-[11px]">
            <option value="all">All</option>
            <option value="coil">Coil</option>
            <option value="stone">Stone</option>
            <option value="accessory">Accessory</option>
          </select>
        </label>
        <label className="text-[10px]">
          <span className="mb-1 block font-bold uppercase tracking-wide text-slate-500">Colour</span>
          <input value={filters.colour} onChange={(e) => onChange({ colour: e.target.value })} className="z-input !py-1.5 !text-[11px]" placeholder="Any" />
        </label>
        <label className="text-[10px]">
          <span className="mb-1 block font-bold uppercase tracking-wide text-slate-500">Gauge</span>
          <input value={filters.gauge} onChange={(e) => onChange({ gauge: e.target.value })} className="z-input !py-1.5 !text-[11px]" placeholder="Any" />
        </label>
        <label className="text-[10px]">
          <span className="mb-1 block font-bold uppercase tracking-wide text-slate-500">Transport</span>
          <select value={filters.transportAgentId} onChange={(e) => onChange({ transportAgentId: e.target.value })} className="z-input !py-1.5 !text-[11px]">
            <option value="all">All</option>
            {transporterOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

