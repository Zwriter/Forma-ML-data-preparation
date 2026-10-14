import { invoke } from '@tauri-apps/api/core';
import type { Request, Response } from '../types/ipc';
let sequence = 0;
export async function request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const envelope: Request = { id: `ui-${++sequence}`, method, params };
  const response = await invoke<Response<T>>('engine_request', { request: envelope });
  if (response.status === 'error' || response.result === null) throw new Error(response.error?.message ?? 'Engine request failed.');
  return response.result;
}
