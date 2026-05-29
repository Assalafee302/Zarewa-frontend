import React from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchHrBeneficiaries } from '../../lib/hrExtended';
import { formatNgn } from '../../lib/hrFormat';

export default function MyProfileBenefits() {
  const [items, setItems] = React.useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrBeneficiaries(true);
    if (!ok || !data?.ok) {
      setItems([]);
      return { hasData: true };
    }
    setItems(data.beneficiaries || []);
    return { hasData: true };
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Allowances and benefits linked to your staff record.</p>
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white text-sm">
        {items.map((b) => (
          <li key={b.id} className="flex justify-between px-4 py-3">
            <span>
              <span className="font-semibold">{b.displayName}</span>
              <span className="text-slate-500"> · {b.beneficiaryType}</span>
            </span>
            <span>{formatNgn(b.monthlyAmountNgn)}/mo</span>
          </li>
        ))}
      </ul>
      {!loading && !items.length ? <p className="text-sm text-slate-500">No benefits on your file.</p> : null}
    </div>
  );
}
