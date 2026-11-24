import manifest from "./manifest.json";
import type { ComponentCategory, VehicleCatalogueRecord, VehicleComponentMapping } from "./types";

const COMPONENT_CATEGORIES: ComponentCategory[] = [
  "body",
  "bonnet",
  "door",
  "bumper",
  "wheel",
  "tyre",
  "headlight",
  "tail-light",
  "window",
  "spoiler",
  "engine",
  "exhaust",
  "seat",
  "dashboard",
  "steering-wheel",
  "front-fender",
  "rear-fender",
  "grille",
  "rim",
  "brake-disc",
  "brake-caliper",
  "transmission",
  "radiator",
  "battery",
  "suspension",
  "door-panel",
  "center-console",
  "infotainment-screen",
  "interior-trim",
  "other",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isOptionalText(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.trim().length > 0);
}

function isAttribution(value: unknown): boolean {
  return value === null || (
    isRecord(value) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    (value.url === null || typeof value.url === "string") &&
    (value.attribution === null || typeof value.attribution === "string")
  );
}

function isSafeRemoteAssetUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
    const octets = host.split(".").map(Number);
    const isIpv4 = octets.length === 4 && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255);
    const privateIpv4 = isIpv4 && (
      octets[0] === 0 ||
      octets[0] === 10 ||
      octets[0] === 127 ||
      octets[0] >= 224 ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );
    const privateHost =
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "::1" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe80:");
    const isIpLiteral = isIpv4 || host.includes(":");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      !privateIpv4 &&
      !privateHost &&
      (isIpLiteral || host.includes("."))
    );
  } catch {
    return false;
  }
}

function validateRelativeAssetPath(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value) ||
    value.replace(/\\/g, "/").split("/").some((segment) => segment === ".." || !segment)
  ) {
    throw new Error(`${label} must be a safe, app-relative path.`);
  }
}

function validateComponentMapping(value: unknown, vehicleId: string): asserts value is VehicleComponentMapping {
  if (!isRecord(value)) throw new Error(`Vehicle "${vehicleId}" has an invalid component mapping.`);
  if (
    typeof value.meshName !== "string" ||
    !value.meshName.trim() ||
    (value.componentId !== undefined && (typeof value.componentId !== "string" || !value.componentId.trim())) ||
    (value.displayName !== undefined && (typeof value.displayName !== "string" || !value.displayName.trim())) ||
    (value.category !== undefined && !COMPONENT_CATEGORIES.includes(value.category as ComponentCategory)) ||
    (value.cameraDistance !== undefined &&
      (typeof value.cameraDistance !== "number" || !Number.isFinite(value.cameraDistance) || value.cameraDistance < 0.5 || value.cameraDistance > 20)) ||
    (value.focusPoint !== undefined &&
      (!Array.isArray(value.focusPoint) || value.focusPoint.length !== 3 ||
        !value.focusPoint.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate)))) ||
    (value.allowedModifications !== undefined &&
      (!Array.isArray(value.allowedModifications) || !value.allowedModifications.every((item) => typeof item === "string"))) ||
    (value.inspectable !== undefined && typeof value.inspectable !== "boolean") ||
    (value.customizable !== undefined && typeof value.customizable !== "boolean")
  ) {
    throw new Error(`Vehicle "${vehicleId}" has an invalid component mapping for "${String(value.meshName)}".`);
  }
}

