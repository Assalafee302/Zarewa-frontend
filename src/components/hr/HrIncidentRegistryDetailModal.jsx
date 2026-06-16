import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { fetchIncident } from '../../lib/hrIncidents';

import HrIncidentAuditPackPanel from './HrIncidentAuditPackPanel';

import HrIncidentDetailSections from './HrIncidentDetailSections';

import { HrFormModal } from './HrFormModal';

import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrFormStyles';



const KIND_LABELS = {

  hr_discipline: 'HR discipline',

  operational: 'Operational',

  material: 'Material',

  performance: 'Performance',

};



function resolveCaseId(registry, linkedEntities) {

  if (registry?.incidentKind === 'hr_discipline') return registry?.sourceId;

  const linked = Array.isArray(linkedEntities) ? linkedEntities : registry?.linkedEntities || [];

  return linked.find((e) => e.kind === 'hr_discipline_case')?.id || null;

}



export default function HrIncidentRegistryDetailModal({ registryId, onClose, onOpenCase }) {

  const [loading, setLoading] = useState(true);

  const [err, setErr] = useState('');

  const [registry, setRegistry] = useState(null);

  const [detail, setDetail] = useState(null);

  const [showRaw, setShowRaw] = useState(false);



  const load = useCallback(async () => {

    if (!registryId) return;

    setLoading(true);

    setErr('');

    const { ok, data } = await fetchIncident(registryId);

    setLoading(false);

    if (!ok || !data?.ok) {

      setErr(data?.error || 'Could not load incident.');

      setRegistry(null);

      setDetail(null);

      return;

    }

    setRegistry(data.registry || null);

    setDetail(data.detail || null);

  }, [registryId]);



  useEffect(() => {

    load();

  }, [load]);



  if (!registryId) return null;



  const caseId = resolveCaseId(registry, registry?.linkedEntities);

  const linked = Array.isArray(registry?.linkedEntities) ? registry.linkedEntities : [];

  const kind = registry?.incidentKind;

  const sourceId = registry?.sourceId;



  return (

    <HrFormModal isOpen={Boolean(registryId)} title={`Registry ${registryId}`} onClose={onClose} size="xl">

      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

        {loading ? <p className="text-sm text-slate-500">Loading incident…</p> : null}

        {err ? <p className="text-sm text-red-700">{err}</p> : null}



        {registry ? (

          <>

            <dl className="grid gap-2 sm:grid-cols-2 text-sm">

              <div><dt className="text-slate-500">Kind</dt><dd className="font-medium">{KIND_LABELS[registry.incidentKind] || registry.incidentKind}</dd></div>

              <div><dt className="text-slate-500">Status</dt><dd className="font-medium capitalize">{registry.status}</dd></div>

              <div><dt className="text-slate-500">Severity</dt><dd className="font-medium capitalize">{registry.severity || '—'}</dd></div>

              <div><dt className="text-slate-500">Branch</dt><dd className="font-medium">{registry.branchId || '—'}</dd></div>

              <div><dt className="text-slate-500">Type</dt><dd className="font-medium">{registry.incidentType?.replace(/_/g, ' ') || '—'}</dd></div>

              <div><dt className="text-slate-500">Source ID</dt><dd className="font-mono text-xs">{registry.sourceId || '—'}</dd></div>

              <div className="sm:col-span-2"><dt className="text-slate-500">Summary</dt><dd>{registry.summary || '—'}</dd></div>

              <div><dt className="text-slate-500">Created</dt><dd>{registry.createdAtIso?.slice(0, 16) || '—'}</dd></div>

              <div><dt className="text-slate-500">Updated</dt><dd>{registry.updatedAtIso?.slice(0, 16) || '—'}</dd></div>

            </dl>



            {linked.length ? (

              <div>

                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Linked entities</h4>

                <ul className="text-sm space-y-1">

                  {linked.map((e, i) => (

                    <li key={`${e.kind}-${e.id}-${i}`} className="rounded-lg bg-slate-50 px-3 py-2">

                      <span className="font-semibold text-slate-700">{e.kind}</span> — {e.label || e.id}

                    </li>

                  ))}

                </ul>

              </div>

            ) : null}



            {detail ? <HrIncidentDetailSections registry={registry} detail={detail} /> : null}



            <div className="flex flex-wrap gap-2">

              {caseId && onOpenCase ? (

                <button

                  type="button"

                  className={HR_BTN_PRIMARY}

                  onClick={() => {

                    onOpenCase(caseId);

                    onClose?.();

                  }}

                >

                  Open discipline case

                </button>

              ) : null}

              {kind === 'material' && sourceId ? (

                <Link

                  to="/operations"

                  state={{ focusOpsTab: 'materialExceptions', materialIncidentId: sourceId }}

                  className={HR_BTN_SECONDARY}

                  onClick={() => onClose?.()}

                >

                  Open material exception

                </Link>

              ) : null}

              {kind === 'performance' ? (

                <Link

                  to="/hr/discipline-exit?tab=accountability&view=performance"

                  className={HR_BTN_SECONDARY}

                  onClick={() => onClose?.()}

                >

                  View performance recognition

                </Link>

              ) : null}

              <button type="button" className={HR_BTN_SECONDARY} onClick={load} disabled={loading}>

                Refresh

              </button>

              {detail ? (

                <button type="button" className={HR_BTN_SECONDARY} onClick={() => setShowRaw((v) => !v)}>

                  {showRaw ? 'Hide raw JSON' : 'Show raw JSON'}

                </button>

              ) : null}

            </div>



            {showRaw && detail ? (

              <pre className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100">

                {JSON.stringify(detail, null, 2)}

              </pre>

            ) : null}



            <HrIncidentAuditPackPanel registryId={registryId} caseId={caseId} />

          </>

        ) : null}

      </div>

    </HrFormModal>

  );

}


