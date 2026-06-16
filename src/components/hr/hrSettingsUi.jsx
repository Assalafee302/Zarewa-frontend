import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { fetchOrgCatalogMeta } from '../../lib/hrCompensation';
import { fetchHrDepartments, fetchHrDesignations } from '../../lib/hrMasterData';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  HR_SETTINGS_MODULE_LINK_GROUPS,
  HR_SETTINGS_SCOPE,
  HR_SETTINGS_TAB_COPY,
} from '../../lib/hrSettingsUi';
import { HrCard } from './hrPageUi';

function SummaryMetric({ label, value, detail, tone = 'default', compactValue = false }) {
  const tones = {
    default: 'border-slate-100 bg-white',
    ok: 'border-emerald-100 bg-emerald-50/50',
    warn: 'border-amber-100 bg-amber-50/50',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone] || tones.default}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 font-bold tabular-nums text-slate-900 ${
          compactValue ? 'break-all font-mono text-xs leading-snug' : 'text-xl'
        }`}
      >
        {value}
      </p>
      {detail ? <p className="mt-0.5 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

export function HrOrgStructureSummary({ refreshKey = 0 }) {
  const ws = useWorkspace();
  const branches = (ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? []).length;
  const [stats, setStats] = React.useState(null);

  const { loading, error, reload } = useHrListLoad(async () => {
    const [deptRes, desRes, metaRes, matrixRes] = await Promise.all([
      fetchHrDepartments(true),
      fetchHrDesignations({ includeInactive: true }),
      fetchOrgCatalogMeta(),
      apiFetch('/api/hr/salary-matrix'),
    ]);

    const departments = deptRes.ok && deptRes.data?.ok ? deptRes.data.departments || [] : [];
    const designations = desRes.ok && desRes.data?.ok ? desRes.data.designations || [] : [];
    const catalog = metaRes.ok && metaRes.data?.ok ? metaRes.data.catalog : null;
    const matrixRows = matrixRes.ok && matrixRes.data?.ok ? (matrixRes.data.matrix || []).length : 0;

    const activeDepts = departments.filter((d) => d.active !== false).length;
    const activeDesigs = designations.filter((d) => d.active !== false).length;
    const expectedDepts = catalog?.departments ?? 0;
    const expectedDesigs = catalog?.designations ?? 0;

    let readiness = 'empty';
    if (activeDepts > 0) {
      readiness =
        expectedDepts && activeDepts >= expectedDepts && activeDesigs >= Math.min(expectedDesigs, 1)
          ? 'ready'
          : 'partial';
    }

    const next = {
      activeDepts,
      totalDepts: departments.length,
      activeDesigs,
      totalDesigs: designations.length,
      branches,
      matrixRows,
      expectedDepts,
      expectedDesigs,
      readiness,
    };
    setStats(next);
    return { hasData: true };
  }, [refreshKey, branches]);

  if (loading && !stats) {
    return <p className="text-sm text-slate-500">Loading organization summary…</p>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
        Could not load summary.
        <button type="button" className="ml-2 underline" onClick={reload}>
          Retry
        </button>
      </div>
    );
  }
  if (!stats) return null;

  const statusCopy = {
    empty: { label: 'Not set up', tone: 'warn', hint: 'Load the standard catalog or add departments manually.' },
    partial: { label: 'In progress', tone: 'warn', hint: 'Some master lists are below the standard catalog size.' },
    ready: { label: 'Catalog loaded', tone: 'ok', hint: 'Department and job title master data is in place.' },
  };
  const status = statusCopy[stats.readiness] || statusCopy.partial;

  return (
    <HrCard title="Structure at a glance" subtitle="Live counts from master data and salary matrix">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            status.tone === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {status.label}
        </span>
        <p className="text-xs text-slate-500">{status.hint}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric
          label="Departments"
          value={stats.activeDepts}
          detail={
            stats.expectedDepts
              ? `${stats.activeDepts} active · ${stats.expectedDepts} in standard catalog`
              : `${stats.totalDepts} total`
          }
          tone={stats.activeDepts > 0 ? 'ok' : 'warn'}
        />
        <SummaryMetric
          label="Job titles"
          value={stats.activeDesigs}
          detail={
            stats.expectedDesigs
              ? `${stats.activeDesigs} active · ${stats.expectedDesigs} in standard catalog`
              : `${stats.totalDesigs} total`
          }
          tone={stats.activeDesigs > 0 ? 'ok' : 'warn'}
        />
        <SummaryMetric label="Branch offices" value={stats.branches} detail="From workspace governance" />
        <SummaryMetric
          label="Salary matrix rows"
          value={stats.matrixRows}
          detail="Managed in Payroll → Salary matrix"
          tone={stats.matrixRows > 0 ? 'ok' : 'default'}
        />
      </div>
      <Link to="/hr/dashboard" className="mt-4 inline-flex text-xs font-semibold text-[#134e4a] hover:underline">
        Review data quality on HR dashboard →
      </Link>
    </HrCard>
  );
}

export function HrReferencesSummary() {
  const [stats, setStats] = React.useState(null);

  const { loading, error, reload } = useHrListLoad(async () => {
    const [letterRes, staffRes] = await Promise.all([
      apiFetch('/api/hr/settings/letter-references'),
      apiFetch('/api/hr/settings/staff-numbering'),
    ]);
    const letterCfg = letterRes.ok && letterRes.data?.ok ? letterRes.data.config || {} : {};
    const staffCfg = staffRes.ok && staffRes.data?.ok ? staffRes.data.config || {} : {};
    setStats({
      letterPrefix: letterCfg.prefix || 'ZAR/HR',
      lastLetter: letterCfg.lastIssuedReference || '—',
      letterReset: letterCfg.resetMode || 'yearly',
      staffFormat: staffCfg.format === 'prefixed' ? `Prefix ${staffCfg.prefix || '—'}` : 'Numeric',
      staffStart: staffCfg.startingNumber ?? 6,
      reserved: (staffCfg.reserved || []).length,
    });
    return { hasData: true };
  }, []);

  if (loading && !stats) return <p className="text-sm text-slate-500">Loading reference summary…</p>;
  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
        Could not load reference summary.
        <button type="button" className="ml-2 underline" onClick={reload}>
          Retry
        </button>
      </div>
    );
  }
  if (!stats) return null;

  return (
    <HrCard title="References at a glance" subtitle="Current letter and employee number configuration">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="Letter prefix" value={stats.letterPrefix} detail={`Resets ${stats.letterReset}`} />
        <SummaryMetric label="Last letter issued" value={stats.lastLetter} detail="Assigned on issue" compactValue />
        <SummaryMetric label="Employee number format" value={stats.staffFormat} detail={`Starts at ${stats.staffStart}`} />
        <SummaryMetric label="Reserved numbers" value={stats.reserved} detail="Executive slots held" />
      </div>
    </HrCard>
  );
}

export function HrSettingsTabIntro({ tabId }) {  const copy = HR_SETTINGS_TAB_COPY[tabId];
  if (!copy) return null;
  return (
    <div className="rounded-2xl border border-teal-100/80 bg-gradient-to-br from-teal-50/40 to-white px-4 py-4 sm:px-5">
      <h3 className="text-sm font-bold text-[#134e4a]">{copy.title}</h3>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">{copy.description}</p>
    </div>
  );
}

export function HrSettingsScopePanel() {
  return (
    <HrCard title={HR_SETTINGS_SCOPE.title} subtitle="HR administration vs operational modules">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Configured here</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {HR_SETTINGS_SCOPE.includes.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-emerald-600" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Managed elsewhere</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            {HR_SETTINGS_SCOPE.elsewhere.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-slate-400" aria-hidden>
                  →
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </HrCard>
  );
}

export function HrSettingsModuleLinks() {
  return (
    <HrCard title="Related modules" subtitle="Open the module where each workflow is run day to day">
      <div className="grid gap-5 lg:grid-cols-2">
        {HR_SETTINGS_MODULE_LINK_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</p>
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
              {group.links.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="group flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50/80"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#134e4a] group-hover:underline">
                        {item.label}
                      </span>
                      <span className="block text-xs text-slate-500">{item.hint}</span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-[#134e4a]" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </HrCard>
  );
}
