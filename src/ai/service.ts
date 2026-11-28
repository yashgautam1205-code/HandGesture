/**
 * AI Service Integration
 * Orchestrates provider calls, prompt construction, validation, and proposal lifecycle.
 */

import type { AIChatRequest, AIChatResponse, ModificationProposal, AIPresetPackage } from "./types";
import { buildSystemPrompt, buildUserPrompt, buildKnowledgePrompt, buildImageConceptPrompt } from "./prompts";
import { validateChatResponse, extractJSON } from "./validator";
import { STYLING_PRESETS, getPresetById } from "./presets";
import type { VehicleContext } from "./vehicleContext";

export type AIResult = {
  response: AIChatResponse | null;
  error: string | null;
  offline: boolean;
};

export async function sendAIChat(request: AIChatRequest): Promise<AIResult> {
  const systemPrompt = buildSystemPrompt(request.context as VehicleContext);
  const userPrompt = request.options?.knowledgeOnly
    ? buildKnowledgePrompt(request.prompt)
    : request.options?.imageGeneration
      ? buildImageConceptPrompt(request.prompt)
      : buildUserPrompt(request.prompt, request.history);

  if (!window.gestureDrive?.requestAI) {
    return { response: null, error: "AI provider is available only in the Electron app.", offline: true };
  }
  try {
    const result = await window.gestureDrive.requestAI(systemPrompt, userPrompt);
    if (result.error) {
      return { response: null, error: result.error, offline: result.offline };
    }
    const parsed = result.text ? extractJSON(result.text) : null;
    const validated = parsed ? validateChatResponse(parsed) : null;
    if (!validated) {
      return { response: null, error: "Invalid AI response format.", offline: false };
    }
    return { response: validated, error: null, offline: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed.";
    return { response: null, error: message, offline: false };
  }
}

export function applyPresetProposals(preset: AIPresetPackage): ModificationProposal[] {
  return preset.proposals.map((p, idx) => ({
    ...p,
    id: `preset-${preset.id}-${idx}`,
    status: "pending" as const,
    source: "preset" as const,
    timestamp: Date.now(),
  }));
}

export function getAvailablePresets(): AIPresetPackage[] {
  return STYLING_PRESETS;
}

export function findPreset(id: string): AIPresetPackage | undefined {
  return getPresetById(id);
}

export { buildSystemPrompt, buildUserPrompt, buildKnowledgePrompt, buildImageConceptPrompt };
