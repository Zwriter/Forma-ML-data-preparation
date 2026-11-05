/** Worksheet page sizes. The engine refuses pages above MAX_PAGE_SIZE. */
export const DEFAULT_PAGE_SIZE = 500;
export const MIN_PAGE_SIZE = 500;
export const MAX_PAGE_SIZE = 20000;
/** Above this, Settings warns that the worksheet may be slow. */
export const LARGE_PAGE_SIZE = 5000;
export const PAGE_SIZE_OPTIONS = [500, 1000, 2000, 3000, 4000];

export const clampPageSize = (size: number) =>
  Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.trunc(size)));

/** The menu sizes plus any custom size in use, smallest first. */
export const pageSizeOptions = (...inUse: number[]) =>
  [...new Set([...PAGE_SIZE_OPTIONS, ...inUse])].sort((a, b) => a - b);
