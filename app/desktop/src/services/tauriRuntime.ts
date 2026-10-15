const runtimeMessage =
  'Forma needs the Tauri desktop runtime. Run `npm run tauri dev` from app/frontend/desktop.';

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function getTauriRuntimeError(): Error {
  return new Error(runtimeMessage);
}

export { runtimeMessage };
