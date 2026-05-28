import React from 'react';
import { Construction } from 'lucide-react';

/**
 * Section placeholder until Phase 3+ builds full screens.
 */
export default function HrPlaceholder({ section, detail }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
      <Construction size={32} className="mx-auto text-slate-300" aria-hidden />
      <h2 className="mt-4 text-lg font-black text-[#134e4a]">{section}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600 leading-relaxed">
        {detail ||
          'This area is wired into navigation and permissions. Detailed workflows, tables, and forms arrive in the next HR build phase.'}
      </p>
    </div>
  );
}
