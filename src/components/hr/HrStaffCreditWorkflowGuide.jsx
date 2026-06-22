import React from 'react';
import { HardHat } from 'lucide-react';

const STEPS = [
  { title: 'HR links staff', detail: 'Each employee gets a Sales customer account (bulk link or staff profile).' },
  { title: 'Sales raises quotation', detail: 'Quotation on the staff customer — balance due before delivery.' },
  { title: 'Request purchase credit', detail: 'Sales or staff submits credit terms; Managing Director must approve.' },
  { title: 'Payroll collects', detail: 'Approved credit covers the quote; repayment via monthly payroll deduction.' },
];

/** Short in-app guide for the staff loans & credit hub. */
export function HrStaffCreditWorkflowGuide() {
  return (
    <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/60 via-white to-slate-50/40 px-4 py-3">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#134e4a]">
        <HardHat size={14} aria-hidden />
        How purchase credit works
      </p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, idx) => (
          <li key={step.title} className="flex gap-2 text-xs text-slate-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#134e4a] text-[10px] font-black text-white">
              {idx + 1}
            </span>
            <span>
              <strong className="block text-slate-900">{step.title}</strong>
              {step.detail}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
