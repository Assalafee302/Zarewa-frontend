import React from 'react';
import HrReportsHub from '../../components/hr/HrReportsHub';

export default function HrReports({ embedded = false } = {}) {
  return (
    <div className="space-y-6">
      {!embedded ? (
        <p className="text-sm text-slate-600">
          Generate, preview, and export HR reports. Select a report, apply filters, then export to CSV, Excel, or PDF.
        </p>
      ) : null}
      <HrReportsHub />
    </div>
  );
}
