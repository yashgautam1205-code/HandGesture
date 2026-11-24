import type {
  BumperStyle,
  ComponentMaterialOverride,
  Customization,
  EnvironmentPreset,
  Finish,
  GestureSettings,
  QualityLevel,
  SpoilerStyle,
  WheelDesign,
} from "../store/studio";
import type { ModelAssetData } from "./modelLoader";
import type { ReplacementPart } from "./parts";
import type { VehicleProjectMetadata } from "../vehicles/types";

type SerializedReplacementPart = Omit<ReplacementPart, "object" | "asset"> & {
  asset: ModelAssetData;
};

export type StudioProject = {
  version: 2;
  model:
    | { source: "procedural" }
    | ({ source: "imported"; asset: ModelAssetData } & VehicleProjectMetadata);
  customization: Customization;
  componentMaterials: Record<string, ComponentMaterialOverride>;
  componentRotations: Record<string, [number, number, number]>;
  replacementParts: SerializedReplacementPart[];
  gestureSettings?: GestureSettings;
};

const isColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const isFinish = (value: unknown): value is Finish =>
  value === "gloss" || value === "matte" || value === "metallic";
const isNumberInRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

function isModelAsset(value: unknown): value is ModelAssetData {
  if (!value || typeof value !== "object") return false;
  const asset = value as Partial<ModelAssetData>;
  return (
    typeof asset.name === "string" &&
    typeof asset.mainFile === "string" &&
    Array.isArray(asset.files) &&
    asset.files.length > 0 &&
    asset.files.length <= 256 &&
    asset.files.reduce(
      (total, file) => total + (typeof file?.data === "string" ? file.data.length : 0),
      0,
    ) <= Math.ceil((128 * 1024 * 1024 * 4) / 3) &&
    asset.files.every(
      (file) =>
        Boolean(file) &&
        typeof file.path === "string" &&
        typeof file.data === "string" &&
        /^[A-Za-z0-9+/]*={0,2}$/.test(file.data),
    )
  );
}

function isComponentMaterials(value: unknown): value is Record<string, ComponentMaterialOverride> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const material = entry as Partial<ComponentMaterialOverride>;
    return (
      isColor(material.color) &&
      isFinish(material.finish) &&
      (material.metallic === undefined || isNumberInRange(material.metallic, 0, 1)) &&
      (material.roughness === undefined || isNumberInRange(material.roughness, 0, 1)) &&
      (material.clearCoat === undefined || isNumberInRange(material.clearCoat, 0, 1))
    );
  });
}

function isComponentRotations(value: unknown): value is Record<string, [number, number, number]> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length === 3 &&
      entry.every((angle) => typeof angle === "number" && Number.isFinite(angle)),
  );
}

function isTuple3(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function isDimensions(value: unknown): value is { width: number; height: number; depth: number } {
  if (!value || typeof value !== "object") return false;
  const dimensions = value as Record<string, unknown>;
  return (
    typeof dimensions.width === "number" &&
    Number.isFinite(dimensions.width) &&
    typeof dimensions.height === "number" &&
    Number.isFinite(dimensions.height) &&
    typeof dimensions.depth === "number" &&
    Number.isFinite(dimensions.depth)
  );
}

function isBounds(value: unknown): value is { min: [number, number, number]; max: [number, number, number] } {
  if (!value || typeof value !== "object") return false;
  const bounds = value as Record<string, unknown>;
  return isTuple3(bounds.min) && isTuple3(bounds.max);
}

function isTransform(value: unknown): value is {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
} {
  if (!value || typeof value !== "object") return false;
  const transform = value as Record<string, unknown>;
  return isTuple3(transform.position) && isTuple3(transform.rotation) && isTuple3(transform.scale);
}

function isAttachment(value: unknown): value is {
  position: [number, number, number];
  normal: [number, number, number];
} | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const attachment = value as Record<string, unknown>;
  return isTuple3(attachment.position) && isTuple3(attachment.normal);
}

