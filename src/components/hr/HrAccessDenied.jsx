import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { canAccessTeamHr } from '../../lib/hrAccess';

export default function HrAccessDenied({ permissions }) {
  const team = canAccessTeamHr(permissions);
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-zarewa-teal">
        <ShieldAlert size={28} aria-hidden />
      </div>
      <h1 className="text-xl font-black text-zarewa-teal">Access restricted</h1>
      <p className="mt-2 text-sm text-slate-600">
        {team
          ? 'You do not have access to the main Human Resources workspace. Use Management / Team workspace for branch HR actions.'
          : 'You do not have access to the Human Resources workspace. Use My Profile for self-service HR.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {team ? (
          <Link
            to="/team-hr"
            className="rounded-xl bg-zarewa-teal px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-[#0f3d39]"
          >
            Open Team HR
          </Link>
        ) : (
          <Link
            to="/my-profile"
            className="rounded-xl bg-zarewa-teal px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-[#0f3d39]"
          >
            Open My Profile
          </Link>
        )}
        <Link
          to="/"
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
