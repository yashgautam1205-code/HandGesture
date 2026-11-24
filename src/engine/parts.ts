import * as THREE from "three";
import type { ModelAssetData } from "./modelLoader";

export type PartCategory =
  | "wheel"
  | "rim"
  | "tyre"
  | "spoiler"
  | "front-bumper"
  | "rear-bumper"
  | "headlight"
  | "taillight"
  | "exhaust"
  | "side-skirt"
  | "mirror";

export type CompatibilityStatus = "verified" | "user-configured" | "unverified" | "incompatible";

export type PartTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

export type AttachmentPoint = {
  position: [number, number, number];
  normal: [number, number, number];
};

export type ReplacementPart = {
  id: string;
  name: string;
  category: PartCategory;
  source: "imported";
  assetName: string;
  asset?: ModelAssetData;
  object?: THREE.Object3D;
  dimensions: { width: number; height: number; depth: number };
  bounds: { min: [number, number, number]; max: [number, number, number] };
  materialNames: string[];
  transform: PartTransform;
  attachment: AttachmentPoint | null;
  compatibility: CompatibilityStatus;
  compatibilityReason: string;
  installed: boolean;
  replacesComponentId: string | null;
  originalComponentPreserved: boolean;
};

export const PART_CATEGORIES: PartCategory[] = [
  "wheel",
  "rim",
  "tyre",
  "spoiler",
  "front-bumper",
  "rear-bumper",
  "headlight",
  "taillight",
  "exhaust",
  "side-skirt",
  "mirror",
];

export function computeBounds(object: THREE.Object3D): THREE.Box3 {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}

export function dimensionsFromBounds(bounds: THREE.Box3): { width: number; height: number; depth: number } {
  const size = bounds.getSize(new THREE.Vector3());
  return { width: size.x, height: size.y, depth: size.z };
}

export function createPartFromObject(
  object: THREE.Object3D,
  category: PartCategory,
  assetName: string,
  asset?: ModelAssetData,
): ReplacementPart {
  const bounds = computeBounds(object);
  const min = bounds.min.toArray() as [number, number, number];
  const max = bounds.max.toArray() as [number, number, number];
  const materialNames = new Set<string>();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (material?.name) materialNames.add(material.name);
    }
  });
  return {
    id: `part-${Math.random().toString(36).slice(2, 10)}`,
    name: object.name || assetName,
    category,
    source: "imported",
    assetName,
    asset,
    object,
    dimensions: dimensionsFromBounds(bounds),
    bounds: { min, max },
    materialNames: [...materialNames],
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    attachment: null,
    compatibility: "unverified",
    compatibilityReason: "Not evaluated",
    installed: false,
    replacesComponentId: null,
    originalComponentPreserved: true,
  };
}

export function evaluateCompatibility(
  part: ReplacementPart,
  targetComponentName: string,
  targetBounds: { width: number; height: number; depth: number },
): { status: CompatibilityStatus; reason: string } {
  const sizeRatio = Math.max(
    part.dimensions.width / Math.max(targetBounds.width, 1e-6),
    part.dimensions.height / Math.max(targetBounds.height, 1e-6),
    part.dimensions.depth / Math.max(targetBounds.depth, 1e-6),
  );
  if (sizeRatio > 3 || sizeRatio < 0.1) {
    return { status: "incompatible", reason: "Dimension mismatch exceeds tolerance" };
  }
  if (part.attachment) {
    return { status: "user-configured", reason: "Attachment configured by user" };
  }
  const nameMatch = targetComponentName.toLowerCase().includes(part.category.replace("-", " "));
  if (nameMatch) {
    return { status: "verified", reason: "Name and dimension match" };
  }
  return { status: "unverified", reason: "No verified metadata match" };
}

export function applyTransformToObject(object: THREE.Object3D, transform: PartTransform): void {
  object.position.set(...transform.position);
  object.rotation.set(...transform.rotation);
  object.scale.set(...transform.scale);
}

export function applyPartPlacement(
  object: THREE.Object3D,
  transform: PartTransform,
  basePosition: THREE.Vector3,
  attachmentOffset: [number, number, number] = [0, 0, 0],
): void {
  object.position.set(
    basePosition.x + attachmentOffset[0] + transform.position[0],
    basePosition.y + attachmentOffset[1] + transform.position[1],
    basePosition.z + attachmentOffset[2] + transform.position[2],
  );
  object.rotation.set(...transform.rotation);
  object.scale.set(...transform.scale);
}

export function clonePartObject(object: THREE.Object3D): THREE.Object3D {
  return object.clone(true);
}

export function disposePartObject(object: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry) geometries.add(mesh.geometry);
    const current = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of current) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

export function installPart(part: ReplacementPart, replacesComponentId: string | null): ReplacementPart {
  return { ...part, installed: true, replacesComponentId, originalComponentPreserved: true };
}

export function removePart(part: ReplacementPart): ReplacementPart {
  return { ...part, installed: false, replacesComponentId: null };
}