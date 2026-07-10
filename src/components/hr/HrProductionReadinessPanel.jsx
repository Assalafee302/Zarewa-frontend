import React from 'react';
import { Link } from 'react-router-dom';
import { HR_SETTINGS } from '../../lib/hrRoutes';
import { HrCard, HrEmptyState } from './hrPageUi';

const MODULE_LABELS = {
  core: 'Core HR',
  notifications: 'Notifications',
  recruiting: 'Recruiting',
  learning: 'Learning & development',
  engagement: 'Engagement surveys',
  phase6Benefits: 'Benefits & incidents',
  phase8Operational: 'Letter workflow & bulk import',
  phase9ExecutiveBenefits: 'Executive benefits & domestic staff',
  payrollControl: 'Payroll control',
  governance: 'Skills & grievances',
};

/**
 * @param {{ readiness?: { productionReady?: boolean; canCutover?: boolean; blockers?: string[]; gates?: object; modules?: Record<string, boolean> } | null }} props
 */
export function HrProductionReadinessPanel({ readiness }) {
  if (!readiness) return null;

  const blockers = (readiness.blockers || []).filter(Boolean);
  const gates = readiness.gates || {};
  const modules = readiness.modules || {};
  const ready = Boolean(readiness.productionReady);
  const canCutover = Boolean(readiness.canCutover);

  const gateRows = [
    { key: 'specialNodesPresent', label: 'Special org nodes mapped' },
    { key: 'cleanupPassDone', label: 'Data cleanup queue clear' },
    { key: 'qualityCoveragePct', label: 'Profile quality ≥ 85%', format: (v) => `${v ?? 0}%` },
    { key: 'sensitiveMaskingReady', label: 'Sensitive field masking ready' },
    { key: 'overdueRequests', label: 'No overdue HR requests', invert: true, format: (v) => String(v ?? 0) },
  ];

  return (
    <HrCard
      title="Production readiness"
      subtitle={
        canCutover
          ? 'Schema and UAT gates passed — ready for production cutover'
          : ready
            ? 'Schema ready — resolve UAT blockers before cutover'
            : 'HR module schema incomplete — run migrations'
      }
      actions={
        <Link
          to={`${HR_SETTINGS}?tab=module-health`}
          className="text-ui-xs font-bold uppercase text-zarewa-teal hover:underline"
        >
          Module health →
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-ui-xs font-black uppercase ${
            ready ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
          }`}
        >
          Schema {ready ? 'ready' : 'incomplete'}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-ui-xs font-black uppercase ${
            canCutover ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
          }`}
        >
          Cutover {canCutover ? 'approved' : 'blocked'}
        </span>
      </div>

      {blockers.length === 0 ? (
        <HrEmptyState title="No cutover blockers" description="Production readiness checks are clear for your scope." />
      ) : (
        <ul className="space-y-2">
          {blockers.map((b) => (
            <li key={b} className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-950">
              {b}
            </li>
          ))}
        </ul>
      )}

      {gates && Object.keys(gates).length ? (
        <div className="mt-4">
          <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400 mb-2">UAT gates</p>
          <ul className="space-y-1.5">
            {gateRows.map((g) => {
              const raw = gates[g.key];
              const pass = g.invert ? Number(raw || 0) === 0 : Boolean(raw);
              return (
                <li key={g.key} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                  <span>{g.label}</span>
                  <span className={`font-semibold ${pass ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {g.format ? g.format(raw) : pass ? 'Pass' : 'Fail'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!ready ? (
        <div className="mt-4">
          <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400 mb-2">Missing modules</p>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(modules)
              .filter(([key, ok]) => key !== 'allReady' && !ok)
              .map(([key]) => (
                <li
                  key={key}
                  className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-ui-xs font-bold text-red-800"
                >
                  {MODULE_LABELS[key] || key}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </HrCard>
  );
}

export default HrProductionReadinessPanel;
