import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { ListEmptyState } from '../../ui/ListEmptyState';

/**
 * Apps zone — role-scoped ERP deep links.
 */
export default function AppsGrid({ apps = [] }) {
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
      {apps.map((app) => (
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
          <span className="text-sm font-semibold text-slate-900">{app.label}</span>
          <ExternalLink size={16} className="text-slate-400" aria-hidden />
        </button>
      ))}
    </div>
  );
}
