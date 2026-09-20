import React from 'react';
import { FIELD } from '../../lib/designTokens';
import { FormField, FormGrid, FormModal, FormModalFooter, FormSection } from '../layout';

function receiveQtyMeta(row) {
  if (row.grnKind === 'stone') return { unit: 'm', qtyLabel: 'Metres received', step: '0.01', placeholder: 'Metres' };
  if (row.grnKind === 'stone_flatsheet') {
    return { unit: 'sheets', qtyLabel: 'Sheets received', step: '1', placeholder: 'Sheets' };
  }
  if (row.grnKind === 'accessory') return { unit: 'units', qtyLabel: 'Units received', step: '1', placeholder: 'Units' };
  if (row.meterBasis) return { unit: 'm', qtyLabel: 'Metres received', step: 'any', placeholder: 'Metres' };
  return { unit: 'kg', qtyLabel: 'Kilograms received', step: 'any', placeholder: 'Kg' };
}

function openQtyLabel(row) {
  const meta = receiveQtyMeta(row);
  const suffix = meta.unit === 'm' ? ' m' : meta.unit === 'units' ? ' u' : meta.unit === 'sheets' ? ' sheets' : ' kg';
  return `${Number(row.remaining || 0).toLocaleString()}${suffix}`;
}

function poDescription(po) {
  if (!po) return 'Enter received quantities against the open purchase-order lines.';
  const bits = [
    po.supplierName,
    po.status,
    po.transportAgentName || null,
    po.expectedDeliveryISO ? `ETA ${po.expectedDeliveryISO}` : null,
  ].filter(Boolean);
  return bits.length
    ? `${bits.join(' · ')}. Enter received quantities, then confirm.`
    : 'Enter received quantities against the open purchase-order lines.';
}

