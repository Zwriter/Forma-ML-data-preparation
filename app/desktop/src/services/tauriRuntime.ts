import { getCurrentWindow } from '@tauri-apps/api/window';

const runtimeMessage =
  'Forma needs the Tauri desktop runtime. Run `npm run tauri dev` from app/frontend/desktop.';

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function isDemoRuntime(): boolean {
  return import.meta.env.MODE === 'demo' && !isTauriRuntime();
}

export function getTauriRuntimeError(): Error {
  return new Error(runtimeMessage);
}

/** The current desktop window, or undefined outside the Tauri runtime. */
export function getDesktopWindow() {
  if (!isTauriRuntime()) return undefined;
  try {
    return getCurrentWindow();
  } catch {
    return undefined;
  }
}

export { runtimeMessage };
