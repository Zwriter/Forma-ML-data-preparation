import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { SummaryCards } from '../../../src/features/profiling/SummaryCards';
import { demoProfile } from '../../../src/services/demoProfile';

describe('SummaryCards', () => {
  afterEach(cleanup);

  it('lists rows, columns, missing cells, and duplicate rows with grouped numbers', () => {
    render(<SummaryCards profile={demoProfile} />);

    const items = within(screen.getByRole('list', { name: 'Dataset summary' })).getAllByRole(
      'listitem',
    );
    expect(items.map((item) => item.textContent)).toEqual([
      '7,043Rows',
      '21Columns',
      '3,218Missing cells',
      '14Duplicate rows',
    ]);
  });

  it('marks non-zero problems with a text cue and keeps zero neutral', () => {
    render(<SummaryCards profile={{ ...demoProfile, duplicate_rows: 0 }} />);

    const missing = screen.getByText('Missing cells').closest('li')!;
    const duplicates = screen.getByText('Duplicate rows').closest('li')!;
    expect(missing.className).toContain('summary-card-warning');
    expect(missing.getAttribute('aria-label')).toBe('Missing cells: 3,218, needs attention');
    expect(duplicates.className).not.toContain('summary-card-alert');
    expect(duplicates.getAttribute('aria-label')).toBe('Duplicate rows: 0');
    expect(duplicates.getAttribute('tabindex')).toBe('-1');
  });
});
