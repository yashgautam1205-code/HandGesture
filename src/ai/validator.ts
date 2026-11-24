/**
 * AI Response Validation
 * Strict schema validation for AI-generated modification proposals.
 * Rejects malformed or unsafe responses.
 */

import type {
  AICategory,
  AIChatResponse,
  ModificationProposal,
  MaterialProposal,
} from "./types";

const VALID_CATEGORIES: AICategory[] = [
  "paint",
  "material",
  "wheel",
  "spoiler",
  "bumper",
  "exhaust",
  "lighting",
  "interior",
  "trim",
  "window",
  "general",
];


const VALID_FINISHES = ["gloss", "matte", "metallic"];

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isColorHex(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(value)
  );
}

function validateMaterialSettings(value: unknown): MaterialProposal | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return null;

  const m = value as Record<string, unknown>;
  const result: MaterialProposal = {};

  if (m.color !== undefined) {
    if (!isColorHex(m.color)) return null;
    result.color = m.color;
  }
  if (m.finish !== undefined) {
    if (typeof m.finish !== "string" || !VALID_FINISHES.includes(m.finish)) return null;
    result.finish = m.finish as "gloss" | "matte" | "metallic";
  }
  if (m.metallic !== undefined) {
    if (!isNumber(m.metallic) || m.metallic < 0 || m.metallic > 1) return null;
    result.metallic = m.metallic;
  }
  if (m.roughness !== undefined) {
    if (!isNumber(m.roughness) || m.roughness < 0 || m.roughness > 1) return null;
    result.roughness = m.roughness;
  }
  if (m.clearCoat !== undefined) {
    if (!isNumber(m.clearCoat) || m.clearCoat < 0 || m.clearCoat > 1) return null;
    result.clearCoat = m.clearCoat;
  }
  if (m.emissive !== undefined) {
    if (!isColorHex(m.emissive)) return null;
    result.emissive = m.emissive;
  }
  if (m.emissiveIntensity !== undefined) {
    if (!isNumber(m.emissiveIntensity) || m.emissiveIntensity < 0 || m.emissiveIntensity > 5) return null;
    result.emissiveIntensity = m.emissiveIntensity;
  }
  if (m.transmission !== undefined) {
    if (!isNumber(m.transmission) || m.transmission < 0 || m.transmission > 1) return null;
    result.transmission = m.transmission;
  }
  if (m.opacity !== undefined) {
    if (!isNumber(m.opacity) || m.opacity < 0 || m.opacity > 1) return null;
    result.opacity = m.opacity;
  }

  return result;
}

export function validateProposal(value: unknown): ModificationProposal | null {
  if (!value || typeof value !== "object") return null;

  const p = value as Record<string, unknown>;

  if (!isString(p.name)) return null;
  if (!isString(p.category) || !VALID_CATEGORIES.includes(p.category as AICategory)) return null;
  if (p.targetComponent !== null && !isString(p.targetComponent)) return null;
  if (!isString(p.proposedChange)) return null;
  if (p.requiredAsset !== null && !isString(p.requiredAsset)) return null;

  const materialSettings = validateMaterialSettings(p.materialSettings);
  if (p.materialSettings !== undefined && p.materialSettings !== null && materialSettings === null) {
    return null;
  }

  if (!isString(p.compatibilityReason)) return null;
  if (!isNumber(p.confidence) || p.confidence < 0 || p.confidence > 1) return null;
  if (!isString(p.explanation)) return null;
  if (!isBoolean(p.autoExecutable)) return null;

  return {
    id: isString(p.id) ? p.id : `prop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: p.name,
    category: p.category as AICategory,
    targetComponent: p.targetComponent as string | null,
    proposedChange: p.proposedChange,
    requiredAsset: p.requiredAsset as string | null,
    materialSettings,
    compatibility: (p.compatibility as string) === "compatible" ||
      (p.compatibility as string) === "incompatible" ||
      (p.compatibility as string) === "unknown"
      ? (p.compatibility as "compatible" | "incompatible" | "unknown")
      : "unknown",
    compatibilityReason: p.compatibilityReason,
    confidence: p.confidence,
    explanation: p.explanation,
    autoExecutable: p.autoExecutable,
    status: "pending",
    source: "ai",
    timestamp: Date.now(),
  };
}

export function validateChatResponse(value: unknown): AIChatResponse | null {
  if (!value || typeof value !== "object") return null;

  const r = value as Record<string, unknown>;

  if (!isString(r.message)) return null;
  if (!Array.isArray(r.proposals)) return null;
  if (!isNumber(r.confidence) || r.confidence < 0 || r.confidence > 1) return null;
  if (!isBoolean(r.requiresConfirmation)) return null;

  const proposals: ModificationProposal[] = [];
  for (const proposal of r.proposals) {
    const validated = validateProposal(proposal);
    if (validated) proposals.push(validated);
  }

  let knowledge: string | null = null;
  if (r.knowledge !== undefined && r.knowledge !== null) {
    if (isString(r.knowledge)) knowledge = r.knowledge;
  }

  let imageConcept: string | null = null;
  if (r.imageConcept !== undefined && r.imageConcept !== null) {
    if (isString(r.imageConcept)) imageConcept = r.imageConcept;
  }

  return {
    message: r.message,
    proposals,
    knowledge,
    imageConcept,
    confidence: r.confidence,
    requiresConfirmation: r.requiresConfirmation,
  };
}

export function sanitizeResponse(raw: string): string {
  return raw
    .replace(/<\|function_call.*?\|>/g, "")
    .replace(/```(?:json)?\n?([\s\S]*?)```/g, "$1")
    .trim();
}

export function extractJSON(text: string): unknown | null {
  const cleaned = sanitizeResponse(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}