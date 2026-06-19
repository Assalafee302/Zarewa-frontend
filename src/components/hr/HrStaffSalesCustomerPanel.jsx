import React, { useEffect, useState } from 'react';
import { ensureStaffSalesCustomer } from '../../lib/hrStaffPurchaseCredit';
import { HrAlert, HrCard } from './hrPageUi';
import { HR_BTN_PRIMARY } from './hrFormStyles';

/**
 * HR links a staff member to a sales customer for purchase credit quotations.
 */
export function HrStaffSalesCustomerPanel({ userId, salesCustomerId: initialCustomerId = null, displayName = '' }) {
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setCustomerId(initialCustomerId || null);
  }, [initialCustomerId]);

  const link = async () => {
    if (!userId) return;
    setBusy(true);
    setError('');
    setMessage('');
    const res = await ensureStaffSalesCustomer(userId);
    setBusy(false);
    const data = res.data || res;
    if (!res.ok || !data?.ok) {
      setError(data?.error || 'Could not link sales customer.');
      return;
    }
    setCustomerId(data.customerId);
    setMessage(data.created ? 'Sales customer created and linked.' : data.already ? 'Already linked.' : 'Linked.');
  };

  return (
    <HrCard
      title="Sales customer (purchase credit)"
      subtitle="Required before this staff member can buy roofing or materials on credit via Sales quotations."
    >
      {error ? (
        <div className="mb-3">
          <HrAlert tone="error">{error}</HrAlert>
        </div>
      ) : null}
      {message ? (
        <div className="mb-3">
          <HrAlert tone="success">{message}</HrAlert>
        </div>
      ) : null}
      {customerId ? (
        <p className="text-sm text-slate-700">
          Linked customer: <strong className="font-mono text-[#134e4a]">{customerId}</strong>
          {displayName ? <span className="text-slate-500"> · {displayName} (Staff)</span> : null}
        </p>
      ) : (
        <p className="text-sm text-slate-600">
          No sales customer linked. Create one to enable staff purchase credit on quotations.
        </p>
      )}
      <button type="button" onClick={link} disabled={busy} className={`mt-3 ${HR_BTN_PRIMARY}`}>
        {busy ? 'Linking…' : customerId ? 'Re-check / recreate link' : 'Link sales customer'}
      </button>
    </HrCard>
  );
}
