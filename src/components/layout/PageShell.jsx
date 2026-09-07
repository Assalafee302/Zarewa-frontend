import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Page wrapper. Avoid applying blur/pointer-events here — that breaks nested modals.
 * Pass `blurred` only for optional a11y hints; visuals are handled by modal backdrops.
 * Motion is a short opacity fade so navigation stays snappy on mill hardware.
 */
export function PageShell({ children, blurred = false, className = '' }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.15, ease: 'easeOut' }}
      className={`relative mx-auto min-h-0 w-full min-w-0 max-w-[min(100%,1400px)] ${className}`}
      aria-hidden={blurred ? 'true' : undefined}
    >
      {children}
    </motion.div>
  );
}
