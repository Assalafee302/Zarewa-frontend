import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Database,
  Scale,
  BookOpen,
  SlidersHorizontal,
  ChevronRight,
  BadgeDollarSign,
  User,
  ClipboardCheck,
} from 'lucide-react';
import { canViewHrSettings } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';

/**
 * Admin Settings landing — section cards + related admin desks.
 * Personal account lives under /me; this hub only links there.
 */
export default function SettingsOverviewPanel({
  showTeamTab = false,
  showOrganization = false,
  showHelpIntelligence = false,
  showSystemTab = false,
  showAdminDataReset = false,
}) {
  const ws = useWorkspace();
  const permissions = ws?.permissions ?? [];
  const showHrSettings = canViewHrSettings(permissions);
  const showPricing =
    Boolean(ws?.hasPermission?.('pricing.manage')) ||
    Boolean(ws?.hasPermission?.('pricing.policy.manage')) ||
    Boolean(ws?.hasPermission?.('md.price_exception.approve')) ||
    Boolean(ws?.hasPermission?.('*')) ||
    Boolean(ws?.canAccessModule?.('procurement')) ||
    Boolean(ws?.canAccessModule?.('sales'));
  const showEditApprovals =
    Boolean(ws?.hasPermission?.('dashboard.view')) || Boolean(ws?.hasPermission?.('*'));

  const sectionCards = useMemo(() => {
    const cards = [];
    if (showTeamTab) {
      cards.push({
        id: 'team',
        to: '/settings/team',
        title: 'Team',
        description: 'Logins, roles, sessions, and permission overrides.',
        icon: Users,
      });
    }
    if (showOrganization) {
      cards.push({
        id: 'organization',
        to: '/settings/organization',
        title: 'Organization',
        description: 'Company manager targets and store restock minimums.',
        icon: Building2,
      });
    }
    cards.push({
      id: 'catalog',
      to: '/settings/catalog',
      title: 'Catalog',
      description: 'Master lists, coil register import, and pricing links.',
      icon: Database,
    });
    cards.push({
      id: 'governance',
      to: '/settings/governance',
      title: 'Governance',
      description: showAdminDataReset
        ? 'Approvals, period locks, audits, and admin data reset.'
        : 'Approvals, period locks, cutting gates, and audits.',
      icon: Scale,
    });
    cards.push({
      id: 'help',
      to: '/settings/help',
      title: 'Help',
      description: showHelpIntelligence
        ? 'Role guide, Zare intelligence, and AI knowledge center.'
        : 'Role tour and department workflow guide.',
      icon: BookOpen,
    });
    if (showSystemTab) {
      cards.push({
        id: 'system',
        to: '/settings/system',
        title: 'System',
        description: 'Design reference gallery and integration API keys.',
        icon: SlidersHorizontal,
      });
    }
    return cards;
  }, [
    showTeamTab,
    showOrganization,
    showHelpIntelligence,
    showSystemTab,
    showAdminDataReset,
  ]);

  const related = useMemo(() => {
    const links = [
      {
        id: 'account',
        to: '/me/account',
        title: 'Personal account',
        description: 'Your profile, password, and security.',
        icon: User,
      },
    ];
    if (showPricing) {
      links.push({
        id: 'price-list',
        to: '/price-list',
        title: 'Price list',
        description: 'Published selling prices and CSV updates.',
        icon: BadgeDollarSign,
      });
      links.push({
        id: 'pricing-policy',
        to: '/pricing-policy',
        title: 'Pricing policy',
        description: 'Trading bands, gauge tiers, and customer books.',
        icon: BadgeDollarSign,
      });
    }
    if (showHrSettings) {
      links.push({
        id: 'hr-settings',
        to: '/hr/settings',
        title: 'HR settings',
        description: 'Org structure, pay roles, and people policies.',
        icon: Building2,
      });
    }
    if (showEditApprovals) {
      links.push({
        id: 'edit-approvals',
        to: '/edit-approvals',
        title: 'Change authorisations',
        description: 'One-time edit approval codes queue.',
        icon: ClipboardCheck,
      });
    }
    return links;
  }, [showPricing, showHrSettings, showEditApprovals]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="z-section-title mb-1">Administration</h2>
        <p className="mb-4 max-w-2xl text-xs leading-relaxed text-slate-500">
          Workspace controls for admins. Personal profile and password live under Account.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {sectionCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.id}
                to={card.to}
                className="group flex items-start gap-3 rounded-md border border-slate-200/90 bg-white p-4 shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50/30"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 text-slate-700 group-hover:border-teal-200 group-hover:text-zarewa-teal">
                  <Icon size={16} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{card.title}</span>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-slate-300 group-hover:text-zarewa-teal"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                    {card.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="z-section-title mb-1">Related admin</h2>
        <p className="mb-4 max-w-2xl text-xs leading-relaxed text-slate-500">
          Desks that sit outside Settings but are part of the same control plane.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {related.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.id}
                to={card.to}
                className="group flex items-start gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/50 p-4 transition-colors hover:border-teal-200 hover:bg-white"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-600">
                  <Icon size={16} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{card.title}</span>
                    <ChevronRight size={16} className="shrink-0 text-slate-300" aria-hidden />
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                    {card.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
