import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecBoardPanel } from './SpecBoardPanel.jsx';

describe('SpecBoardPanel', () => {
  it('renders colour and gauge for on-hand specs', () => {
    render(
      <SpecBoardPanel
        masterData={{ colours: [{ name: 'Gray Beige', abbreviation: 'GB', active: true }] }}
        coilLots={[
          {
            coilNo: 'CL-1',
            colour: 'Gray Beige',
            gaugeLabel: '0.28',
            materialTypeName: 'Aluzinc',
            currentWeightKg: 800,
            qtyReserved: 0,
            currentStatus: 'Available',
            receivedAtISO: '2026-01-01',
          },
        ]}
      />
    );

    expect(screen.getByTestId('ops-coil-spec-board')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Colour × gauge' })).toBeTruthy();
    expect(screen.getByText('Gray Beige')).toBeTruthy();
    expect(screen.getByTitle('Gauge 0.28')).toBeTruthy();
    expect(screen.getAllByText('Aluzinc').length).toBeGreaterThan(0);
  });
});
