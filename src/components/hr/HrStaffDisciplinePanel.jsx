import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDisciplineCasesForUser } from '../../lib/hrStaffExtras';
import { HR_DISCIPLINE_EXIT } from '../../lib/hrRoutes';
import { HrCard } from './hrPageUi';
import { HrStaffDisciplineCaseDrawer } from './HrStaffDisciplineCaseDrawer';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

export function HrStaffDisciplinePanel({ userId, profileEvents = [] }) {
  const [cases, setCases] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewCase, setPreviewCase] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { ok, data } = await fetchDisciplineCasesForUser(userId);
      if (cancelled) return;
      setLoading(false);
      if (!ok || !data?.ok) {
        setCases([]);
        setError(data?.error || 'Could not load discipline cases.');
        return;
      }
      setCases(data.cases || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const openCases = (cases || []).filter((c) => !['closed', 'cancelled'].includes(String(c.status)));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-700">
        <p>
          Full case workflow:{' '}
          <Link to={HR_DISCIPLINE_EXIT} className="font-bold text-zarewa-teal underline">
            HR → Staff cases & exit
          </Link>
        </p>
      </div>

      {loading ? <p className="text-sm text-slate-600">Loading discipline cases…</p> : null}
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <HrCard title="Open cases" subtitle={`${openCases.length} active case(s) for this employee`}>
        {!loading && !openCases.length ? (
          <p className="text-sm text-slate-600">No open discipline cases.</p>
        ) : (
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTh>Case</AppTableTh>
                <AppTableTh>Type</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                <AppTableTh>Opened</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {openCases.map((c) => (
                  <AppTableTr key={c.id}>
                    <AppTableTd>
                      <button
                        type="button"
                        onClick={() => setPreviewCase(c)}
                        className="font-semibold text-zarewa-teal hover:underline"
                      >
                        {c.caseNumber || c.id}
                      </button>
                    </AppTableTd>
                    <AppTableTd>{c.caseType?.replace(/_/g, ' ') || '—'}</AppTableTd>
                    <AppTableTd>{c.status?.replace(/_/g, ' ') || '—'}</AppTableTd>
                    <AppTableTd>{c.openedAtIso?.slice(0, 10) || '—'}</AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        )}
      </HrCard>

      <HrStaffDisciplineCaseDrawer
        caseItem={previewCase}
        isOpen={Boolean(previewCase)}
        onClose={() => setPreviewCase(null)}
      />

      {profileEvents?.length ? (
        <HrCard title="Profile disciplinary notes" subtitle="Recorded on employee file">
          <ul className="space-y-2 text-sm">
            {profileEvents.map((e) => (
              <li key={e.id || e.createdAtIso} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="font-medium text-slate-800">{e.summary || e.kind || 'Event'}</p>
                <p className="text-ui-xs text-slate-500">{e.createdAtIso?.slice(0, 16).replace('T', ' ') || ''}</p>
              </li>
            ))}
          </ul>
        </HrCard>
      ) : null}
    </div>
  );
}
