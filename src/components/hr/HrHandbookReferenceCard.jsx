import React, { useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { HrCard } from './hrPageUi';

/** Read-only handbook alignment (probation, transfer tenure). */
export function HrHandbookReferenceCard() {
  const [reference, setReference] = useState(null);
  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/policy-reference');
    if (ok && data?.ok) setReference(data.reference || null);
    return { hasData: true };
  }, []);

  if (!reference) return null;
  return (
    <HrCard title="Handbook reference" subtitle="Fixed policy rules — edit leave day counts above">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">Probation</p>
          <p className="font-semibold text-slate-800">{reference.probationMonthsDefault} months default</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">Branch transfer</p>
          <p className="font-semibold text-slate-800">{reference.transferMinYearsBranch} years minimum</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">Internal rotation</p>
          <p className="font-semibold text-slate-800">{reference.transferMinYearsInternal} years minimum</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">Leave bands</p>
          <p className="text-xs text-slate-700">{reference.leaveBands?.junior}</p>
          <p className="text-xs text-slate-700">{reference.leaveBands?.senior}</p>
        </div>
      </div>
    </HrCard>
  );
}
