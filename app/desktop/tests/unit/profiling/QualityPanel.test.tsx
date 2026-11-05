import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QualityPanel } from '../../../src/features/profiling/QualityPanel';
import { demoProfile } from '../../../src/services/demoProfile';

describe('QualityPanel', () => {
  afterEach(cleanup);

  it('shows completeness in the ring and a legend with shares and counts', () => {
    render(<QualityPanel quality={demoProfile.quality} />);

    const region = screen.getByRole('region', { name: 'Data quality' });
    expect(region.getAttribute('tabindex')).toBe('-1');
    expect(within(region).getByText('97.8%')).toBeTruthy();
    expect(within(region).getByText('Complete')).toBeTruthy();
    const legend = within(region).getByRole('list', { name: 'Cell quality' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Valid97.8% (144,674)', 'Missing2.2% (3,218)', 'Invalid0.0% (11)']);
    expect(within(region).getByRole('img').getAttribute('aria-label')).toBe(
      'Valid 97.8% (144,674), Missing 2.2% (3,218), Invalid 0.0% (11)',
    );
  });

  it('shows a tooltip on legend focus (keyboard) and segment hover (mouse)', () => {
    const { container } = render(<QualityPanel quality={demoProfile.quality} />);
    const missing = screen.getByText('Missing').closest('li')!;

    expect(missing.tabIndex).toBe(0);
    fireEvent.focus(missing);
    expect(screen.getByRole('tooltip').textContent).toBe('Missing: 3,218 (2.2%)');
    fireEvent.blur(missing);
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(container.querySelector('[data-segment="Valid"]')!);
    expect(screen.getByRole('tooltip').textContent).toBe('Valid: 144,674 (97.8%)');
  });

  it('shows a dash when there are no cells', () => {
    const empty = {
      total_cells: 0,
      valid_cells: 0,
      missing_cells: 0,
      invalid_cells: 0,
      completeness: null,
    };
    render(<QualityPanel quality={empty} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});
