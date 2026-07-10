import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ShoppingCart, Factory, Wallet, Users } from 'lucide-react';
import { PageHeader, PageShell, MainPanel } from '../components/layout';

const QUICK_LINKS = [
  { to: '/', label: 'Workspace home', icon: Home },
  { to: '/sales', label: 'Sales', icon: ShoppingCart },
  { to: '/operations', label: 'Operations', icon: Factory },
  { to: '/accounts', label: 'Finance', icon: Wallet },
  { to: '/hr', label: 'HR', icon: Users },
];

const NotFound = () => {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Workspace"
        title="Page not found"
        subtitle="That route does not exist in this workspace."
      />
      <MainPanel className="max-w-lg min-w-0" role="main" aria-labelledby="not-found-title">
        <p className="text-sm text-gray-600 mb-6">
          Check the sidebar for available modules, or jump to a common desk below.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 mb-6">
          {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-zarewa-teal no-underline hover:bg-slate-50"
            >
              <Icon size={16} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
        <Link to="/" className="inline-flex items-center gap-2 z-btn-primary no-underline">
          <Home size={16} aria-hidden /> Back to workspace
        </Link>
      </MainPanel>
    </PageShell>
  );
};

export default NotFound;
