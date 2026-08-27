import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Users,
  ShoppingCart,
  Package,
  Factory,
  Truck,
  Landmark,
  BarChart3,
  LifeBuoy,
  Library,
} from 'lucide-react';
import { ZareIntelligencePanel } from './ZareIntelligencePanel';
import { KnowledgeCenterPanel } from './KnowledgeCenterPanel';
import { WORKSPACE_GUIDE_ENTRIES } from '../../lib/departmentWorkspace';
import { trainingGuideForRole } from '../../lib/roleTrainingGuide';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PageTabs } from '../layout';

const DEPT_GUIDE_ICONS = {
  customer: Users,
  sales: ShoppingCart,
  inventory: Package,
  production: Factory,
  purchase: Truck,
  finance: Landmark,
  reports: BarChart3,
  it: LifeBuoy,
};

const DEPARTMENT_GUIDE = WORKSPACE_GUIDE_ENTRIES.map((e) => ({
  ...e,
  icon: DEPT_GUIDE_ICONS[e.id] || Users,
}));

const HELP_SECTIONS = {
  guide: 'guide',
  intelligence: 'intelligence',
  knowledge: 'knowledge',
};

/** Merged Help tab: role guide + optional Zare intelligence / knowledge CMS. */
export default function HelpSettingsPanel({ showIntelligence = false }) {
  const ws = useWorkspace();
  const currentUser = ws?.session?.user;
  const [searchParams, setSearchParams] = useSearchParams();

  const section = useMemo(() => {
    const raw = String(searchParams.get('section') || 'guide').toLowerCase();
    if (raw === 'intelligence' || raw === 'zare-intelligence') return HELP_SECTIONS.intelligence;
    if (raw === 'knowledge' || raw === 'knowledge-center') return HELP_SECTIONS.knowledge;
    return HELP_SECTIONS.guide;
  }, [searchParams]);

  const tabs = useMemo(() => {
    const list = [{ id: HELP_SECTIONS.guide, label: 'Guide', icon: <BookOpen size={14} /> }];
    if (showIntelligence) {
      list.push(
        { id: HELP_SECTIONS.intelligence, label: 'Intelligence', icon: <LifeBuoy size={14} /> },
        { id: HELP_SECTIONS.knowledge, label: 'Knowledge', icon: <Library size={14} /> }
      );
    }
    return list;
  }, [showIntelligence]);

  const activeSection =
    showIntelligence || section === HELP_SECTIONS.guide ? section : HELP_SECTIONS.guide;

  return (
    <div className="space-y-5">
      {tabs.length > 1 ? (
        <PageTabs
          tabs={tabs}
          value={activeSection}
          onChange={(id) => setSearchParams({ section: id }, { replace: true })}
          ariaLabel="Help section"
        />
      ) : null}

      {activeSection === HELP_SECTIONS.intelligence && showIntelligence ? (
        <ZareIntelligencePanel />
      ) : null}

      {activeSection === HELP_SECTIONS.knowledge && showIntelligence ? (
        <KnowledgeCenterPanel />
      ) : null}

      {activeSection === HELP_SECTIONS.guide ? (
        <section>
          <div className="mb-6 rounded-md border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-ui-xs font-medium text-slate-500">Your role tour</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {trainingGuideForRole(currentUser?.roleKey).title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Replay the step-by-step guide for your role ({currentUser?.roleLabel || currentUser?.roleKey}).
                  On any screen, open <strong>Chat</strong> and message <strong>Zare</strong> for page coaching.
                </p>
              </div>
              <button
                type="button"
                onClick={() => ws?.openRoleTrainingReplay?.()}
                className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-zarewa-teal px-4 py-2.5 text-xs font-medium text-white hover:bg-teal-900"
              >
                <BookOpen size={14} aria-hidden />
                Replay my role tour
              </button>
            </div>
          </div>
          <h3 className="z-section-title mb-2">Team roles</h3>
          <p className="mb-6 text-xs leading-relaxed text-gray-500">
            Each card describes part of the workflow. Access is controlled by role and permissions on each login.
          </p>
          <div className="space-y-4">
            {DEPARTMENT_GUIDE.map((d) => {
              const Icon = d.icon;
              return (
                <details
                  key={d.id}
                  className="group rounded-md border border-slate-200 bg-white open:shadow-none"
                >
                  <summary className="flex cursor-pointer list-none items-start gap-3 p-5 [&::-webkit-details-marker]:hidden">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 text-slate-700">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">{d.title}</span>
                        <ChevronRight
                          className="shrink-0 text-gray-300 transition-transform group-open:rotate-90"
                          size={18}
                        />
                      </span>
                      <span className="mt-1 block text-xs font-medium leading-relaxed text-gray-600">
                        {d.primary}
                      </span>
                    </span>
                  </summary>
                  <div className="border-t border-gray-100 px-5 pb-5 pt-0">
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-gray-600">
                      {d.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {d.links.map((l, li) => (
                        <Link
                          key={`${l.to}-${l.label}-${li}`}
                          to={l.to}
                          state={l.state}
                          className="inline-flex items-center gap-1 rounded-sm border border-slate-200 bg-white px-3 py-2 text-ui-xs font-medium text-slate-800 hover:bg-slate-50"
                        >
                          {l.label}
                          <ChevronRight size={12} />
                        </Link>
                      ))}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
