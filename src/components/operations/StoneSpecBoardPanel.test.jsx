import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoneSpecBoardPanel } from './StoneSpecBoardPanel.jsx';

describe('StoneSpecBoardPanel', () => {
  it('renders design, colour, and gauge for metre SKUs', () => {
    render(
      <StoneSpecBoardPanel
        products={[
          {
            productID: 'STONE-milano-black-0.40mm',
            name: 'Stone coated Milano Black 0.40',
            stockLevel: 520,
            qtyReserved: 20,
            dashboardAttrs: {
              inventoryModel: 'stone_meter',
              stoneDesign: 'Milano',
              colour: 'Black',
              gauge: '0.40',
            },
          },
        ]}
      />
    );

    expect(screen.getByTestId('ops-stone-spec-board')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Stone colour × gauge' })).toBeTruthy();
    expect(screen.getByText('Milano')).toBeTruthy();
    expect(screen.getByText('Black')).toBeTruthy();
    expect(screen.getByTitle('Gauge 0.40')).toBeTruthy();
  });
});
