export const MEETINGS_PAGE_SIZE = 6;

export const RESULTS_SUMMARY_ID = "results-summary";

export function getTotalPages(total: number, pageSize: number = MEETINGS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function parsePage(value: string | string[] | null | undefined, totalPages: number): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page < 1) return 1;
  return Math.min(page, totalPages);
}