function isReplacementPart(value: unknown): value is SerializedReplacementPart {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const part = value as Record<string, unknown>;
  return (
    typeof part.id === "string" &&
    typeof part.name === "string" &&
    typeof part.category === "string" &&
    typeof part.source === "string" &&
    typeof part.assetName === "string" &&
    isModelAsset(part.asset) &&
    isDimensions(part.dimensions) &&
    isBounds(part.bounds) &&
    Array.isArray(part.materialNames) &&
    part.materialNames.every((name) => typeof name === "string") &&
    isTransform(part.transform) &&
    isAttachment(part.attachment) &&
    typeof part.compatibility === "string" &&
    ["verified", "user-configured", "unverified", "incompatible"].includes(part.compatibility) &&
    typeof part.compatibilityReason === "string" &&
    typeof part.installed === "boolean" &&
    (part.replacesComponentId === null || typeof part.replacesComponentId === "string") &&
    typeof part.originalComponentPreserved === "boolean"
  );
}

function isGestureSettings(value: unknown): value is GestureSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const settings = value as Record<string, unknown>;
  return (
    isNumberInRange(settings.confidenceThreshold, 0.3, 0.95) &&
    isNumberInRange(settings.gestureCooldown, 300, 5000) &&
    isNumberInRange(settings.smoothing, 0.1, 0.9) &&
    isNumberInRange(settings.pinchThreshold, 0.2, 0.9) &&
    isNumberInRange(settings.calibrationHandScale, 0.08, 0.45) &&
    isNumberInRange(settings.pointDwellMs, 300, 2000) &&
    typeof settings.twoHandZoom === "boolean" &&
    isNumberInRange(settings.trackingLostTimeoutMs, 1500, 10000)
  );
}

function serializeReplacementPart(part: ReplacementPart): SerializedReplacementPart {
  return {
    id: part.id,
    name: part.name,
    category: part.category,
    source: part.source,
    assetName: part.assetName,
    asset: part.asset as ModelAssetData,
    dimensions: part.dimensions,
    bounds: part.bounds,
    materialNames: part.materialNames,
    transform: part.transform,
    attachment: part.attachment,
    compatibility: part.compatibility,
    compatibilityReason: part.compatibilityReason,
    installed: part.installed,
    replacesComponentId: part.replacesComponentId,
    originalComponentPreserved: part.originalComponentPreserved,
  };
}

export function serializeProject(
  modelAsset: ModelAssetData | null,
  customization: Customization,
  componentMaterials: Record<string, ComponentMaterialOverride>,
  componentRotations: Record<string, [number, number, number]>,
  replacementParts: ReplacementPart[] = [],
  gestureSettings?: GestureSettings,
  vehicleMetadata?: VehicleProjectMetadata,
): string {
  const project: StudioProject = {
    version: 2,
    model: modelAsset
      ? { source: "imported", asset: modelAsset, ...(vehicleMetadata ?? {}) }
      : { source: "procedural" },
    customization,
    componentMaterials,
    componentRotations,
    replacementParts: replacementParts
      .filter((part) => Boolean(part.asset))
      .map(serializeReplacementPart),
    gestureSettings,
  };
  return JSON.stringify(project, null, 2);
}

