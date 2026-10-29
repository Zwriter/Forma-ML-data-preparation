import { request } from './ipcClient';

export const setHistoryLimit = (maxActions: number) =>
  request<{ max_actions: number }>('settings.history_limit', { max_actions: maxActions });
