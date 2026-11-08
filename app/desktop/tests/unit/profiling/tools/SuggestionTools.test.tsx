import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ToolHost } from '../../../../src/features/profiling/tools/ToolHost';
import { demoProfile } from '../../../../src/services/demoProfile';
import { demoProfileTool } from '../../../../src/services/demoProfileTools';
import { useCleaningStore } from '../../../../src/stores/cleaningStore';
import { useProfileToolStore } from '../../../../src/stores/profileToolStore';
import { useWorkspaceStore } from '../../../../src/stores/workspaceStore';
import type { Suggestion } from '../../../../src/types/profileTools';
import { lastParams, openDemoTool, resetTools } from './toolSetup';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/services/ipcClient', () => ({ request }));

afterEach(() => resetTools(request));

const split: Suggestion = {
  id: 'split:full_name',
  kind: 'split',
  title: 'Split full_name',
  detail: 'Splits 100 values on ", " into 2 columns.',
  cells_affected: 200,
  steps: [
    {
      type: 'split_column',
      parameters: {
        column: 'full_name',
        separator: ', ',
        into: ['full_name_1', 'full_name_2'],
        drop_original: false,
      },
    },
  ],
  examples: [
    { before: 'Last0, First0', after: ['Last0', 'First0'] },
    { before: 'Last1, First1', after: ['Last1', 'First1'] },
    { before: 'Last2, First2', after: ['Last2', 'First2'] },
  ],
};

const cards = () =>
  within(screen.getByRole('list', { name: /Recommendations|New columns/ })).getAllByRole('article');

describe('Recommendations', () => {
  it('lists cards in the order returned and adds every step of one, with Undo', async () => {
    openDemoTool(request, 'recommendations');
    render(<ToolHost />);
    await screen.findByRole('list', { name: 'Recommendations' });
    expect(lastParams(request, 'profile.suggestions')).toMatchObject({ dataset_id: 'demo' });

    const expected = demoProfileTool('profile.suggestions', {}).result as {
      recommendations: Suggestion[];
    };
    const titles = cards().map((card) => within(card).getByRole('heading').textContent);
    expect(titles).toEqual(expected.recommendations.map((item) => item.title));

    const fill = cards().find((card) => card.textContent?.includes('Fill missing values in'))!;
    const steps = expected.recommendations.find((item) => item.kind === 'fill_missing')!.steps;
    fireEvent.click(within(fill).getByRole('button', { name: 'Add step' }));
    expect(useCleaningStore.getState().drafts['file-1']).toHaveLength(steps.length);
    expect(useWorkspaceStore.getState().notification?.message).toMatch(
      /^Added "Fill missing values in .+" to Clean steps\.$/,
    );
    const added = within(fill).getByRole('button', { name: 'Added' }) as HTMLButtonElement;
    expect(added.disabled).toBe(true);
    expect(useProfileToolStore.getState().tool).toBe('recommendations');

    act(() => useWorkspaceStore.getState().notification?.action?.run());
    expect(useCleaningStore.getState().drafts['file-1']).toHaveLength(0);
    expect(within(fill).getByRole('button', { name: 'Add step' })).toBeTruthy();
  });

  it('hides a dismissed card for this data version', async () => {
    openDemoTool(request, 'recommendations');
    render(<ToolHost />);
    await screen.findByRole('list', { name: 'Recommendations' });
    const before = cards().length;
    const first = cards()[0];
    const title = within(first).getByRole('heading').textContent;

    fireEvent.click(within(first).getByRole('button', { name: 'Dismiss' }));
    expect(cards()).toHaveLength(before - 1);
    expect(screen.queryByRole('heading', { name: title! })).toBeNull();
    expect(useProfileToolStore.getState().dismissed[demoProfile.data_version]).toHaveLength(1);
  });
});

describe('Creations', () => {
  it('shows each suggestion with an examples table and no Dismiss', async () => {
    openDemoTool(request, 'creations');
    request.mockImplementation(async (method: string, params: Record<string, unknown>) =>
      method === 'profile.suggestions'
        ? {
            job_id: 'job-1',
            state: 'completed',
            result: {
              dataset_id: 'demo',
              data_version: demoProfile.data_version,
              computed_at: demoProfile.computed_at,
              recommendations: [],
              creations: [split],
            },
          }
        : demoProfileTool(method, params),
    );
    render(<ToolHost />);

    const list = await screen.findByRole('list', { name: 'New columns' });
    const card = within(list).getByRole('article');
    expect(within(card).getByRole('heading', { name: 'Split full_name' })).toBeTruthy();
    const table = within(card).getByRole('table', { name: 'Examples for Split full_name' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByRole('columnheader', { name: 'full_name_2' })).toBeTruthy();
    expect(within(card).queryByRole('button', { name: 'Dismiss' })).toBeNull();

    fireEvent.click(within(card).getByRole('button', { name: 'Add step' }));
    expect(useCleaningStore.getState().drafts['file-1'][0]).toMatchObject(split.steps[0]);
  });

  it('says so when there is nothing to suggest', async () => {
    openDemoTool(request, 'creations');
    render(<ToolHost />);
    expect(await screen.findByText('No new columns to suggest')).toBeTruthy();
  });
});
