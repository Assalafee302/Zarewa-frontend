import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Factory } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { SURFACE, TEXT } from '../../lib/designTokens';
import { Button } from '../ui/button';
import { MACHINE_STATUS_LABELS, MACHINE_TYPE_LABELS } from '../../shared/maintenanceRegistry';
import { MachineDossierModal } from './MachineDossierModal';

function statusChipClass(status) {
  switch (String(status || 'active')) {
    case 'under_maintenance':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'decommissioned':
      return 'border-[var(--z-border)] bg-[var(--z-surface-muted)] text-[var(--z-text-muted)]';
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }
}

/**
 * Operations desk — view-only plant register. Branch Manager registers machines
 * on Expenses → Machines. Store reports faults from the strip above.
 */
export function OperationsMachinesPanel({ roleKey = '' }) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dossierId, setDossierId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const machRes = await apiFetch('/api/maintenance/machines').catch(() => ({ ok: false }));
    setLoading(false);
    if (!machRes.ok) {
      setError(machRes.data?.error || 'Could not load machines.');
      setMachines([]);
      return;
    }
    setMachines(Array.isArray(machRes.data?.machines) ? machRes.data.machines : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statusCounts = useMemo(() => {
    const n = { active: 0, under_maintenance: 0, decommissioned: 0 };
    for (const m of machines) {
      const s = String(m.status || 'active');
      if (n[s] != null) n[s] += 1;
      else n.active += 1;
    }
    return n;
  }, [machines]);

  return (
    <section className={`${SURFACE.card} flex flex-col overflow-hidden`}>
      <header className="shrink-0 border-b border-[var(--z-border-subtle)] bg-[var(--z-surface-muted)]/40 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 text-zarewa-teal">
              <Factory size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-tight text-[var(--z-text)]">Plant register</h3>
              <p className={`mt-0.5 leading-snug ${TEXT.label}`}>
                Click a name for history and next steps. Branch Manager adds machines on Expenses → Machines.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void load()}
            aria-label="Refresh machines"
            className="h-9 w-9 min-h-9 min-w-9"
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      </header>

      <div className="p-4 text-xs">
        {error ? (
          <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 font-semibold text-amber-950">
            {error}
          </p>
        ) : null}
        <p className={`mb-3 ${TEXT.label}`}>
          {statusCounts.active} running · {statusCounts.under_maintenance} under repair ·{' '}
          {statusCounts.decommissioned} decommissioned
        </p>
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading machines">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-[var(--z-surface-muted)]" />
            ))}
          </div>
        ) : machines.length === 0 ? (
          <div className={`${SURFACE.muted} px-4 py-8 text-center`}>
            <p className="text-sm font-semibold text-[var(--z-text)]">No machines registered yet</p>
            <p className={`mt-1 ${TEXT.label}`}>
              Ask Branch Manager to register a machine on Expenses → Machines before store can report a fault.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[var(--z-border)]">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[var(--z-surface-muted)] text-ui-xs uppercase tracking-wide text-[var(--z-text-muted)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Machine</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Line</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--z-border-subtle)]">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-left font-semibold text-zarewa-teal hover:underline"
                        onClick={() => setDossierId(m.id)}
                      >
                        {m.name}
                      </button>
                      <span className={`mt-0.5 block font-medium ${TEXT.micro}`}>
                        {m.machineCode || m.referenceNo || m.id}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[var(--z-text)]">
                      {MACHINE_TYPE_LABELS[m.machineType] || m.machineType || '—'}
                    </td>
                    <td className="px-3 py-2 text-[var(--z-text-muted)]">{m.lineName || '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-sm border px-1.5 py-0.5 text-ui-xs font-semibold ${statusChipClass(
                          m.status
                        )}`}
                      >
                        {MACHINE_STATUS_LABELS[m.status] || String(m.status || 'active').replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MachineDossierModal
        machineId={dossierId}
        onClose={() => setDossierId('')}
        roleKey={roleKey}
      />
    </section>
  );
}
