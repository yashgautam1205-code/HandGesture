import type { VehicleComponent, ComponentCategory } from "../engine/components";
import type { ComponentMaterialOverride, Customization } from "../store/studio";
import type { ReplacementPart } from "../engine/parts";

export type ComponentCapability = {
  id: string;
  name: string;
  category: ComponentCategory;
  editable: boolean;
  transformable: boolean;
  inspectable: boolean;
  customizable: boolean;
  parentId: string | null;
  originalMaterialNames: string[];
  allowedModifications: string[];
  source: "mapping" | "category" | "fallback";
  bounds: { width: number; height: number; depth: number };
  focusPoint: [number, number, number];
  cameraDistance: number;
};

export type ComponentMaterialState = {
  color: string;
  finish: "gloss" | "matte" | "metallic";
  metallic?: number;
  roughness?: number;
  clearCoat?: number;
  emissive?: string;
  opacity?: number;
};

export type VehicleContext = {
  vehicleId: string;
  vehicleName: string;
  isImported: boolean;
  assetSource: string;
  assetVerification: "verified" | "unverified" | "not-available";
  catalogueVehicleId: string | null;
  components: ComponentCapability[];
  componentHierarchy: ComponentHierarchyNode[];
  currentMaterials: Record<string, ComponentMaterialState>;
  globalCustomization: Customization;
  availableReplacementParts: ReplacementPartSummary[];
  supportedActions: SupportedAction[];
  unsupportedOperations: UnsupportedOperation[];
};

export type ComponentHierarchyNode = {
  component: ComponentCapability;
  children: ComponentHierarchyNode[];
};

export type ReplacementPartSummary = {
  id: string;
  name: string;
  category: string;
  installed: boolean;
  replacesComponentId: string | null;
  compatibility: "verified" | "user-configured" | "unverified" | "incompatible";
};

export type SupportedAction = {
  componentId: string;
  action: "setMaterial" | "setTransform" | "setVisibility" | "isolate" | "replacePart";
  supportedProperties: string[];
  description: string;
};

export type UnsupportedOperation = {
  componentId: string;
  operation: string;
  reason: string;
};

export function buildComponentCapability(component: VehicleComponent): ComponentCapability {
  return {
    id: component.id,
    name: component.name,
    category: component.category,
    editable: component.editable,
    transformable: component.transformable,
    inspectable: component.inspectable,
    customizable: component.customizable,
    parentId: component.parentId,
    originalMaterialNames: component.originalMaterialNames,
    allowedModifications: component.allowedModifications,
    source: component.source,
    bounds: {
      width: component.bounds.max.x - component.bounds.min.x,
      height: component.bounds.max.y - component.bounds.min.y,
      depth: component.bounds.max.z - component.bounds.min.z,
    },
    focusPoint: [
      component.focusPoint.x,
      component.focusPoint.y,
      component.focusPoint.z,
    ],
    cameraDistance: component.cameraDistance,
  };
}

