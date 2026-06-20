import React, { Suspense } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrReportEmbedPanel } from '../../components/hr/HrReportEmbedPanel';
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

const HUB_PROMPTS = {
  letters: 'Explain how to issue employment letters and what approvals are required.',
  'id-cards': 'Summarize ID card requests and what HR should verify before printing.',
  documents: 'Summarize document expiry and compliance gaps across staff.',
  policies: 'Explain policy acknowledgement status and who still needs to sign.',
  reports: 'Which HR reports should I run first for compliance this month?',
};

export default function HrDocumentsHub() {
  const { tab, setTab } = useHrUrlTab('letters', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="Documents, letters & reports"
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
      hub="documents"
      hubPrompt={HUB_PROMPTS[tab] || HUB_PROMPTS.reports}
      hubPageContext={{ documentsTab: tab }}
    >
      {tab === 'letters' ? <HrLetters embedded /> : null}
      {tab === 'id-cards' ? (
        <Suspense fallback={<p className="text-sm text-slate-600">Loading ID cards…</p>}>
          <HrIdCards />
        </Suspense>
      ) : null}
      {tab === 'documents' ? (
        <HrReportEmbedPanel reportId="document-expiry" />
      ) : null}
      {tab === 'policies' ? (
        <HrReportEmbedPanel reportId="policy-acknowledgement" />
      ) : null}
      {tab === 'reports' ? <HrReports embedded /> : null}
    </HrTabbedPage>
  );
}
