import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { ListEmptyState } from '../../ui/ListEmptyState';

/**
 * Apps zone — role-scoped ERP deep links.
 */
export default function AppsGrid({ apps = [], appsBadges = {} }) {
  const navigate = useNavigate();

  if (!apps.length) {
    return (
      <ListEmptyState
        title="No apps for your role"
        description="Your desk profile does not include quick links here. Use the main menu to open ERP modules."
        className="py-8"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {apps.map((app) => {
        const Icon = app.icon;
        const badge = appsBadges[app.id];
        return (
        <button
          key={app.id}
          type="button"
          onClick={() => {
            if (!app.path) return;
            navigate(app.path);
          }}
          aria-label={`Open ${app.label}`}
          disabled={!app.path}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-teal-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex min-w-0 items-start gap-3">
            {Icon ? <Icon size={20} className="mt-0.5 shrink-0 text-teal-800" aria-hidden /> : null}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">{app.label}</span>
              {app.description ? <span className="mt-1 block text-xs text-slate-500">{app.description}</span> : null}
            </span>
          </span>
          {badge !== undefined && Number(badge) > 0 ? (
            <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">{badge}</span>
          ) : null}
          <ExternalLink size={16} className="text-slate-400" aria-hidden />
        </button>
        );
      })}
    </div>
  );
}
