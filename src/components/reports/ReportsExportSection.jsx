import React from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { EXPORT_SECTIONS, catalogItemSupportsPrint } from '../../lib/reportsExportCatalog';

function ExportCard({ item, financeLocked, onPrint, onDownload, onApiWorkbook }) {
  const Icon = item.icon;
  const locked = financeLocked && item.requiresFinanceView;

  const runPrint = () => {
    if (locked) return;
    if (item.kind === 'api-workbook') {
      onPrint(item.printPack);
      return;
    }
    onPrint(item.pack);
  };

  const runApiExcel = () => {
    if (locked) return;
    onApiWorkbook(item.workbook);
  };

  return (
    <div
      className={`z-soft-panel p-6 sm:p-7 transition-all hover:border-teal-100/80 ${
        locked ? 'opacity-[0.88]' : ''
      }`}
    >
      {locked ? (
        <p className="text-xs font-bold text-amber-800 mb-3 rounded-lg bg-amber-50 border border-amber-100/80 px-3 py-2">
          Requires finance.view to export or print
        </p>
      ) : null}
      <div className="flex items-start gap-4 mb-5">
        <div className="p-3 rounded-2xl bg-white text-zarewa-teal border border-slate-100 shadow-sm shrink-0">
          <Icon size={22} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-black text-zarewa-teal tracking-tight">{item.title}</h3>
          <p className="text-sm font-medium text-slate-600 mt-1.5 leading-relaxed">{item.desc}</p>
        </div>
      </div>
      <div className="z-form-actions !mt-0 !pt-0 !border-0 flex-wrap">
        {catalogItemSupportsPrint(item) ? (
          <button
            type="button"
            onClick={runPrint}
            disabled={locked}
            className="z-btn-secondary min-w-0 flex-1 justify-center sm:min-w-[10rem]"
            title={`A4 print preview — ${item.title}`}
          >
            <Printer size={16} />
            Print
          </button>
        ) : null}
        {item.kind === 'api-workbook' ? (
          <button
            type="button"
            onClick={runApiExcel}
            disabled={locked}
            className="z-btn-primary min-w-0 flex-1 justify-center sm:min-w-[9rem]"
          >
            <FileSpreadsheet size={14} />
            Excel
          </button>
        ) : (
          item.formats.map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => onDownload(item.pack, fmt, locked)}
              disabled={locked}
              className="z-btn-primary min-w-0 flex-1 justify-center sm:min-w-[9rem]"
              title={`Generate ${fmt} — ${item.title}`}
            >
              <FileSpreadsheet size={14} />
              {fmt}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function ReportsExportSection({ hasFinanceView, onPrint, onDownload, onApiWorkbook }) {
  return (
    <div className="space-y-12">
      {EXPORT_SECTIONS.map((section) => (
        <section key={section.id} className="space-y-5">
          <header className="max-w-3xl">
            <h3 className="z-section-title">{section.title}</h3>
            <p className="text-sm font-medium text-slate-600 mt-1.5 leading-relaxed">{section.subtitle}</p>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {section.items.map((item) => (
              <ExportCard
                key={item.id}
                item={item}
                financeLocked={item.requiresFinanceView && !hasFinanceView}
                onPrint={onPrint}
                onDownload={onDownload}
                onApiWorkbook={onApiWorkbook}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
