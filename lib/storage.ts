import type { SavedCase } from "./types";

const CASES_KEY = "nexstep.cases.v1";

export function readCases(storage: Pick<Storage, "getItem">): SavedCase[] {
  const raw = storage.getItem(CASES_KEY);
  if (!raw) return [];

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isSavedCase).sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
}

export function writeCases(storage: Pick<Storage, "setItem">, cases: SavedCase[]): void {
  storage.setItem(CASES_KEY, JSON.stringify(cases));
}

export function upsertCase(cases: SavedCase[], nextCase: SavedCase): SavedCase[] {
  return [nextCase, ...cases.filter((item) => item.id !== nextCase.id)].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
}

export function removeCase(cases: SavedCase[], id: string): SavedCase[] {
  return cases.filter((item) => item.id !== id);
}

function isSavedCase(value: unknown): value is SavedCase {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SavedCase>;
  return (
    typeof item.id === "string" &&
    typeof item.flowId === "string" &&
    typeof item.title === "string" &&
    typeof item.outcome === "string" &&
    typeof item.completedAt === "string" &&
    Array.isArray(item.answers)
  );
}