export function parseProject(text: string): StudioProject {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("The project file is not valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("This file is not a valid Gesture Drive project.");
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 2 || !candidate.model || typeof candidate.model !== "object") {
    if (candidate.version === 1 && candidate.model === "procedural-sport-coupe") {
      return {
        version: 2,
        model: { source: "procedural" },
        customization: validateCustomization(candidate.customization),
        componentMaterials: {},
        componentRotations: {},
        replacementParts: [],
      };
    }
    throw new Error("This project version or model source is not supported.");
  }
  const model = candidate.model as Record<string, unknown>;
  let parsedModel: StudioProject["model"];
  if (model.source === "procedural") {
    parsedModel = { source: "procedural" };
  } else if (model.source === "imported" && isModelAsset(model.asset)) {
    const metadata: VehicleProjectMetadata = {};
    if (model.catalogueVehicleId !== undefined) {
      if (typeof model.catalogueVehicleId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(model.catalogueVehicleId)) {
        throw new Error("The project contains an invalid catalogue vehicle ID.");
      }
      metadata.catalogueVehicleId = model.catalogueVehicleId;
    }
    if (model.displayName !== undefined) {
      if (typeof model.displayName !== "string" || !model.displayName.trim() || model.displayName.length > 120) {
        throw new Error("The project contains an invalid vehicle display name.");
      }
      metadata.displayName = model.displayName;
    }
    if (model.assetSource !== undefined) {
      if (typeof model.assetSource !== "string" || !model.assetSource.trim() || model.assetSource.length > 200) {
        throw new Error("The project contains invalid asset source information.");
      }
      metadata.assetSource = model.assetSource;
    }
    if (model.assetVerification !== undefined) {
      if (model.assetVerification !== "verified" && model.assetVerification !== "unverified") {
        throw new Error("The project contains invalid asset verification information.");
      }
      metadata.assetVerification = model.assetVerification;
    }
    parsedModel = { source: "imported", asset: model.asset, ...metadata };
  } else {
    throw new Error("The project contains an invalid or unsupported model asset.");
  }
  const componentMaterials = candidate.componentMaterials ?? {};
  const componentRotations = candidate.componentRotations ?? {};
  if (!isComponentMaterials(componentMaterials) || !isComponentRotations(componentRotations)) {
    throw new Error("The project contains invalid component customization data.");
  }
  const replacementParts = candidate.replacementParts ?? [];
  if (!Array.isArray(replacementParts) || !replacementParts.every(isReplacementPart)) {
    throw new Error("The project contains invalid replacement-part data.");
  }
  if (candidate.gestureSettings !== undefined && !isGestureSettings(candidate.gestureSettings)) {
    throw new Error("The project contains invalid gesture settings.");
  }
  return {
    version: 2,
    model: parsedModel,
    customization: validateCustomization(candidate.customization),
    componentMaterials,
    componentRotations,
    replacementParts,
    gestureSettings: candidate.gestureSettings as GestureSettings | undefined,
  };
}

function validateCustomization(value: unknown): Customization {
  if (!value || typeof value !== "object") {
    throw new Error("The project contains invalid customization data.");
  }
  const customization = value as Partial<Customization>;
  if (
    !isColor(customization.paint) ||
    !isFinish(customization.finish) ||
    !isNumberInRange(customization.paintMetallic, 0, 1) ||
    !isNumberInRange(customization.paintRoughness, 0, 1) ||
    !isNumberInRange(customization.clearCoat, 0, 1) ||
    typeof customization.spoiler !== "boolean" ||
    typeof customization.windowTint !== "boolean" ||
    !isColor(customization.wheelColor) ||
    (customization.wheelDesign !== undefined &&
      customization.wheelDesign !== "five-spoke" &&
      customization.wheelDesign !== "turbine") ||
    (customization.spoilerStyle !== undefined &&
      customization.spoilerStyle !== "sport" &&
      customization.spoilerStyle !== "track") ||
    (customization.bumperStyle !== undefined &&
      customization.bumperStyle !== "street" &&
      customization.bumperStyle !== "track") ||
    (customization.environment !== undefined &&
      customization.environment !== "dark-showroom" &&
      customization.environment !== "luxury-studio" &&
      customization.environment !== "daylight" &&
      customization.environment !== "neutral-inspection") ||
    (customization.quality !== undefined &&
      customization.quality !== "low" &&
      customization.quality !== "medium" &&
      customization.quality !== "high" &&
      customization.quality !== "ultra")
  ) {
    throw new Error("The project contains unsupported customization values.");
  }
  return {
    paint: customization.paint,
    finish: customization.finish,
    paintMetallic: customization.paintMetallic ?? 0.82,
    paintRoughness: customization.paintRoughness ?? 0.3,
    clearCoat: customization.clearCoat ?? 0.7,
    spoiler: customization.spoiler,
    windowTint: customization.windowTint,
    wheelColor: customization.wheelColor,
    wheelDesign: (customization.wheelDesign as WheelDesign | undefined) ?? "five-spoke",
    spoilerStyle: (customization.spoilerStyle as SpoilerStyle | undefined) ?? "sport",
    bumperStyle: (customization.bumperStyle as BumperStyle | undefined) ?? "street",
    environment: (customization.environment as EnvironmentPreset | undefined) ?? "dark-showroom",
    quality: (customization.quality as QualityLevel | undefined) ?? "high",
  };
}
