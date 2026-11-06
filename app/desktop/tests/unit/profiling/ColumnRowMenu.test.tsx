import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ColumnRowMenu } from '../../../src/features/profiling/columns/ColumnRowMenu';
import { demoProfile } from '../../../src/services/demoProfile';

const column = demoProfile.columns[2];

describe('ColumnRowMenu', () => {
  afterEach(cleanup);

  it('offers Clean this column and Copy column name', () => {
    const onClean = vi.fn();
    const onCopy = vi.fn();
    render(<ColumnRowMenu column={column} onClean={onClean} onCopy={onCopy} />);

    fireEvent.click(screen.getByRole('button', { name: 'Actions for SeniorCitizen' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Clean this column',
      'Copy column name',
    ]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clean this column' }));
    expect(onClean).toHaveBeenCalledWith(column);

    fireEvent.click(screen.getByRole('button', { name: 'Actions for SeniorCitizen' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy column name' }));
    expect(onCopy).toHaveBeenCalledWith(column);
  });

  it('adds items only when their handlers are given', () => {
    render(
      <ColumnRowMenu
        column={column}
        onClean={vi.fn()}
        onCopy={vi.fn()}
        onShowDistribution={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Actions for SeniorCitizen' }));
    expect(screen.getByRole('menuitem', { name: 'Show distribution' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Export invalid rows' })).toBeNull();
  });
});
