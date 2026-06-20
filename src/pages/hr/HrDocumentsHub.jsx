import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { hrTabPath, HR_DOCUMENTS } from '../../lib/hrRoutes';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import HrLetters from './HrLetters';
import HrReports from './HrReports';

const HrIdCards = lazyWithRetry(() => import('./HrIdCards'), { id: 'HrIdCards' });

const TABS = [
  { id: 'letters', label: 'Letters' },
  { id: 'id-cards', label: 'ID cards' },
  { id: 'documents', label: 'Employee documents' },
  { id: 'policies', label: 'Policy acknowledgements' },
  { id: 'reports', label: 'Reports hub' },
];

export default function HrDocumentsHub() {
  const { tab, setTab } = useHrUrlTab('letters', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="Documents, letters & reports"
      description="Employment letters, ID cards, document compliance, policy acknowledgements, and HR report exports."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'letters' ? <HrLetters embedded /> : null}
      {tab === 'id-cards' ? (
        <Suspense fallback={<p className="text-sm text-slate-600">Loading ID cards…</p>}>
          <HrIdCards />
        </Suspense>
      ) : null}
      {tab === 'documents' ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm text-slate-600">
            Organisation-wide document compliance is available via the Document Expiry report.
          </p>
          <Link
            to={hrTabPath(HR_DOCUMENTS, 'reports')}
            className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-[#134e4a] hover:bg-slate-50"
            onClick={() => {
              sessionStorage.setItem('hrReportPreselect', 'document-expiry');
            }}
          >
            Open document expiry report →
          </Link>
        </div>
      ) : null}
      {tab === 'policies' ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm text-slate-600">
            Handbook, confidentiality pledge, and policy acknowledgement status across staff.
          </p>
          <Link
            to={hrTabPath(HR_DOCUMENTS, 'reports')}
            className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-[#134e4a] hover:bg-slate-50"
            onClick={() => {
              sessionStorage.setItem('hrReportPreselect', 'policy-acknowledgement');
            }}
          >
            Open policy acknowledgement report →
          </Link>
        </div>
      ) : null}
      {tab === 'reports' ? <HrReports embedded /> : null}
    </HrTabbedPage>
  );
}
