import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { HrFormModal } from '../../components/hr/HrFormModal';
import { HrStaffRegisterForm } from '../../components/hr/HrStaffRegisterForm';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canManageHrStaff } from '../../lib/hrAccess';

export default function HrStaffRegister() {
  const navigate = useNavigate();
  const ws = useWorkspace();
  const canManage = canManageHrStaff(ws?.permissions || []);

  if (!canManage) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        You need HR staff management permission to register employees.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/hr/staff"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#134e4a] hover:underline"
        >
          <ArrowLeft size={14} aria-hidden /> Staff directory
        </Link>
        <h2 className="mt-2 text-xl font-black text-slate-900">Register new staff</h2>
        <p className="text-sm text-slate-600">
          Creates a login account and HR employee file. Assign branch, job, and starting compensation.
        </p>
      </div>

      <HrFormModal
        isOpen
        onClose={() => navigate('/hr/staff')}
        title="Register new staff"
        size="xl"
      >
        <HrStaffRegisterForm
          onSuccess={(userId) => navigate(`/hr/staff/${encodeURIComponent(userId)}`, { replace: true })}
          onCancel={() => navigate('/hr/staff')}
        />
      </HrFormModal>
    </div>
  );
}
