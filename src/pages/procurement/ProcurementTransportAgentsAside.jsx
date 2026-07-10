import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, Pencil, Trash2 } from 'lucide-react';
import { CARD_ROW } from './procurementTabShared.js';
import { PoStatusChip } from '../../components/procurement/PoStatusChip';

export function ProcurementTransportAgentsAside({ agents, onEdit, onRemove, onRegister, transitRows, onPreviewTransitPo }) {
  return (
    <aside className="w-full lg:w-1/3 lg:max-w-md lg:shrink-0 rounded-xl border border-slate-200/90 bg-white shadow-sm flex flex-col max-h-[min(72vh,680px)] min-h-[240px]">
      <div className="h-1 bg-zarewa-teal rounded-t-xl shrink-0" />
      <div className="px-4 py-3 border-b border-slate-100 shrink-0">
        <h3 className="text-ui-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <Truck size={16} className="text-zarewa-teal" />
          Transport agents
        </h3>
        <p className="text-ui-xs text-slate-500 mt-1 leading-snug">
          Haulage partners. Click a name for the full profile (like a supplier). Use the list below for loads on the road.
        </p>
        <button
          type="button"
          onClick={onRegister}
          className="mt-2 w-full rounded-lg border border-dashed border-zarewa-teal/40 bg-zarewa-teal/[0.04] py-2 text-ui-xs font-semibold uppercase tracking-wide text-zarewa-teal hover:bg-zarewa-teal/10"
        >
          Register transport agent
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 py-2">
        {agents.length === 0 ? (
          <p className="text-ui-xs text-slate-500 text-center py-6 px-2 leading-relaxed">
            No agents yet. Register one here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {agents.map((a) => (
              <li key={a.id} className={`${CARD_ROW} flex items-start justify-between gap-2`}>
                <div className="min-w-0 leading-tight flex-1">
                  <p className="text-ui-xs font-mono text-slate-500 truncate">{a.id}</p>
                  <Link
                    to={`/procurement/transport-agents/${encodeURIComponent(a.id)}`}
                    className="block text-xs font-bold text-zarewa-teal truncate hover:underline"
                  >
                    {a.name}
                  </Link>
                  <p
                    className="text-ui-xs text-slate-500 mt-0.5 truncate"
                    title={`${a.region} · ${a.phone}`}
                  >
                    {a.region} · {a.phone}
                  </p>
                </div>
                <div className="flex items-center gap-0 shrink-0">
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => onEdit(a)}
                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-zarewa-teal"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => void onRemove(a)}
                    className="p-1.5 rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {transitRows && transitRows.length > 0 ? (
        <div className="border-t border-slate-200/90 bg-slate-50/50 shrink-0">
          <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-500 px-3 pt-2.5 pb-1">
            On loading / in transit
          </p>
          <ul className="max-h-36 overflow-y-auto custom-scrollbar px-3 pb-2 space-y-1">
            {transitRows.map((p) => {
              const meta2 = [
                p.transportAgentName ? `Agent ${p.transportAgentName}` : null,
                p.transportReference ? `Ref ${p.transportReference}` : null,
                p.transportNote,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={p.poID}>
                  <button
                    type="button"
                    onClick={() => onPreviewTransitPo?.(p.poID)}
                    className={`w-full text-left ${CARD_ROW} !py-1.5 cursor-pointer`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 leading-tight flex-1">
                        <p className="text-ui-xs font-bold text-zarewa-teal truncate">
                          <span className="font-mono">{p.poID}</span>
                          <span className="font-medium text-slate-600"> · {p.supplierName}</span>
                        </p>
                        <p
                          className="text-ui-xs text-slate-500 mt-0.5 leading-snug line-clamp-2"
                          title={meta2}
                        >
                          {meta2 || '—'}
                        </p>
                      </div>
                      <PoStatusChip status={p.status} className="shrink-0" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
