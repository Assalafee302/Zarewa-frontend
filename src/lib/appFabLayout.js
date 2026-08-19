/**
 * Bottom-right launcher stack (AI → Chat, right to left).
 * Class names are static so Tailwind JIT keeps the arbitrary values.
 */
export const APP_FAB_SLOT_REM = 4.25;

/**
 * @param {number} slotsFromRight 0 = furthest right, 1 = one slot left, 2 = two slots left
 */
export function appFabRightClass(slotsFromRight = 0) {
  const n = Number(slotsFromRight) || 0;
  if (n >= 2) return 'right-[calc(max(1.25rem,env(safe-area-inset-right))+8.5rem)]';
  if (n >= 1) return 'right-[calc(max(1.25rem,env(safe-area-inset-right))+4.25rem)]';
  return 'right-[max(1.25rem,env(safe-area-inset-right))]';
}

/**
 * @param {{ aiDockVisible?: boolean }} opts
 */
export function appFabSlots({ aiDockVisible = false } = {}) {
  return {
    ai: 0,
    chat: aiDockVisible ? 1 : 0,
  };
}
