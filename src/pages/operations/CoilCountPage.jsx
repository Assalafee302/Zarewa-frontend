import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { PageShell } from '../../components/layout';
import { CoilCountSheet } from '../../components/operations/CoilCountSheet';
import { CoilCountYard } from '../../components/operations/CoilCountYard';
import { useInventory } from '../../context/InventoryContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { saveCoilCountSession } from '../../lib/coilCountSession';
import { OPS_TOOL_BTN } from '../../components/operations/operationsDeskUi';

export default function CoilCountPage() {
  const { coilLots } = useInventory();
  const ws = useWorkspace();
  const [showSheet, setShowSheet] = useState(false);
  const branchName = useMemo(() => {
    const id = String(ws?.session?.user?.branchId || ws?.branchScope || '').trim();
    const branches = ws?.snapshot?.branches || [];
    const hit = branches.find((b) => String(b.id || b.branchId) === id);
    return hit?.name || id || 'Branch';
  }, [ws]);

  return (
    <PageShell>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="/operations" state={{ focusOpsTab: 'inventory' }} className="z-btn-secondary inline-flex items-center gap-1.5">
          <ArrowLeft size={16} /> Coil register
        </Link>
        <button type="button" className={OPS_TOOL_BTN} onClick={() => setShowSheet((v) => !v)}>
          <Printer size={14} aria-hidden />
          {showSheet ? 'Back to yard count' : 'Print count sheet'}
        </button>
      </div>
      {showSheet ? (
        <div className="overflow-x-auto">
          <div className="mb-3 no-print">
            <button type="button" className="z-btn-primary" onClick={() => window.print()}>
              Print A4
            </button>
          </div>
          <CoilCountSheet
            lots={coilLots}
            branchName={branchName}
            dateLabel={new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-lg">
          <h1 className="mb-1 text-lg font-bold text-zarewa-teal">Coil count</h1>
          <p className="mb-3 text-sm text-slate-600">Walk the yard. One coil at a time.</p>
          <CoilCountYard
            lots={coilLots}
            onSubmit={(session) => {
              saveCoilCountSession(session);
            }}
          />
        </div>
      )}
    </PageShell>
  );
}
