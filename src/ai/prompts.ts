/**
 * Prompt Construction
 * Builds structured prompts for the AI service based on user requests and application context.
 */

import type { AIMessage, AIPresetPackage } from "./types";
import type { VehicleContext } from "./vehicleContext";

function formatHierarchy(nodes: VehicleContext["componentHierarchy"], indent = 0): string {
  let result = "";
  const prefix = "  ".repeat(indent);
  for (const node of nodes) {
    const caps = node.component;
    result += `${prefix}- ${caps.name} (${caps.id}) [${caps.category}]`;
    if (!caps.editable) result += " [READ-ONLY]";
    if (!caps.transformable) result += " [FIXED]";
    if (!caps.customizable) result += " [NON-CUSTOMIZABLE]";
    if (caps.source === "fallback") result += " [MERGED]";
    if (caps.source === "category") result += " [INFERRED]";
    result += "\n";
    if (node.children.length > 0) {
      result += formatHierarchy(node.children, indent + 1);
    }
  }
  return result;
}

function formatCurrentMaterials(materials: Record<string, VehicleContext["currentMaterials"][string]>): string {
  let result = "";
  for (const [id, mat] of Object.entries(materials)) {
    result += `${id}: color=${mat.color}, finish=${mat.finish}`;
    if (mat.metallic !== undefined) result += `, metallic=${mat.metallic}`;
    if (mat.roughness !== undefined) result += `, roughness=${mat.roughness}`;
    if (mat.clearCoat !== undefined) result += `, clearCoat=${mat.clearCoat}`;
    if (mat.emissive) result += `, emissive=${mat.emissive}`;
    if (mat.opacity !== undefined) result += `, opacity=${mat.opacity}`;
    result += "\n";
  }
  return result;
}

function formatSupportedActions(actions: VehicleContext["supportedActions"]): string {
  const byComponent = new Map<string, VehicleContext["supportedActions"]>();
  for (const action of actions) {
    const arr = byComponent.get(action.componentId) || [];
    arr.push(action);
    byComponent.set(action.componentId, arr);
  }
  let result = "";
  for (const [componentId, componentActions] of byComponent) {
    result += `Component ${componentId}:\n`;
    for (const action of componentActions) {
      result += `  - ${action.action}: ${action.supportedProperties.join(", ")} — ${action.description}\n`;
    }
  }
  return result;
}

function formatUnsupportedOperations(ops: VehicleContext["unsupportedOperations"]): string {
  let result = "";
  for (const op of ops) {
    result += `- ${op.componentId}.${op.operation}: ${op.reason}\n`;
  }
  return result;
}

function formatReplacementParts(parts: VehicleContext["availableReplacementParts"]): string {
  if (parts.length === 0) return "none";
  let result = "";
  for (const part of parts) {
    result += `- ${part.name} (${part.category}) → ${part.replacesComponentId ?? "none"} [${part.compatibility}]${part.installed ? " INSTALLED" : ""}\n`;
  }
  return result;
}

function formatContextForSystemPrompt(context: VehicleContext): string {
  return `## Vehicle Context
- Vehicle: ${context.vehicleName} (${context.vehicleId})
- Type: ${context.isImported ? "Imported GLB/glTF" : "Procedural Demo"}
- Asset Source: ${context.assetSource}
- Verification: ${context.assetVerification}

## Component Hierarchy
${formatHierarchy(context.componentHierarchy)}

## Current Material State
${formatCurrentMaterials(context.currentMaterials)}

## Global Customization
- Paint: ${context.globalCustomization.paint} (${context.globalCustomization.finish}, metallic=${context.globalCustomization.paintMetallic}, roughness=${context.globalCustomization.paintRoughness}, clearCoat=${context.globalCustomization.clearCoat})
- Wheels: ${context.globalCustomization.wheelColor} (${context.globalCustomization.wheelDesign})
- Spoiler: ${context.globalCustomization.spoiler ? context.globalCustomization.spoilerStyle : "none"}
- Bumper: ${context.globalCustomization.bumperStyle}
- Window Tint: ${context.globalCustomization.windowTint ? "on" : "off"}
- Environment: ${context.globalCustomization.environment}

## Available Replacement Parts
${formatReplacementParts(context.availableReplacementParts)}

## Supported Customization Actions
${formatSupportedActions(context.supportedActions)}

## Unsupported Operations
${formatUnsupportedOperations(context.unsupportedOperations) || "All supported operations are available for editable components."}

## Modification Rules
1. Only propose changes that map to supported actions above.
2. Never invent components not listed in the hierarchy.
3. For merged/fallback components (marked [MERGED]), only global paint changes apply.
4. For read-only components (marked [READ-ONLY]), explain why customization is unavailable.
5. For inferred components (marked [INFERRED]), note that mappings are approximate.
6. Component IDs must exactly match the IDs in the hierarchy.
7. Material properties must use valid ranges: color=#RRGGBB, metallic/roughness/clearCoat/opacity=0-1, finish=gloss|matte|metallic.
8. Requires confirmation for all vehicle modifications.
9. If a request cannot be fulfilled, explain why and suggest alternatives.`;
}