export function buildComponentHierarchy(
  components: ComponentCapability[],
): ComponentHierarchyNode[] {
  const nodesById = new Map<string, ComponentHierarchyNode>();
  for (const component of components) {
    nodesById.set(component.id, { component, children: [] });
  }
  const roots: ComponentHierarchyNode[] = [];
  for (const component of components) {
    const node = nodesById.get(component.id);
    if (!node) continue;
    if (component.parentId && nodesById.has(component.parentId)) {
      nodesById.get(component.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function getMaterialState(
  componentId: string,
  componentMaterials: Record<string, ComponentMaterialOverride>,
  customization: Customization,
): ComponentMaterialState {
  const override = componentMaterials[componentId];
  if (override) {
    return {
      color: override.color,
      finish: override.finish,
      metallic: override.metallic,
      roughness: override.roughness,
      clearCoat: override.clearCoat,
      emissive: (override as { emissive?: string }).emissive,
      opacity: (override as { opacity?: number }).opacity,
    };
  }
  return {
    color: componentId.startsWith("wheel-")
      ? customization.wheelColor
      : customization.paint,
    finish: customization.finish,
    metallic: customization.paintMetallic,
    roughness: customization.paintRoughness,
    clearCoat: customization.clearCoat,
  };
}

function getSupportedActions(
  capability: ComponentCapability,
  replacementParts: ReplacementPart[],
): SupportedAction[] {
  const actions: SupportedAction[] = [];
  if (capability.editable && capability.allowedModifications.includes("material")) {
    actions.push({
      componentId: capability.id,
      action: "setMaterial",
      supportedProperties: ["color", "finish", "metallic", "roughness", "clearCoat", "emissive", "opacity"],
      description: `Change material properties of ${capability.name}`,
    });
  }
  if (capability.transformable && capability.allowedModifications.includes("transform")) {
    actions.push({
      componentId: capability.id,
      action: "setTransform",
      supportedProperties: ["rotation", "position", "scale"],
      description: `Transform ${capability.name}`,
    });
  }
  if (capability.inspectable) {
    actions.push({
      componentId: capability.id,
      action: "setVisibility",
      supportedProperties: ["visible"],
      description: `Show/hide ${capability.name}`,
    });
    actions.push({
      componentId: capability.id,
      action: "isolate",
      supportedProperties: ["isolated"],
      description: `Isolate ${capability.name} for inspection`,
    });
  }
  const replaceableParts = replacementParts.filter(
    (part) => part.replacesComponentId === capability.id,
  );
  if (replaceableParts.length > 0) {
    actions.push({
      componentId: capability.id,
      action: "replacePart",
      supportedProperties: replaceableParts.map((p) => p.id),
      description: `Replace ${capability.name} with imported part`,
    });
  }
  return actions;
}

function getUnsupportedOperations(
  capability: ComponentCapability,
): UnsupportedOperation[] {
  const unsupported: UnsupportedOperation[] = [];
  if (!capability.editable) {
    unsupported.push({
      componentId: capability.id,
      operation: "setMaterial",
      reason: "Component is not editable (merged geometry or locked)",
    });
  }
  if (!capability.transformable) {
    unsupported.push({
      componentId: capability.id,
      operation: "setTransform",
      reason: "Component does not support transform operations",
    });
  }
  if (!capability.customizable) {
    unsupported.push({
      componentId: capability.id,
      operation: "customize",
      reason: "Component is not customizable",
    });
  }
  if (!capability.inspectable) {
    unsupported.push({
      componentId: capability.id,
      operation: "inspect",
      reason: "Component is not available for inspection",
    });
  }
  return unsupported;
}

export function generateVehicleContext(
  _vehicleRoot: any,
  vehicleComponents: VehicleComponent[],
  customization: Customization,
  componentMaterials: Record<string, ComponentMaterialOverride>,
  vehicleName: string,
  isImported: boolean,
  assetSource: string,
  assetVerification: "verified" | "unverified" | "not-available",
  catalogueVehicleId: string | null,
  replacementParts: ReplacementPart[],
): VehicleContext {
  const capabilities = vehicleComponents.map(buildComponentCapability);
  const hierarchy = buildComponentHierarchy(capabilities);
  const currentMaterials: Record<string, ComponentMaterialState> = {};
  for (const component of vehicleComponents) {
    currentMaterials[component.id] = getMaterialState(
      component.id,
      componentMaterials,
      customization,
    );
  }
  const availableReplacementParts: ReplacementPartSummary[] = replacementParts.map((part) => ({
    id: part.id,
    name: part.name,
    category: part.category,
    installed: part.installed,
    replacesComponentId: part.replacesComponentId,
    compatibility: part.compatibility,
  }));
  const supportedActions: SupportedAction[] = [];
  const unsupportedOperations: UnsupportedOperation[] = [];
  for (const capability of capabilities) {
    supportedActions.push(...getSupportedActions(capability, replacementParts));
    unsupportedOperations.push(...getUnsupportedOperations(capability));
  }
  const vehicleId = catalogueVehicleId ?? (isImported ? "imported" : "procedural");
  return {
    vehicleId,
    vehicleName,
    isImported,
    assetSource,
    assetVerification,
    catalogueVehicleId,
    components: capabilities,
    componentHierarchy: hierarchy,
    currentMaterials,
    globalCustomization: customization,
    availableReplacementParts,
    supportedActions,
    unsupportedOperations,
  };
}

function formatHierarchy(nodes: ComponentHierarchyNode[], indent = 0): string {
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

function formatSupportedActions(actions: SupportedAction[]): string {
  const byComponent = new Map<string, SupportedAction[]>();
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

function formatUnsupportedOperations(ops: UnsupportedOperation[]): string {
  let result = "";
  for (const op of ops) {
    result += `- ${op.componentId}.${op.operation}: ${op.reason}\n`;
  }
  return result;
}

function formatCurrentMaterials(materials: Record<string, ComponentMaterialState>): string {
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

function formatReplacementParts(parts: ReplacementPartSummary[]): string {
  if (parts.length === 0) return "none";
  let result = "";
  for (const part of parts) {
    result += `- ${part.name} (${part.category}) → ${part.replacesComponentId ?? "none"} [${part.compatibility}]${part.installed ? " INSTALLED" : ""}\n`;
  }
  return result;
}

export function buildContextForPrompt(context: VehicleContext): string {
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