import type { ModificationProposal } from "./types";
import type { ComponentMaterialOverride, DesignChange } from "../store/studio";

export type ProposalComponent = {
  id: string;
  name: string;
  category: string;
};

export const PROCEDURAL_COMPONENTS: ProposalComponent[] = [
  { id: "body", name: "Body shell", category: "body" },
  { id: "hood", name: "Bonnet", category: "bonnet" },
  { id: "roof", name: "Roof", category: "body" },
  { id: "front-bumper", name: "Front bumper", category: "bumper" },
  { id: "rear-bumper", name: "Rear bumper", category: "bumper" },
  { id: "window", name: "Windows", category: "window" },
  { id: "door-left", name: "Left door", category: "door" },
  { id: "door-right", name: "Right door", category: "door" },
  { id: "wheel-front-left", name: "Front-left wheel", category: "wheel" },
  { id: "wheel-front-right", name: "Front-right wheel", category: "wheel" },
  { id: "wheel-rear-left", name: "Rear-left wheel", category: "wheel" },
  { id: "wheel-rear-right", name: "Rear-right wheel", category: "wheel" },
  { id: "headlights", name: "Headlights", category: "headlight" },
  { id: "spoiler", name: "Rear spoiler", category: "spoiler" },
  { id: "exhaust", name: "Exhaust", category: "exhaust" },
];

const MATERIAL_KEYS = ["color", "finish", "metallic", "roughness", "clearCoat"] as const;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function targetComponents(target: string, components: ProposalComponent[]): ProposalComponent[] {
  const key = normalize(target);
  const exact = components.filter(
    (component) => normalize(component.id) === key || normalize(component.name) === key,
  );
  if (exact.length) return exact;

  const categoryByAlias: Record<string, string[]> = {
    hood: ["bonnet"],
    bonnet: ["bonnet"],
    wheels: ["wheel"],
    wheel: ["wheel"],
    headlights: ["headlight"],
    lighting: ["headlight", "tail-light"],
    windows: ["window"],
    trim: [],
  };
  if (key === "trim") {
    return components.filter((component) => /trim/i.test(component.name));
  }
  const categories = categoryByAlias[key];
  if (!categories) return [];
  return components.filter((component) => categories.includes(component.category));
}

export function createProposalDesignChange(
  proposal: ModificationProposal,
  components: ProposalComponent[],
): { change: DesignChange | null; reason: string | null } {
  if (proposal.compatibility === "incompatible") {
    return { change: null, reason: proposal.compatibilityReason || "This proposal is marked incompatible." };
  }

  const settings = proposal.materialSettings;
  if (settings) {
    const unsupported = Object.keys(settings).filter(
      (key) => !MATERIAL_KEYS.includes(key as (typeof MATERIAL_KEYS)[number]),
    );
    if (unsupported.length) {
      return {
        change: null,
        reason: `This proposal uses material controls that are not supported yet: ${unsupported.join(", ")}.`,
      };
    }
  }

  const change: DesignChange = {
    label: proposal.name,
    customization: {},
    componentMaterials: {},
  };

  if (proposal.category === "spoiler") {
    change.customization.spoiler = true;
    if (!settings) return { change, reason: null };
  }
  if (proposal.category === "window" && !settings) {
    change.customization.windowTint = true;
    return { change, reason: null };
  }
  if (!settings || Object.keys(settings).length === 0) {
    return { change: null, reason: "This proposal does not contain a supported vehicle modification." };
  }

  const materialPatch: Partial<ComponentMaterialOverride> = {};
  if (settings.color !== undefined) materialPatch.color = settings.color;
  if (settings.finish !== undefined) materialPatch.finish = settings.finish;
  if (settings.metallic !== undefined) materialPatch.metallic = settings.metallic;
  if (settings.roughness !== undefined) materialPatch.roughness = settings.roughness;
  if (settings.clearCoat !== undefined) materialPatch.clearCoat = settings.clearCoat;

  if (proposal.category === "paint" && !proposal.targetComponent) {
    if (settings.color !== undefined) change.customization.paint = settings.color;
    if (settings.finish !== undefined) change.customization.finish = settings.finish;
    if (settings.metallic !== undefined) change.customization.paintMetallic = settings.metallic;
    if (settings.roughness !== undefined) change.customization.paintRoughness = settings.roughness;
    if (settings.clearCoat !== undefined) change.customization.clearCoat = settings.clearCoat;
    return { change, reason: null };
  }

  const target = proposal.targetComponent;
  if (!target && proposal.category !== "wheel") {
    return { change: null, reason: "A target component is required for this modification." };
  }
  const matched = target
    ? targetComponents(target, components)
    : components.filter((component) => component.category === "wheel");
  if (!matched.length) {
    return {
      change: null,
      reason: `No compatible ${target ?? proposal.category} component is available on this vehicle.`,
    };
  }

  if (proposal.category === "wheel" && !target && settings.color !== undefined) {
    change.customization.wheelColor = settings.color;
  } else {
    for (const component of matched) {
      change.componentMaterials[component.id] = materialPatch;
    }
  }
  return { change, reason: null };
}
