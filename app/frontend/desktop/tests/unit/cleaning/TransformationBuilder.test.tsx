import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TransformationBuilder } from '../../../src/features/cleaning/TransformationBuilder';
import { useTransformationStore } from '../../../src/stores/transformationStore';

describe('transformation builder', () => {
  afterEach(() => { cleanup(); useTransformationStore.setState({ operations: [] }); });
  it('lists supported operations and reports malformed JSON', () => {
    render(<TransformationBuilder onPreview={vi.fn()} onApply={vi.fn()} />);
    expect(screen.getByLabelText('Operation')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Parameters (JSON)'), { target: { value: '{bad' } });
    fireEvent.click(screen.getByText('Add operation'));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('keeps operation order and passes configured list to apply', () => {
    const onApply = vi.fn();
    render(<TransformationBuilder onPreview={vi.fn()} onApply={onApply} />);
    fireEvent.change(screen.getByLabelText('Parameters (JSON)'), { target: { value: '{"column":"score","strategy":"constant","value":0}' } });
    fireEvent.click(screen.getByText('Add operation'));
    fireEvent.click(screen.getByText('Apply operations'));
    expect(onApply.mock.calls[0][0][0].order).toBe(0);
  });
});