export function validateVehicleCatalogue(value: unknown): VehicleCatalogueRecord[] {
  if (!Array.isArray(value)) throw new Error("The vehicle manifest must be an array.");
  const ids = new Set<string>();
  const records = value.map((entry): VehicleCatalogueRecord => {
    if (!isRecord(entry)) throw new Error("The vehicle manifest contains an invalid entry.");
    const id = entry.id;
    if (typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || ids.has(id)) {
      throw new Error(`The vehicle manifest contains an invalid or duplicate ID: ${String(id)}.`);
    }
    ids.add(id);
    if (
      typeof entry.manufacturer !== "string" || !entry.manufacturer.trim() ||
      typeof entry.model !== "string" || !entry.model.trim() ||
      typeof entry.displayName !== "string" || !entry.displayName.trim() ||
      !isOptionalText(entry.generation) ||
      !isOptionalText(entry.variant) ||
      (entry.year !== null && (
        typeof entry.year !== "number" || !Number.isInteger(entry.year) || entry.year < 1886 || entry.year > 2100
      )) ||
      (entry.thumbnail !== null && typeof entry.thumbnail !== "string") ||
      (entry.specifications !== null && !isRecord(entry.specifications)) ||
      !Array.isArray(entry.components) ||
      !Array.isArray(entry.customizationOptions) ||
      !entry.customizationOptions.every((option) => typeof option === "string")
    ) {
      throw new Error(`Vehicle "${id}" has invalid metadata.`);
    }

    const asset = entry.asset;
    if (
      !isRecord(asset) ||
      !["available", "unavailable", "license-review-required"].includes(String(asset.status)) ||
      !Array.isArray(asset.files) ||
      !asset.files.every((path) => typeof path === "string") ||
      !isAttribution(asset.source) ||
      !isAttribution(asset.license) ||
      !["verified", "unverified", "not-available"].includes(String(asset.accuracy))
    ) {
      throw new Error(`Vehicle "${id}" has invalid asset metadata.`);
    }

    if (asset.status === "unavailable") {
      if (
        asset.mainFile !== null ||
        asset.files.length !== 0 ||
        asset.accuracy !== "not-available" ||
        (asset.remoteFiles !== undefined && asset.remoteFiles !== null && (!Array.isArray(asset.remoteFiles) || asset.remoteFiles.length !== 0)) ||
        (asset.integrity !== undefined && asset.integrity !== null && (!isRecord(asset.integrity) || Object.keys(asset.integrity).length !== 0))
      ) {
        throw new Error(`Unavailable vehicle "${id}" cannot reference an asset.`);
      }
    } else {
      validateRelativeAssetPath(asset.mainFile, `Vehicle "${id}" mainFile`);
      if (!/\.(glb|gltf)$/i.test(asset.mainFile)) {
        throw new Error(`Vehicle "${id}" mainFile must be a GLB or glTF file.`);
      }
      for (const path of asset.files) validateRelativeAssetPath(path, `Vehicle "${id}" asset file`);
      if (!asset.files.includes(asset.mainFile)) {
        throw new Error(`Vehicle "${id}" asset files must include its main model file.`);
      }
      if (
        (asset.status === "available" && asset.accuracy !== "verified") ||
        (asset.status === "license-review-required" && asset.accuracy !== "unverified")
      ) {
        throw new Error(`Vehicle "${id}" asset status does not match its verification state.`);
      }

      if (asset.remoteFiles !== undefined && asset.remoteFiles !== null) {
        if (!Array.isArray(asset.remoteFiles) || asset.remoteFiles.length !== asset.files.length) {
          throw new Error(`Vehicle "${id}" remote files must map every registered asset file.`);
        }
        const remotePaths = new Set<string>();
        for (const remoteFile of asset.remoteFiles) {
          if (
            !isRecord(remoteFile) ||
            typeof remoteFile.path !== "string" ||
            !asset.files.includes(remoteFile.path) ||
            remotePaths.has(remoteFile.path) ||
            !isSafeRemoteAssetUrl(remoteFile.url)
          ) {
            throw new Error(`Vehicle "${id}" has an invalid remote asset file.`);
          }
          remotePaths.add(remoteFile.path);
        }
      }

      if (asset.integrity !== undefined && asset.integrity !== null) {
        if (!isRecord(asset.integrity)) throw new Error(`Vehicle "${id}" has invalid asset integrity metadata.`);
        for (const [assetPath, hash] of Object.entries(asset.integrity)) {
          if (!asset.files.includes(assetPath) || typeof hash !== "string" || !/^[a-f0-9]{64}$/i.test(hash)) {
            throw new Error(`Vehicle "${id}" has invalid SHA-256 metadata for "${assetPath}".`);
          }
        }
      }
      if (asset.accuracy === "verified") {
        if (
          !isRecord(asset.source) ||
          !asset.source.url ||
          !isRecord(asset.license) ||
          !asset.license.url
        ) {
          throw new Error(`Verified vehicle "${id}" requires source and license URLs.`);
        }
        const integrity = asset.integrity;
        if (
          !isRecord(integrity) ||
          Object.keys(integrity).length !== asset.files.length ||
          asset.files.some((path) => typeof integrity[path] !== "string")
        ) {
          throw new Error(`Verified vehicle "${id}" requires a SHA-256 hash for every asset file.`);
        }
      }
    }
    if (entry.thumbnail) validateRelativeAssetPath(entry.thumbnail, `Vehicle "${id}" thumbnail`);

    const componentMappings = entry.components as unknown[];
    const mappingNames = new Set<string>();
    const componentIds = new Set<string>();
    for (const mapping of componentMappings) {
      validateComponentMapping(mapping, id);
      const meshName = mapping.meshName.trim().toLowerCase();
      if (mappingNames.has(meshName)) {
        throw new Error(`Vehicle "${id}" maps mesh "${mapping.meshName}" more than once.`);
      }
      mappingNames.add(meshName);
      if (mapping.componentId) {
        if (componentIds.has(mapping.componentId)) {
          throw new Error(`Vehicle "${id}" has duplicate component ID "${mapping.componentId}".`);
        }
        componentIds.add(mapping.componentId);
      }
    }

    if (entry.specifications) {
      for (const [name, specification] of Object.entries(entry.specifications)) {
        if (!name.trim() || (typeof specification !== "string" && (
          typeof specification !== "number" || !Number.isFinite(specification)
        ))) {
          throw new Error(`Vehicle "${id}" has invalid specification data.`);
        }
      }
    }

    return entry as unknown as VehicleCatalogueRecord;
  });
  return records;
}

export const VEHICLE_CATALOGUE = validateVehicleCatalogue(manifest);
export const VEHICLE_MANUFACTURERS = [...new Set(VEHICLE_CATALOGUE.map((vehicle) => vehicle.manufacturer))];
export const VEHICLE_CATALOGUE_BY_ID = new Map(VEHICLE_CATALOGUE.map((vehicle) => [vehicle.id, vehicle]));

export function getVehicleCatalogueRecord(id: string): VehicleCatalogueRecord | undefined {
  return VEHICLE_CATALOGUE_BY_ID.get(id);
}
