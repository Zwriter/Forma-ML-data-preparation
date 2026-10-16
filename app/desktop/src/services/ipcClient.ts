import { invoke } from '@tauri-apps/api/core';
import { getTauriRuntimeError, isTauriRuntime } from './tauriRuntime';
import type { Request, Response } from '../types/ipc';
let sequence = 0;
export class IpcError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'IpcError';
    this.code = code;
  }
}

export async function request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!isTauriRuntime()) throw getTauriRuntimeError();
  const envelope: Request = { id: `ui-${++sequence}`, method, params };
  const response = await invoke<Response<T>>('engine_request', { request: envelope });
  if (response.status === 'error' || response.result === null)
    throw new IpcError(
      response.error?.code ?? 'INTERNAL_ERROR',
      response.error?.message ?? 'Engine request failed.',
    );
  return response.result;
}
