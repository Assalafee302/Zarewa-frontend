import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MainPanel, PageHeader } from '../components/layout';
import { PriceListPanel } from '../components/procurement/PriceListPanel';
import { useWorkspace } from '../context/WorkspaceContext';

/** Standalone price list page (sidebar entry removed; primary UI is Procurement → Conversion). */
export default function PriceListAdmin() {
  const ws = useWorkspace();
  const canView = ws?.hasPermission?.('pricing.manage') || ws?.hasPermission?.('md.price_exception.approve');

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  const canPolicy =
    ws?.hasPermission?.('pricing.policy.manage') ||
    ws?.hasPermission?.('md.price_exception.approve') ||
    ws?.hasPermission?.('*');

  return (
    <MainPanel className="min-w-0">
      <PageHeader
        title="Price list"
        subtitle="Published selling prices (₦/m) by gauge and design — effective dates, duplicate detection, optional material/colour/profile keys, and CSV export. Prefer Procurement → Pricing workbook Publish as the primary path."
      />
      {canPolicy ? (
        <p className="mb-3 text-xs text-slate-600">
          <Link className="font-bold text-zarewa-teal underline-offset-2 hover:underline" to="/pricing-policy">
            Pricing policy &amp; customer price book
          </Link>
        </p>
      ) : null}
      <PriceListPanel />
    </MainPanel>
  );
}
