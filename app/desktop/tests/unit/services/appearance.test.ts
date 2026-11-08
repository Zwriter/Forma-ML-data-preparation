import { afterEach, describe, expect, it } from 'vitest';
import { applyAppearance, readAppearance, resolveMode } from '../../../src/services/appearance';

function storageWith(values: Record<string, string>) {
  return { getItem: (key: string) => values[key] ?? null } as Pick<Storage, 'getItem'>;
}

afterEach(() => {
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.mode;
});

describe('appearance', () => {
  it('defaults to the Graphite colour theme following the system mode', () => {
    expect(readAppearance(storageWith({}))).toEqual({ theme: 'graphite', mode: 'system' });
  });

  it('restores a saved theme and mode', () => {
    const storage = storageWith({ 'forma.color-theme': 'paper', 'forma.color-mode': 'dark' });
    expect(readAppearance(storage)).toEqual({ theme: 'paper', mode: 'dark' });
  });

  it('ignores unknown saved values', () => {
    const storage = storageWith({ 'forma.color-theme': 'neon', 'forma.color-mode': 'dim' });
    expect(readAppearance(storage)).toEqual({ theme: 'graphite', mode: 'system' });
  });

  it('falls back to defaults when storage throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readAppearance(storage)).toEqual({ theme: 'graphite', mode: 'system' });
  });

  it('resolves system mode from the OS preference', () => {
    expect(resolveMode('system', true)).toBe('dark');
    expect(resolveMode('system', false)).toBe('light');
    expect(resolveMode('light', true)).toBe('light');
    expect(resolveMode('dark', false)).toBe('dark');
  });

  it('marks the document root with the theme and dark mode', () => {
    const root = document.documentElement;
    applyAppearance(root, 'orchid', 'dark');
    expect(root.dataset.theme).toBe('orchid');
    expect(root.dataset.mode).toBe('dark');

    applyAppearance(root, 'ledger', 'light');
    expect(root.dataset.theme).toBe('ledger');
    expect(root.dataset.mode).toBeUndefined();
  });
});
