import React from 'react';
import { Button } from '../ui/button';
import { HrButton } from '../hr/hrPageUi';
import { Input, Textarea, Select, FieldLabel } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { PageLoader, InlineLoader } from '../ui/PageLoader';
import { StatusBadge, SalesStatusChip } from '../ui/StatusBadge';
import { Breadcrumbs } from '../layout/Breadcrumbs';
import { PageTabs } from '../layout/PageTabs';
import { PoStatusChip } from '../procurement/PoStatusChip';
import { HrStatusBadge } from '../hr/HrStatusBadge';
import { CustomerStatusChip, CustomerTierChip } from '../customers/CustomerStatusChip';
import { quoteApprovalChipClass, refundStatusChipClass } from '../../lib/salesStatusUi';
import { RADIUS, TEXT, THEME } from '../../lib/designTokens';

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-black text-zarewa-teal mb-4">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Internal reference gallery for Zarewa UI primitives (Settings → Design system).
 */
export default function DesignSystemPanel() {
  const [tab, setTab] = React.useState('overview');

  return (
    <div className="space-y-6 max-w-4xl">
      <p className="text-sm text-slate-600 leading-relaxed">
        Living reference for buttons, badges, forms, loaders, and layout patterns used across the ERP.
        Prefer these components over one-off class strings in new code.
      </p>

      <Breadcrumbs
        items={[
          { label: 'Settings', to: '/settings/profile' },
          { label: 'Design system' },
        ]}
      />

      <PageTabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'actions', label: 'Actions' },
          { id: 'data', label: 'Data display' },
          { id: 'feedback', label: 'Feedback' },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Design system sections"
      />

      {tab === 'overview' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Typography">
            <p className={TEXT.pageTitle}>Page title</p>
            <p className={`${TEXT.pageSubtitle} mt-2`}>Page subtitle — supporting copy for module context.</p>
            <p className={`${TEXT.label} mt-4`}>Field label</p>
            <p className={`${TEXT.body} mt-2`}>Body text for descriptions and helper copy.</p>
          </Section>
          <Section title="Radius tokens">
            <div className="flex flex-wrap gap-3">
              {Object.entries(RADIUS).map(([key, cls]) => (
                <div key={key} className={`${cls} border border-slate-200 bg-slate-50 px-4 py-3 text-ui-xs font-bold text-slate-600`}>
                  {key}
                </div>
              ))}
            </div>
          </Section>
          <Section title="Theme tokens (CSS variables)">
            <p className="text-xs text-slate-500 mb-3">
              Semantic surfaces for future dark mode. System dark preference is wired via{' '}
              <code className="rounded bg-slate-100 px-1">prefers-color-scheme</code>; add class{' '}
              <code className="rounded bg-slate-100 px-1">.dark</code> on <code className="rounded bg-slate-100 px-1">html</code>{' '}
              for manual toggle later.
            </p>
            <div className={`${THEME.surface} ${THEME.border} border rounded-2xl p-4 space-y-2`}>
              <p className={`${THEME.text} text-sm font-bold`}>Surface text</p>
              <p className={`${THEME.textMuted} text-xs`}>Muted supporting copy</p>
              <p className={`${THEME.accent} text-xs font-bold`}>Accent label</p>
            </div>
          </Section>
        </div>
      ) : null}

      {tab === 'actions' ? (
        <div className="space-y-4">
          <Section title="Button (default kit)">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
          </Section>
          <Section title="HR buttons">
            <div className="flex flex-wrap gap-2">
              <HrButton>Primary</HrButton>
              <HrButton variant="secondary">Secondary</HrButton>
            </div>
          </Section>
          <Section title="Form fields">
            <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
              <div>
                <FieldLabel htmlFor="ds-input">Customer name</FieldLabel>
                <Input id="ds-input" placeholder="Acme Ltd" />
              </div>
              <div>
                <FieldLabel htmlFor="ds-select">Payment terms</FieldLabel>
                <Select id="ds-select" defaultValue="30">
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="ds-notes">Notes</FieldLabel>
                <Textarea id="ds-notes" rows={2} placeholder="Optional notes…" />
              </div>
            </div>
          </Section>
        </div>
      ) : null}

      {tab === 'data' ? (
        <div className="space-y-4">
          <Section title="Status badges">
            <div className="flex flex-wrap gap-2">
              <StatusBadge label="Success" tone="success" />
              <StatusBadge label="Warning" tone="warn" />
              <StatusBadge label="Danger" tone="danger" />
              <StatusBadge label="Info" tone="info" />
              <StatusBadge label="Neutral" tone="neutral" />
            </div>
          </Section>
          <Section title="Sales chips">
            <div className="flex flex-wrap gap-2">
              <SalesStatusChip label="Approved" chipClass={quoteApprovalChipClass('Approved')} />
              <SalesStatusChip label="Pending" chipClass={quoteApprovalChipClass('Pending')} />
              <SalesStatusChip label="Paid" chipClass={refundStatusChipClass('Paid')} />
            </div>
          </Section>
          <Section title="Procurement PO status">
            <div className="flex flex-wrap gap-2">
              {['Pending', 'Approved', 'In Transit', 'On loading', 'Received', 'Rejected'].map((s) => (
                <PoStatusChip key={s} status={s} />
              ))}
            </div>
          </Section>
          <Section title="Customer chips">
            <div className="flex flex-wrap gap-2">
              <CustomerStatusChip status="active" />
              <CustomerStatusChip status="inactive" />
              <CustomerTierChip tier="vip" />
              <CustomerTierChip tier="wholesale" />
              <CustomerTierChip tier="staff" />
            </div>
          </Section>
          <Section title="HR status badges">
            <div className="flex flex-wrap gap-2">
              <HrStatusBadge status="hr_review" variant="request" />
              <HrStatusBadge status="approved" variant="request" />
              <HrStatusBadge status="ready" variant="idCard" />
              <HrStatusBadge status="verified" variant="documentVerify" />
              <HrStatusBadge status="paid" variant="benefit" />
            </div>
          </Section>
        </div>
      ) : null}

      {tab === 'feedback' ? (
        <div className="space-y-4">
          <Section title="Loaders">
            <InlineLoader message="Loading section…" className="py-4" />
            <PageLoader message="Loading page…" className="min-h-[20vh]" />
          </Section>
          <Section title="Empty state">
            <EmptyState
              title="No records yet"
              description="Create your first entry to see it listed here."
              actionLabel="Create record"
              onAction={() => {}}
            />
          </Section>
        </div>
      ) : null}
    </div>
  );
}
