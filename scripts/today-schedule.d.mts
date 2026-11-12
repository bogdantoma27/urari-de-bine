export interface Schedule {
  start: string;
  ids: string[];
}
export const HORIZON_DAYS: number;
export function addDays(date: string, n: number): string;
export function daysBetween(from: string, to: string): number;
export function extendIds(funnyIds: string[], history: string[], count: number): string[];
export function buildSchedule(entries: { id: string; funny: boolean }[], today: string, existing: Schedule | null): Schedule;
