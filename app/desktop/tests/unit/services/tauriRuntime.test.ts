import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDemoRuntime } from '../../../src/services/tauriRuntime';

describe('demo runtime detection', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the native runtime when a demo-mode build runs inside Tauri', () => {
    vi.stubEnv('MODE', 'demo');

    expect(isDemoRuntime()).toBe(false);
  });

  it('uses the browser demo when demo mode runs without Tauri', () => {
    vi.stubEnv('MODE', 'demo');
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');

    expect(isDemoRuntime()).toBe(true);
  });
});