export function buildSystemPrompt(context: VehicleContext): string {
  return `You are an AI Automotive Design Assistant for GESTURE DRIVE 3D.

Your role: Help users customize their vehicle through natural-language requests.

${formatContextForSystemPrompt(context)}

## Response Format
Always respond with a JSON object containing:
{
  "message": "natural language response to user",
  "proposals": [
    {
      "name": "short descriptive name",
      "category": "paint|material|wheel|spoiler|bumper|exhaust|lighting|interior|trim|window|general",
      "targetComponent": "component id or null for whole vehicle",
      "proposedChange": "description of the change",
      "requiredAsset": "asset name if a new GLB is needed, or null",
      "materialSettings": {
        "color": "#hex",
        "finish": "gloss|matte|metallic",
        "metallic": 0-1,
        "roughness": 0-1,
        "clearCoat": 0-1,
        "emissive": "#hex",
        "emissiveIntensity": 0-5,
        "transmission": 0-1,
        "opacity": 0-1
      } or null,
      "compatibility": "compatible|incompatible|unknown",
      "compatibilityReason": "explanation",
      "confidence": 0-1,
      "explanation": "why this change works",
      "autoExecutable": true|false
    }
  ],
  "knowledge": "educational information or null",
  "imageConcept": "design description for image generation or null",
  "confidence": 0-1,
  "requiresConfirmation": true
}

## Rules
- Only propose changes that map to actual application capabilities listed in Supported Customization Actions.
- Never invent assets or components that don't exist in the hierarchy.
- If a requested change cannot be performed, explain why and suggest alternatives.
- Set autoExecutable to false when a replacement asset is required but not available.
- Set compatibility to "incompatible" when the change cannot work.
- Confidence should reflect how certain you are about the proposal.
- requiresConfirmation must always be true for vehicle modifications.
- Be concise in explanations.
- Distinguish general automotive knowledge from vehicle-specific advice.`;
}

export function buildUserPrompt(request: string, history: AIMessage[]): string {
  const historyText = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return `## Conversation History
${historyText || "(no previous messages)"}

## Current Request
${request}

Respond with a JSON object following the specified format.`;
}

export function buildPresetPrompt(preset: AIPresetPackage): string {
  const proposalDescriptions = preset.proposals
    .map((p) => `- ${p.name}: ${p.proposedChange}`)
    .join("\n");

  return `Apply the "${preset.name}" styling package:

${proposalDescriptions}

Create a structured modification proposal for each change.`;
}

export function buildKnowledgePrompt(question: string): string {
  return `Answer this automotive question with accurate, general information. 
Distinguish between general automotive knowledge and vehicle-specific technical specifications.
Do not invent specifications for imported vehicles.

Question: ${question}

Respond with a JSON object:
{
  "message": "your answer",
  "proposals": [],
  "knowledge": "the educational content",
  "imageConcept": null,
  "confidence": 0.95,
  "requiresConfirmation": false
}`;
}

export function buildImageConceptPrompt(designDescription: string): string {
  return `Create a visual design concept description for: "${designDescription}"

Describe the color palette, materials, lighting mood, and overall aesthetic.
This will be used as a reference for a design concept image.

Respond with a JSON object:
{
  "message": "design concept description",
  "proposals": [],
  "knowledge": null,
  "imageConcept": "detailed visual description for image generation",
  "confidence": 0.9,
  "requiresConfirmation": false
}`;
}

export { formatContextForSystemPrompt };