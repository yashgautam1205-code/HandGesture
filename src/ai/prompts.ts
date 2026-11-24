/**
 * Prompt Construction
 * Builds structured prompts for the AI service based on user requests and application context.
 */

import type { AIChatRequest, AIMessage, AIPresetPackage } from "./types";

export function buildSystemPrompt(context: AIChatRequest["context"]): string {
  const componentList = context.availableComponents.length > 0
    ? context.availableComponents.join(", ")
    : "body, hood, roof, front-bumper, rear-bumper, windows, doors, wheels, headlights, spoiler, exhaust";

  return `You are an AI Automotive Design Assistant for GESTURE DRIVE 3D.

Your role: Help users customize their vehicle through natural-language requests.

## Current Vehicle Context
- Vehicle type: ${context.vehicleType}
- Is imported model: ${context.isImported ? "Yes (GLB/glTF)" : "No (procedural)"}
- Available components: ${componentList}
- Available replacement parts: ${context.availableParts.length > 0 ? context.availableParts.join(", ") : "none imported"}

## Supported Modification Capabilities
1. **Paint changes** — Change body color with hex code, adjust finish (gloss/matte/metallic), metallic value, roughness, clear coat
2. **Material changes** — Apply different materials to specific components (chrome, carbon fiber, rubber, glass)
3. **Wheel replacements** — Change wheel design (five-spoke/turbine), wheel color, or import new wheel GLB
4. **Spoiler installation** — Add/remove spoiler, change style (sport/track)
5. **Bumper replacement** — Change bumper style (street/track), import new bumper GLB
6. **Exhaust changes** — Modify exhaust appearance
7. **Lighting appearance** — Change headlight/taillight emissive color and intensity
8. **Interior appearance** — Modify dashboard, seats, steering wheel materials
9. **Window treatments** — Toggle window tint, change tint darkness

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
- Only propose changes that map to actual application capabilities
- Never invent assets or components that don't exist
- If a requested change cannot be performed, explain why and suggest alternatives
- Set autoExecutable to false when a replacement asset is required but not available
- Set compatibility to "incompatible" when the change cannot work
- Confidence should reflect how certain you are about the proposal
- requiresConfirmation must always be true for vehicle modifications
- Be concise in explanations
- Distinguish general automotive knowledge from vehicle-specific advice`;
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

export function buildRequestContext(
  customization: Record<string, unknown>,
  components: string[],
  parts: string[],
  vehicleType: string,
  isImported: boolean,
): AIChatRequest["context"] {
  return {
    currentCustomization: customization,
    availableComponents: components,
    availableParts: parts,
    vehicleType,
    isImported,
  };
}