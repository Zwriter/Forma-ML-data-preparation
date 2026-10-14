import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TransformationBuilder } from '../../src/features/cleaning/TransformationBuilder';
import { ProfilePanel } from '../../src/features/profiling/ProfilePanel';

describe('profile and cleaning workflow', () => {
  afterEach(cleanup);
  it('shows profile aggregates and accepts all operation kinds', () => {
    render(<><ProfilePanel report={{ row_count:10, missing_counts:{x:2} }} /><TransformationBuilder onPreview={vi.fn()} onApply={vi.fn()} /></>);
    expect(screen.getByText(/row_count/)).toBeTruthy();
    const selector = screen.getByLabelText('Operation');
    for (const operation of ['drop_null_rows','fill_null','rename_columns','drop_columns','convert_type','filter_rows']) {
      fireEvent.change(selector, { target:{value:operation} });
      expect((selector as HTMLSelectElement).value).toBe(operation);
    }
  });
});
