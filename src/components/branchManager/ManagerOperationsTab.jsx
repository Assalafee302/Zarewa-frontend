import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShieldAlert, Truck } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { CreditExceptionPanel } from '../finance/CreditExceptionPanel';
import { FinanceSequencePanel } from '../layout';
import { TEAM_HR_ATTENDANCE_PATH } from '../../lib/managerPageTabs';

function StockTable({ products }) {
  const rows = useMemo(() => {
    return (Array.isArray(products) ? products : [])
      .map((p) => {
        const qty = Number(p.quantity ?? p.qty ?? p.onHand ?? 0) || 0;
        const threshold = Number(p.lowStockThreshold ?? p.reorderLevel ?? 10) || 10;
        const tone = qty <= 0 ? 'rose' : qty <= threshold ? 'amber' : 'emerald';
        return {
          id: p.id || p.sku || p.name,
          name: p.name || p.sku || 'SKU',
          qty,
          threshold,
          tone,
        };
      })
      .sort((a, b) => a.qty - b.qty)
      .slice(0, 12);
  }, [products]);

  if (!rows.length) {
    return <p className="text-xs text-slate-500 py-4">No inventory rows in workspace scope.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-ui-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-3 font-bold">SKU</th>
            <th className="py-2 pr-3 font-bold text-right">On hand</th>
            <th className="py-2 font-bold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-50">
              <td className="py-2 pr-3 font-semibold text-slate-800">{r.name}</td>
              <td className="py-2 pr-3 text-right tabular-nums font-black">{r.qty}</td>
              <td className="py-2">
                <span
                  className={`inline-flex rounded-md border px-1.5 py-0.5 text-ui-xs font-black uppercase ${
                    r.tone === 'rose'
                      ? 'bg-rose-100 text-rose-900 border-rose-200'
                      : r.tone === 'amber'
                        ? 'bg-amber-100 text-amber-900 border-amber-200'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                  }`}
                >
                  {r.tone === 'rose' ? 'Out' : r.tone === 'amber' ? 'Low' : 'OK'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Branch Operations tab — stock, credit, material; attendance lives on My Team.
 */
export function ManagerOperationsTab({
  ws,
  showDeliveryCredit = false,
  materialCount = 0,
  attendancePendingCount = 0,
  onOpenMaterialQueue,
  onOpenStockRegister,
}) {
  const { products } = useInventory();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-zarewa-teal" aria-hidden />
              <h3 className="text-sm font-black text-zarewa-teal">Stock & inventory</h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-ui-xs font-bold uppercase text-slate-600 hover:border-zarewa-teal"
                onClick={() => onOpenStockRegister?.()}
              >
                Stock register
              </button>
              <Link
                to="/operations"
                state={{ focusOpsTab: 'inventory' }}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-ui-xs font-bold uppercase text-slate-600 no-underline hover:border-zarewa-teal"
              >
                Open ops
              </Link>
            </div>
          </div>
          <StockTable products={products} />
        </FinanceSequencePanel>

        <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={16} className="text-zarewa-teal" aria-hidden />
            <h3 className="text-sm font-black text-zarewa-teal">People & exceptions</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Daily attendance</p>
                <p className="text-ui-xs text-slate-500 mt-0.5">
                  {attendancePendingCount > 0
                    ? `${attendancePendingCount} staff not marked today`
                    : 'Roll lives on My Team'}
                </p>
              </div>
              <Link
                to={TEAM_HR_ATTENDANCE_PATH}
                className="shrink-0 rounded-xl bg-zarewa-teal px-3 py-2 text-ui-xs font-black uppercase text-white no-underline hover:brightness-105"
              >
                My Team
              </Link>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Material incidents</p>
                <p className="text-ui-xs text-slate-500 mt-0.5">
                  {materialCount > 0 ? `${materialCount} awaiting approval` : 'No open material exceptions'}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-ui-xs font-black uppercase text-slate-700 hover:border-zarewa-teal"
                onClick={() => onOpenMaterialQueue?.()}
              >
                Review
              </button>
            </div>
          </div>
        </FinanceSequencePanel>
      </div>

      {showDeliveryCredit ? (
        <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={16} className="text-zarewa-teal" aria-hidden />
            <h3 className="text-sm font-black text-zarewa-teal">Delivery credit exceptions</h3>
          </div>
          <CreditExceptionPanel
            branchId={ws?.workspaceBranchId || ws?.session?.branchId || null}
            roleKey={ws?.session?.user?.roleKey}
          />
        </FinanceSequencePanel>
      ) : null}
    </div>
  );
}
