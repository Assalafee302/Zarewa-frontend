import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Cashier Desk is consolidated into Finance → Desk tab.
 * Deep links and bookmarks to `/cashier` continue to work.
 */
export default function CashierDesk() {
  return <Navigate to="/accounts?tab=desk" replace />;
}
