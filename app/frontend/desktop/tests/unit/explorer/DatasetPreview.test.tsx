import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DatasetPreview } from '../../../src/features/explorer/DatasetPreview';

afterEach(cleanup);

describe('dataset explorer empty state', () => {
  it('shows empty preview and disables backward paging', () => {
    render(<DatasetPreview preview={null} onPage={() => undefined} />);
    expect(screen.getByText('This dataset has no records to preview.')).toBeTruthy();
    expect(screen.getByText('Previous').hasAttribute('disabled')).toBe(true);
  });
});

describe('dataset preview pages', () => {
  it('renders rows and requests next bounded page', () => {
    const onPage = vi.fn();
    render(<DatasetPreview preview={{ dataset_id:'d1', columns:[{name:'x',type:'Int64',nullable:true}], records:Array.from({length:100}, (_, x) => ({x})), offset:0, limit:100, total_count:200 }} onPage={onPage} />);
    fireEvent.click(screen.getByText('Next'));
    expect(onPage).toHaveBeenCalledWith(100);
  });
});
