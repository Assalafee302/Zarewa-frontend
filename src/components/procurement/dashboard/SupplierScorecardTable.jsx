import React from 'react';
import { formatNgn } from '../../../Data/mockData';

export default function SupplierScorecardTable({ rows = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Top suppliers by spend</h4>
      <div className="z-scroll-x mt-2 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-ui-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-1 pr-3">Supplier</th>
              <th className="py-1 pr-3">Spend</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-2 text-slate-400">
                  No supplier spend records
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.supplierID} className="border-t border-slate-100">
                <td className="py-1.5 pr-3 font-semibold text-slate-700">{r.supplierName}</td>
                <td className="py-1.5 pr-3 font-bold tabular-nums text-zarewa-teal">{formatNgn(r.spendNgn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

