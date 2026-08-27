import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeDollarSign } from 'lucide-react';
import CoilRegisterImportPanel from './CoilRegisterImportPanel';
import MasterDataWorkbench from './MasterDataWorkbench';
import { useWorkspace } from '../../context/WorkspaceContext';

/** Master lists + coil import; operational pricing stays on dedicated desks. */
export default function CatalogSettingsPanel() {
  const ws = useWorkspace();
  const masterData = ws?.snapshot?.masterData ?? {
    quoteItems: [],
    colours: [],
    gauges: [],
    materialTypes: [],
    profiles: [],
    priceList: [],
    expenseCategories: [],
    procurementCatalog: [],
  };

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <BadgeDollarSign size={14} strokeWidth={2} /> Pricing desks
        </h3>
        <p className="text-ui-xs leading-snug text-slate-600">
          Day-to-day spot moves and workbook updates are not edited here. Use{' '}
          <Link to="/price-list" className="font-semibold text-zarewa-teal underline-offset-2 hover:underline">
            Price list
          </Link>
          ,{' '}
          <Link
            to="/pricing-policy"
            className="font-semibold text-zarewa-teal underline-offset-2 hover:underline"
          >
            Pricing policy
          </Link>
          , or{' '}
          <Link
            to="/procurement"
            className="font-semibold text-zarewa-teal underline-offset-2 hover:underline"
          >
            Procurement
          </Link>{' '}
          for operational pricing. The reference price book below is long-lived catalog setup only.
        </p>
      </section>

      <CoilRegisterImportPanel />

      <section>
        <header className="mb-3 px-0.5">
          <h3 className="text-sm font-semibold text-slate-900">Master lists</h3>
          <p className="mt-0.5 max-w-2xl text-ui-xs leading-snug text-slate-500">
            Quotation lines, colours, materials, reference price books, and procurement mappings.
          </p>
        </header>
        <MasterDataWorkbench masterData={masterData} />
      </section>
    </div>
  );
}
