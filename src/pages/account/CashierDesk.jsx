import React from 'react';
import Account from './Account.jsx';

/**
 * Cashier home is `/cashier` (role dashboard matrix). Renders the finance desk
 * with the cashier tab set; do not bounce to `/accounts` or login lands wrong.
 */
export default function CashierDesk() {
  return <Account />;
}
