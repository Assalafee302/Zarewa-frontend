import React, { useCallback } from 'react';
import { OtAsyncLookup } from './OtAsyncLookup';
import { otLookupQuotations, otLookupPurchaseOrders, otLookupStaff } from '../../lib/otRequestsApi';

export function OtQuotationPicker({ value, displayValue, onChange, disabled }) {
  const load = useCallback((q) => otLookupQuotations(q), []);
  return (
    <OtAsyncLookup
      label="Quotation (live)"
      value={value}
      displayValue={displayValue || value}
      onChange={onChange}
      loadOptions={load}
      getOptionId={(r) => String(r.id || '')}
      getOptionLabel={(r) => String(r.id || '')}
      getOptionMeta={(r) =>
        [r.customerName, r.status, r.dateIso].filter(Boolean).join(' · ')
      }
      placeholder="Search quotation ID or customer…"
      disabled={disabled}
      emptyHint="Required for production OT — pick a live quotation only."
    />
  );
}

export function OtPurchaseOrderPicker({ value, displayValue, onChange, disabled }) {
  const load = useCallback((q) => otLookupPurchaseOrders(q), []);
  return (
    <OtAsyncLookup
      label="Purchase order (live)"
      value={value}
      displayValue={displayValue || value}
      onChange={onChange}
      loadOptions={load}
      getOptionId={(r) => String(r.poId || r.po_id || r.id || '')}
      getOptionLabel={(r) => String(r.poId || r.po_id || r.id || '')}
      getOptionMeta={(r) => [r.supplierName, r.status].filter(Boolean).join(' · ')}
      placeholder="Search PO ID or supplier…"
      disabled={disabled}
      emptyHint="Required for offload OT — pick a live PO only."
    />
  );
}

export function OtStaffPicker({ value, displayValue, onChange, disabled, label = 'Staff (roster)' }) {
  const load = useCallback((q) => otLookupStaff(q), []);
  return (
    <OtAsyncLookup
      label={label}
      value={value}
      displayValue={displayValue}
      onChange={onChange}
      loadOptions={load}
      getOptionId={(r) => String(r.id || '')}
      getOptionLabel={(r) =>
        String(r.displayName || r.username || r.id || '')
      }
      getOptionMeta={(r) =>
        [r.jobTitle, r.employmentType, r.username, r.id].filter(Boolean).join(' · ')
      }
      placeholder="Search roster name or username…"
      disabled={disabled}
      emptyHint="Roster only — casual/contract staff must be on app_users first."
    />
  );
}
