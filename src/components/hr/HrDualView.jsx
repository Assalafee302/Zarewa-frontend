import React from 'react';

/** Renders mobile stack below md, desktop table at md+. */
export function HrDualView({ mobile, desktop }) {
  return (
    <>
      <div className="md:hidden">{mobile}</div>
      <div className="hidden md:block">{desktop}</div>
    </>
  );
}
