import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, Banknote, ClipboardList, Landmark, Scale } from 'lucide-react';

/**
 * Quick links into legacy Finance / Treasury workspace (preferred operational layout).
 */
export function FinanceOperationalLinks({ className = '' }) {
  const links = [
    { to: '/accounts?tab=treasury', label: 'Treasury', icon: Landmark },
    { to: '/accounts?tab=receipts', label: 'Receipts', icon: Banknote },
    { to: '/accounts?tab=disbursements', label: 'Payments', icon: ClipboardList },
    { to: '/accounts?tab=movements', label: 'Movements', icon: ArrowRightLeft },
    { to: '/accounts?tab=audit', label: 'Audit & GL', icon: Scale },
  ];
  return (
    <div
      className={`flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 ${className}`}
    >
      <p className="w-full text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Operational finance (legacy workspace)
      </p>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.to}
            to={link.to}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase text-teal-900 hover:border-teal-300 hover:bg-teal-50/60"
          >
            <LinkIcon size={12} />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
