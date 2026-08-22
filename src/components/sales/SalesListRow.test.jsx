import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SalesListRow, SalesRecordsView } from './SalesListRow';

afterEach(() => cleanup());

describe('SalesListRow', () => {
  it('opens View from the row body without triggering the menu control', async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const onMenu = vi.fn();
    render(
      <ul>
        <SalesListRow
          rowKey="q-1"
          openKey={null}
          onView={onView}
          viewLabel="View quotation Q-1"
          menu={
            <button type="button" onClick={onMenu}>
              Menu
            </button>
          }
        >
          <span>Q-1 · Acme</span>
        </SalesListRow>
      </ul>
    );

    await user.click(screen.getByRole('button', { name: 'View quotation Q-1' }));
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onMenu).not.toHaveBeenCalled();
  });
});

describe('SalesRecordsView', () => {
  it('renders a captioned table with scan columns', () => {
    render(
      <SalesRecordsView
        caption="Quotations"
        headers={[
          { key: 'id', label: 'ID' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'actions', label: 'Actions' },
        ]}
        items={[{ id: 'Q-1', total: '₦10' }]}
        itemKey={(r) => `q-${r.id}`}
        openKey={null}
        onView={vi.fn()}
        viewLabel={(r) => `View quotation ${r.id}`}
        renderMenu={() => <span>Menu</span>}
        renderCard={(r) => <span>{r.id}</span>}
        renderCells={(r) => ({ id: r.id, amount: r.total })}
      />
    );
    const table = screen.getByRole('table', { name: 'Quotations' });
    expect(within(table).getByRole('button', { name: 'View quotation Q-1' })).toBeTruthy();
    expect(within(table).getByText('₦10')).toBeTruthy();
  });
});
