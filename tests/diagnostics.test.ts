import { describe, expect, it } from "vitest";
import { diagnostics, getFlow, getStep, searchDiagnostics } from "../lib/diagnostics";
import { removeCase, upsertCase } from "../lib/storage";
import type { SavedCase } from "../lib/types";

describe("diagnostic data", () => {
  it("has valid start and branch targets", () => {
    for (const flow of diagnostics) {
      expect(getStep(flow, flow.startStepId)).toBeDefined();
      const ids = new Set(flow.steps.map((step) => step.id));
      expect(ids.size).toBe(flow.steps.length);

      for (const step of flow.steps) {
        expect(step.choices.length).toBeGreaterThan(0);
        for (const choice of step.choices) {
          expect(Boolean(choice.nextStepId) || Boolean(choice.outcome)).toBe(true);
          if (choice.nextStepId) expect(ids.has(choice.nextStepId)).toBe(true);
        }
      }
    }
  });

  it("finds diagnostics using German terms and tags", () => {
    expect(searchDiagnostics("temporar")[0]?.id).toBe("temporary-profile");
    expect(searchDiagnostics("169.254")[0]?.id).toBe("dhcp-failure");
    expect(searchDiagnostics("DNS").map((flow) => flow.id)).toContain("dns-failure");
    expect(getFlow("service-7000")?.category).toBe("Server");
  });
});

describe("case storage helpers", () => {
  const savedCase: SavedCase = {
    id: "case-1",
    flowId: "dns-failure",
    title: "DNS-Auflösung schlägt fehl",
    category: "Netzwerk",
    outcome: "Cache geleert",
    note: "",
    answers: [],
    completedAt: "2026-07-13T21:42:00.000Z",
  };

  it("upserts and removes cases without mutating the input", () => {
    const initial: SavedCase[] = [];
    const withCase = upsertCase(initial, savedCase);
    expect(initial).toHaveLength(0);
    expect(withCase).toEqual([savedCase]);
    expect(removeCase(withCase, savedCase.id)).toEqual([]);
  });
});
