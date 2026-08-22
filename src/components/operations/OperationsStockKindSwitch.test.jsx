import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperationsStockKindSwitch } from './OperationsStockKindSwitch';

afterEach(() => cleanup());

describe('OperationsStockKindSwitch', () => {
  it('is a labelled radio group and arrows change the kind', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OperationsStockKindSwitch value="coil" onChange={onChange} />);
    expect(screen.getByRole('radiogroup', { name: /stock category/i })).toBeTruthy();
    screen.getByRole('radio', { name: 'Coil' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('stone_meter');
  });
});
