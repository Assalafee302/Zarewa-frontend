/**
 * Read Policy v1 capability flags from finance trial-exceptions or /api/health.
 */

let cachedLabels = null;

export function setAccountingPolicyV1LabelsEnabled(value) {
  cachedLabels = Boolean(value);
}

export function accountingPolicyV1LabelsEnabled() {
  return cachedLabels === true;
}

let cachedDeliveryGateMode = 'off';

export function deliveryPaymentGateMode() {
  return cachedDeliveryGateMode;
}

export function deliveryPaymentGateWarnActive() {
  return cachedDeliveryGateMode === 'warn' || cachedDeliveryGateMode === 'enforce';
}

/** @param {{ flags?: { accountingPolicyV1Labels?: boolean, deliveryPaymentGateMode?: string } }} trialPayload */
export function syncAccountingPolicyFlagsFromTrial(trialPayload) {
  if (trialPayload?.flags && typeof trialPayload.flags.accountingPolicyV1Labels === 'boolean') {
    setAccountingPolicyV1LabelsEnabled(trialPayload.flags.accountingPolicyV1Labels);
  }
  if (trialPayload?.flags?.deliveryPaymentGateMode) {
    cachedDeliveryGateMode = String(trialPayload.flags.deliveryPaymentGateMode);
  } else if (trialPayload?.deliveryPaymentGateMode) {
    cachedDeliveryGateMode = String(trialPayload.deliveryPaymentGateMode);
  }
}

/** @param {{ accountingPolicyV1Labels?: string }} capabilities */
export function syncAccountingPolicyFlagsFromHealth(capabilities) {
  if (capabilities?.accountingPolicyV1Labels === 'v1') {
    setAccountingPolicyV1LabelsEnabled(true);
  }
}
