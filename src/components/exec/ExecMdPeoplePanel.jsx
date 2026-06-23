import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export function ExecMdPeoplePanel({ payrollItems, payrollCount, readOnly, onReview, busy }) {
  const rows = Array.isArray(payrollItems) ? payrollItems : [];
  const count = payrollCount ?? rows.length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="h-1 bg-[#134e4a]" aria-hidden />
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
            <Users size={12} /> People
          </p>
          <h3 className="text-sm font-bold text-[#134e4a]">Payroll MD sign-off</h3>
        </div>
        <span className="rounded-md px-2 py-0.5 text-[10px] font-black tabular-nums ring-1 border-amber-200 bg-amber-50 text-amber-950">
          {busy && count == null ? '…' : count} awaiting
        </span>
      </div>
      <div className="px-4 py-3">
        {rows.length === 0 ? (
          <p className="text-[11px] text-slate-500">No payroll runs awaiting MD sign-off.</p>
        ) : (
          <ul className="space-y-2">
            {rows.slice(0, 5).map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">{row.title}</p>
                  <p className="text-[10px] text-slate-500">{row.ageLabel || row.status}</p>
                </div>
                {!readOnly && row.canAct !== false && onReview ? (
                  <button
                    type="button"
                    onClick={() => onReview(row)}
                    className="shrink-0 rounded-lg bg-[#134e4a] px-3 py-1.5 text-[9px] font-black uppercase text-white hover:brightness-105"
                  >
                    Sign off
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/executive-hr/payroll"
          className="mt-3 inline-block text-[10px] font-bold uppercase text-[#134e4a] hover:underline"
        >
          Open executive HR payroll
        </Link>
      </div>
    </section>
  );
}