function patchLine(setGrnLines, idx, patch) {
  setGrnLines((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
}

/**
 * Store GRN popup — pick a receivable PO on the desk, then post weights/qty here.
 */
export function OperationsReceiveModal({
  isOpen,
  onClose,
  purchaseOrder,
  receiveDraft,
  setReceiveDraft,
  grnLines,
  setGrnLines,
  onSubmit,
  grnSubmitting,
  grnConversionOverride,
  setGrnConversionOverride,
  canReceiveInventory,
  canOverrideConversion = false,
}) {
  const poId = purchaseOrder?.poID || receiveDraft?.poID || '';
  const hasOpenLines = grnLines.length > 0;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={poId ? `Receive ${poId}` : 'Receive stock'}
      eyebrow="Store GRN"
      description={poDescription(purchaseOrder)}
      size="lg"
      formId="ops-receive-form"
      onSubmit={onSubmit}
      closeDisabled={grnSubmitting}
      trackId="ops-receive-grn"
      trackHydrateKey={poId}
      footer={
        <FormModalFooter
          onCancel={onClose}
          confirmType="submit"
          form="ops-receive-form"
          confirmLabel="Confirm receipt"
          confirmLoading={grnSubmitting}
          confirmLoadingLabel="Posting…"
          confirmDisabled={!canReceiveInventory || !hasOpenLines}
        />
      }
    >
      {!canReceiveInventory ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
          Store, operations, or branch manager role is required to receive into stock.
        </p>
      ) : null}

      <fieldset disabled={!canReceiveInventory || grnSubmitting} className="min-w-0 space-y-4 disabled:opacity-70">
        <FormField label="Storage location" htmlFor="ops-receive-location" hint="Optional yard, rack, or bay.">
          <input
            id="ops-receive-location"
            value={receiveDraft.location}
            onChange={(e) => setReceiveDraft((s) => ({ ...s, location: e.target.value }))}
            placeholder="Location (optional)"
            className={FIELD.compact}
          />
        </FormField>

        {!hasOpenLines ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
            No open lines on this order.
          </p>
        ) : (
          grnLines.map((row, idx) => {
            const meta = receiveQtyMeta(row);
            const isSku =
              row.grnKind === 'stone' || row.grnKind === 'accessory' || row.grnKind === 'stone_flatsheet';
            const idBase = `ops-recv-${row.lineKey || idx}`;
            const gaugeS = String(row.gauge ?? '').trim() || '—';
            const colourS = String(row.color ?? '').trim() || '—';
            return (
              <FormSection
                key={row.lineKey || idx}
                title={row.productName || `Line ${idx + 1}`}
              >
                <p className="text-sm text-[var(--z-text-muted)]">
                  <span className="font-semibold text-[var(--z-text)]">{gaugeS}</span>
                  <span className="text-slate-300"> · </span>
                  <span className="font-semibold text-[var(--z-text)]">{colourS}</span>
                  <span className="text-slate-300"> · </span>
                  Open {openQtyLabel(row)}
                </p>
                {isSku ? (
                  <FormGrid>
                    <FormField label={meta.qtyLabel} htmlFor={`${idBase}-qty`} required>
                      <input
                        id={`${idBase}-qty`}
                        type="number"
                        min="0"
                        step={meta.step}
                        value={row.qtyReceived}
                        onChange={(e) => patchLine(setGrnLines, idx, { qtyReceived: e.target.value })}
                        placeholder={meta.placeholder}
                        className={FIELD.compact}
                      />
                    </FormField>
                    <FormField label="Date of receival" htmlFor={`${idBase}-date`} required>
                      <input
                        id={`${idBase}-date`}
                        type="date"
                        value={row.receivedAtISO || ''}
                        onChange={(e) => patchLine(setGrnLines, idx, { receivedAtISO: e.target.value })}
                        required
                        className={FIELD.compact}
                      />
                    </FormField>
                  </FormGrid>
                ) : (
                  <>
                    <FormGrid>
                      <FormField label={meta.qtyLabel} htmlFor={`${idBase}-qty`} required>
                        <input
                          id={`${idBase}-qty`}
                          type="number"
                          min="0"
                          value={row.qtyReceived}
                          onChange={(e) => patchLine(setGrnLines, idx, { qtyReceived: e.target.value })}
                          placeholder={meta.placeholder}
                          className={FIELD.compact}
                        />
                      </FormField>
                      <FormField
                        label="Weight (kg)"
                        htmlFor={`${idBase}-kg`}
                        required
                        hint={row.meterBasis ? 'Required for metre-basis coil lines.' : 'Gross weighbridge weight.'}
                      >
                        <input
                          id={`${idBase}-kg`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.weightKg ?? ''}
                          onChange={(e) => patchLine(setGrnLines, idx, { weightKg: e.target.value })}
                          placeholder={row.meterBasis ? 'Weight kg' : 'Weight kg'}
                          className={FIELD.compact}
                        />
                      </FormField>
                      <FormField label="Coil number" htmlFor={`${idBase}-coil`} required>
                        <input
                          id={`${idBase}-coil`}
                          value={row.coilNo}
                          onChange={(e) => patchLine(setGrnLines, idx, { coilNo: e.target.value })}
                          placeholder="Coil #"
                          title="Suggested from register; edit if tag differs."
                          className={`${FIELD.compact} font-mono`}
                        />
                      </FormField>
                      <FormField label="Date of receival" htmlFor={`${idBase}-date`} required>
                        <input
                          id={`${idBase}-date`}
                          type="date"
                          value={row.receivedAtISO || ''}
                          onChange={(e) => patchLine(setGrnLines, idx, { receivedAtISO: e.target.value })}
                          required
                          className={FIELD.compact}
                        />
                      </FormField>
                    </FormGrid>
                    {row.meterBasis ? (
                      <p className="text-ui-xs font-medium text-amber-800">
                        Metre-basis PO line: enter metres received and actual kg weight.
                      </p>
                    ) : null}
                  </>
                )}
                {row.grnKind === 'stone_flatsheet' ? (
                  <p className="text-ui-xs font-medium text-[var(--z-text-muted)]">
                    Posted to stock as m² (sheets × length × 1.2 m width).
                  </p>
                ) : null}
              </FormSection>
            );
          })
        )}

        {hasOpenLines && grnLines.some((r) => r.grnKind === 'coil') && canOverrideConversion ? (
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-200 bg-amber-50/90 p-3 text-sm font-medium text-amber-950">
            <input
              type="checkbox"
              checked={grnConversionOverride}
              onChange={(e) => setGrnConversionOverride(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-amber-400"
            />
            <span>Override conversion checks (audited).</span>
          </label>
        ) : null}
      </fieldset>
    </FormModal>
  );
}
