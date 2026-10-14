export type Request = { id: string; method: string; params: Record<string, unknown> };
export type Response<T> = {
  id: string;
  status: 'success' | 'error';
  result: T | null;
  error: { code: string; message: string } | null;
};
