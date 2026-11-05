import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StepsPanel } from '../../../src/features/cleaning/StepsPanel';
import { useCleaningStore } from '../../../src/stores/cleaningStore';
import type { CleaningStep } from '../../../src/types/cleaning';

const steps: CleaningStep[] = [
  { id: 's1', type: 'drop_duplicates', parameters: {}, enabled: true },
  { id: 's2', type: 'drop_null_rows', parameters: {}, enabled: true },
];

function show(items = steps) {
  const onAdd = vi.fn();
  render(<StepsPanel steps={items} validation={[]} disabled={false} onAdd={onAdd} />);
  return onAdd;
}

describe('steps panel', () => {
  afterEach(() => {
    cleanup();
    useCleaningStore.setState({ panel: 'open' });
  });

  it('stays hidden while the draft is empty', () => {
    show([]);
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByRole('button', { name: /steps/ })).toBeNull();
  });

  it('lists the steps with an Add step menu', () => {
    const onAdd = show();
    const panel = screen.getByRole('complementary', { name: 'Cleaning steps' });
    expect(panel.textContent).toContain('Cleaning steps (2)');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Split column' }));
    expect(onAdd).toHaveBeenCalledWith('split_column');
  });

  it('collapses to an edge tab with the step count and reopens from it', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse steps panel' }));
    expect(useCleaningStore.getState().panel).toBe('collapsed');
    cleanup();
    show();
    expect(screen.queryByRole('complementary')).toBeNull();
    const tab = screen.getByRole('button', { name: 'Show 2 cleaning steps' });
    expect(tab.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(tab);
    expect(useCleaningStore.getState().panel).toBe('open');
  });
});
