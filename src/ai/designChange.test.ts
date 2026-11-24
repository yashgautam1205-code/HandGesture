import { describe, expect, it } from "vitest";
import type { ModificationProposal } from "./types";
import { createProposalDesignChange, PROCEDURAL_COMPONENTS } from "./designChange";

function proposal(
  overrides: Partial<ModificationProposal> = {},
): ModificationProposal {
  return {
    id: "proposal-1",
    name: "Test change",
    category: "paint",
    targetComponent: null,
    proposedChange: "Change vehicle paint",
    requiredAsset: null,
    materialSettings: { color: "#b93438", finish: "gloss" },
    compatibility: "compatible",
    compatibilityReason: "Compatible",
    confidence: 1,
    explanation: "Test",
    autoExecutable: true,
    status: "pending",
    source: "preset",
    timestamp: 0,
    ...overrides,
  };
}

describe("AI proposal design changes", () => {
  it("prepares global paint as a previewable patch without mutating state", () => {
    const result = createProposalDesignChange(proposal(), PROCEDURAL_COMPONENTS);
    expect(result.reason).toBeNull();
    expect(result.change?.customization).toEqual({ paint: "#b93438", finish: "gloss" });
    expect(result.change?.componentMaterials).toEqual({});
  });

  it("routes targeted changes to real component ids and rejects unknown targets", () => {
    const targeted = createProposalDesignChange(
      proposal({ category: "material", targetComponent: "hood" }),
      PROCEDURAL_COMPONENTS,
    );
    expect(targeted.change?.componentMaterials.hood).toEqual({
      color: "#b93438",
      finish: "gloss",
    });

    const missing = createProposalDesignChange(
      proposal({ category: "material", targetComponent: "trim" }),
      PROCEDURAL_COMPONENTS,
    );
    expect(missing.change).toBeNull();
    expect(missing.reason).toMatch(/No compatible trim component/);
  });

  it("rejects settings that the renderer cannot preview or apply", () => {
    const result = createProposalDesignChange(
      proposal({
        category: "lighting",
        targetComponent: "headlights",
        materialSettings: { emissive: "#00ffff", emissiveIntensity: 2.5 },
      }),
      PROCEDURAL_COMPONENTS,
    );
    expect(result.change).toBeNull();
    expect(result.reason).toMatch(/not supported yet/);
  });
});
