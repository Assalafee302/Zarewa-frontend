import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

/**
 * AP3a report entry cards (readiness only).
 * @param {{ mayView?: boolean }} props
 */
export function Ap3ReportsSection({ mayView = false }) {
  if (!mayView) return null;

  const cards = [
    {
      id: 'costing-readiness',
      title: 'Costing Readiness Report',
      desc: 'Production metres, coil consumption, and data gaps before AP3b.',
    },
    {
      id: 'material-cost-ap3b',
      title: 'Material Cost per Metre (AP3b)',
      desc: 'Trusted material ₦/m from coil consumption by branch and product family.',
    },
    {
      id: 'material-cost-draft',
      title: 'Material Cost per Metre Draft',
      desc: 'Readiness draft — use AP3b for trusted totals when coil costs are complete.',
    },
    {
      id: 'missing-coil-cost',
      title: 'Missing Coil Cost Report',
      desc: 'Jobs and coils without unit or landed cost.',
    },
    {
      id: 'expense-classification',
      title: 'Production Expense Classification',
      desc: 'Labour, diesel, overhead buckets from expense categories.',
    },
    {
      id: 'diesel-labour-readiness',
      title: 'Diesel / Labour Readiness',
      desc: 'Branch-tagged fuel and payroll mappability for allocation.',
    },
  ];

  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-black text-[#134e4a]">AP3 — Costing (readiness)</p>
        <p className="text-xs font-medium text-slate-600">
          Readiness only — not final cost per metre. See Reports for costing diagnostics.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.id}
            to="/reports"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-300 transition"
          >
            <div className="flex items-start gap-2">
              <BarChart3 className="text-teal-700 shrink-0" size={18} />
              <div>
                <p className="text-sm font-black text-[#134e4a]">{c.title}</p>
                <p className="text-xs text-slate-600 mt-1">{c.desc}</p>
                <span className="inline-block mt-2 text-[10px] font-bold uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                  Draft
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
