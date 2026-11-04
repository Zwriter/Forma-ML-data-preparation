import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { StepList } from '../../../src/features/cleaning/StepList';
import { useCleaningStore } from '../../../src/stores/cleaningStore';
import { useDatasetStore } from '../../../src/stores/datasetStore';
import type { CleaningStep, StepValidation } from '../../../src/types/cleaning';

function steps() {
  return useCleaningStore.getState().drafts['file-1'] ?? [];
}

function show(validation: StepValidation[] = []) {
  const { rerender } = render(<StepList steps={steps()} validation={validation} />);
  // The panel re-renders the list from the store; mimic that after each action.
  return () => rerender(<StepList steps={steps()} validation={validation} />);
}

const cards = () => screen.getAllByRole('listitem');
const titles = () => cards().map((card) => card.querySelector('strong')?.textContent);

function choose(position: number, action: string) {
  fireEvent.click(screen.getByRole('button', { name: `Actions for step ${position}` }));
  fireEvent.click(screen.getByRole('menuitem', { name: action }));
}

describe('step list management', () => {
  beforeEach(() => {
    useDatasetStore.setState({ activeFileId: 'file-1' });
    const store = useCleaningStore.getState();
    store.add('file-1', 'drop_duplicates', {});
    store.add('file-1', 'drop_null_rows', {});
    store.add('file-1', 'drop_columns', { columns: ['x'] });
  });

  afterEach(() => {
    cleanup();
    useCleaningStore.setState({ drafts: {}, form: null });
    useDatasetStore.setState({ activeFileId: null });
  });

  it('switches a step off and on with an announced switch', () => {
    const refresh = show();
    const toggle = screen.getByRole('switch', { name: 'Enable step 2' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    refresh();
    expect(steps()[1].enabled).toBe(false);
    expect(screen.getByRole('switch', { name: 'Enable step 2' }).getAttribute('aria-checked')).toBe(
      'false',
    );
    expect(cards()[1].textContent).toContain('Skipped');
  });

  it('moves, duplicates, and deletes steps and renumbers them', () => {
    const refresh = show();
    choose(2, 'Move up');
    refresh();
    expect(titles()).toEqual([
      'Remove rows with missing values',
      'Remove duplicate rows',
      'Remove columns',
    ]);
    choose(2, 'Move down');
    refresh();
    expect(titles()[2]).toBe('Remove duplicate rows');

    choose(1, 'Duplicate');
    refresh();
    expect(titles()).toHaveLength(4);
    expect(titles()[1]).toBe('Remove rows with missing values');

    choose(4, 'Delete');
    refresh();
    expect(titles()).toEqual([
      'Remove rows with missing values',
      'Remove rows with missing values',
      'Remove columns',
    ]);
    expect(within(cards()[2]).getByLabelText('Step 3')).toBeTruthy();
  });

  it('offers only the moves that are possible', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for step 1' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Edit',
      'Move down',
      'Duplicate',
      'Delete',
    ]);
    fireEvent.keyDown(screen.getAllByRole('menuitem')[0], { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Actions for step 3' }));
    expect(screen.queryByRole('menuitem', { name: 'Move down' })).toBeNull();
  });

  it('opens the step form pre-filled for Edit', () => {
    show();
    choose(3, 'Edit');
    expect(useCleaningStore.getState().form).toEqual({
      type: 'drop_columns',
      editingId: steps()[2].id,
    });
  });

  it('navigates the step menu with arrow keys and closes it with Escape', () => {
    show();
    const trigger = screen.getByRole('button', { name: 'Actions for step 2' });
    fireEvent.click(trigger);
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'End' });
    expect(document.activeElement).toBe(items.at(-1));
    fireEvent.keyDown(items.at(-1)!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('shows a step validation error on its card', () => {
    const [first] = steps() as CleaningStep[];
    show([{ index: 0, operation_id: first.id, valid: false, message: 'Select a column.' }]);
    expect(cards()[0].textContent).toContain('Select a column.');
    expect(cards()[0].getAttribute('aria-describedby')).toBe(`${first.id}-error`);
  });
});
