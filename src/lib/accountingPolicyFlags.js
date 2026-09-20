/**
 * Read Policy v1 capability flags from finance trial-exceptions or /api/health.
 */
import { localAccountingCapabilities } from '../shared/lib/localAccountingSurfaces.js';

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

/** @type {ReturnType<typeof localAccountingCapabilities> | null} */
let cachedLocalAccounting = null;

/**
 * @param {{ localAccounting?: object, glPostingEnabled?: string }} payload
 */
export function syncLocalAccountingFromPayload(payload) {
  if (payload?.localAccounting && typeof payload.localAccounting === 'object') {
    cachedLocalAccounting = payload.localAccounting;
    return;
  }
  if (payload?.glPostingEnabled === 'off') {
    cachedLocalAccounting = localAccountingCapabilities(false);
  } else if (payload?.glPostingEnabled === 'on') {
    cachedLocalAccounting = localAccountingCapabilities(true);
  }
}

/** @param {object | null | undefined} snapshot */
export function resolveLocalAccounting(snapshot) {
  if (snapshot?.localAccounting && typeof snapshot.localAccounting === 'object') {
    return snapshot.localAccounting;
  }
  return cachedLocalAccounting || localAccountingCapabilities(true);
}

/** @param {object | null | undefined} snapshot */
export function isLocalGlEnabled(snapshot) {
  return resolveLocalAccounting(snapshot).glPostingEnabled !== false;
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

/** @param {{ accountingPolicyV1Labels?: string, deliveryPaymentGate?: string, glPostingEnabled?: string, localAccounting?: object }} capabilities */
export function syncAccountingPolicyFlagsFromHealth(capabilities) {
  if (capabilities?.accountingPolicyV1Labels === 'v1') {
    setAccountingPolicyV1LabelsEnabled(true);
  }
  if (capabilities?.deliveryPaymentGate) {
    cachedDeliveryGateMode = String(capabilities.deliveryPaymentGate);
  }
  syncLocalAccountingFromPayload(capabilities || {});
}
