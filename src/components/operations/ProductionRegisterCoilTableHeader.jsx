import React from 'react';
import { PROD_REG } from '../../lib/productionRegisterUi';

/** Desktop column labels for the coil run log grid. */
export function ProductionRegisterCoilTableHeader({ inModal = false }) {
  return (
    <div className={inModal ? PROD_REG.coilGridHeaderModal : PROD_REG.coilGridHeader} aria-hidden>
      <span>#</span>
      <span>Lot</span>
      <span>Coil</span>
      <span>Open kg</span>
      <span>Close kg</span>
      <span>Metres</span>
      <span>Note</span>
      <span className="text-center">Used</span>
      <span />
    </div>
  );
}
