import * as THREE from "three";

export type ComponentCategory =
  | "body"
  | "bonnet"
  | "door"
  | "bumper"
  | "wheel"
  | "tyre"
  | "headlight"
  | "tail-light"
  | "window"
  | "spoiler"
  | "engine"
  | "exhaust"
  | "seat"
  | "dashboard"
  | "steering-wheel"
  | "front-fender"
  | "rear-fender"
  | "grille"
  | "rim"
  | "brake-disc"
  | "brake-caliper"
  | "transmission"
  | "radiator"
  | "battery"
  | "suspension"
  | "door-panel"
  | "center-console"
  | "infotainment-screen"
  | "interior-trim"
  | "other";

export type VehicleComponentMapping = {
  componentId?: string;
  meshName: string;
  displayName?: string;
  category?: ComponentCategory;
  focusPoint?: [number, number, number];
  cameraDistance?: number;
  allowedModifications?: string[];
  inspectable?: boolean;
  customizable?: boolean;
};

export type VehicleComponent = {
  id: string;
  name: string;
  category: ComponentCategory;
  meshCount: number;
  editable: boolean;
  transformable: boolean;
  bounds: THREE.Box3;
  object: THREE.Object3D;
  originalPosition: THREE.Vector3;
  originalQuaternion: THREE.Quaternion;
  originalScale: THREE.Vector3;
  explodeOffset: THREE.Vector3;
  focusPoint: THREE.Vector3;
  cameraDistance: number;
  originalMaterialNames: string[];
  allowedModifications: string[];
  inspectable: boolean;
  customizable: boolean;
};

const CATEGORY_PATTERNS: Array<[ComponentCategory, RegExp]> = [
  ["front-fender", /(^|[^a-z])front[_\s-]*fender(?=$|[^a-z])/i],
  ["rear-fender", /(^|[^a-z])rear[_\s-]*fender(?=$|[^a-z])/i],
  ["door-panel", /(^|[^a-z])(door[_\s-]*panel|interior[_\s-]*door)(?=$|[^a-z])/i],
  ["center-console", /(^|[^a-z])(center|centre)[_\s-]*console(?=$|[^a-z])/i],
  ["infotainment-screen", /(^|[^a-z])(infotainment|media)[_\s-]*(screen|display)?(?=$|[^a-z])/i],
  ["brake-caliper", /(^|[^a-z])brake[_\s-]*caliper(?=$|[^a-z])/i],
  ["brake-disc", /(^|[^a-z])(brake[_\s-]*disc|rotor)(?=$|[^a-z])/i],
  ["transmission", /(^|[^a-z])(transmission|gearbox)(?=$|[^a-z])/i],
  ["radiator", /(^|[^a-z])radiator(?=$|[^a-z])/i],
  ["battery", /(^|[^a-z])battery(?=$|[^a-z])/i],
  ["suspension", /(^|[^a-z])suspension(?=$|[^a-z])/i],
  ["grille", /(^|[^a-z])(grille|grill)(?=$|[^a-z])/i],
  ["rim", /(^|[^a-z])(rim|alloy)(?=$|[^a-z])/i],
  ["interior-trim", /(^|[^a-z])interior[_\s-]*trim(?=$|[^a-z])/i],
  ["steering-wheel", /(^|[^a-z])(steering[_\s-]*wheel|steering|wheel[_\s-]*steer)(?=$|[^a-z])/i],
  ["bonnet", /(^|[^a-z])(hood|bonnet)(?=$|[^a-z])/i],
  ["bumper", /(^|[^a-z])(front|rear)?[_\s-]*bumper(?=$|[^a-z])/i],
  ["door", /(^|[^a-z])(left|right|front|rear)?[_\s-]*door(?=$|[^a-z])/i],
  ["wheel", /(^|[^a-z])(wheel|rim|alloy)(?=$|[^a-z])/i],
  ["tyre", /(^|[^a-z])(tyre|tire)(?=$|[^a-z])/i],
  ["headlight", /(^|[^a-z])(headlight|headlamp|front[_\s-]*light)(?=$|[^a-z])/i],
  ["tail-light", /(^|[^a-z])(tail[_\s-]*light|taillight|rear[_\s-]*lamp)(?=$|[^a-z])/i],
  ["window", /(^|[^a-z])(window|windscreen|windshield|glass)(?=$|[^a-z])/i],
  ["spoiler", /(^|[^a-z])(spoiler|wing)(?=$|[^a-z])/i],
  ["engine", /(^|[^a-z])(engine|motor)(?=$|[^a-z])/i],
  ["exhaust", /(^|[^a-z])(exhaust|muffler|tailpipe)(?=$|[^a-z])/i],
  ["seat", /(^|[^a-z])(seat|stool)(?=$|[^a-z])/i],
  ["dashboard", /(^|[^a-z])(dashboard|dash|instrument[_\s-]*panel)(?=$|[^a-z])/i],
  ["body", /(^|[^a-z])(body|chassis|shell|frame|fender|quarter[_\s-]*panel|roof)(?=$|[^a-z])/i],
];

export function categorizeComponent(name: string): ComponentCategory {
  for (const [category, pattern] of CATEGORY_PATTERNS) {
    if (pattern.test(name)) return category;
  }
  return "other";
}

function displayName(name: string): string {
  const clean = name.replace(/[_-]+/g, " ").trim();
  return clean.replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Unnamed component";
}

function countMeshes(object: THREE.Object3D): number {
  let count = 0;
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) count += 1;
  });
  return count;
}

export function buildComponentRegistry(
  root: THREE.Object3D,
  mappings: VehicleComponentMapping[] = [],
): { components: VehicleComponent[]; mergedMeshCount: number; unmatchedMappings: string[] } {
  root.updateMatrixWorld(true);
  const modelBounds = new THREE.Box3().setFromObject(root);
  const modelCenter = modelBounds.getCenter(new THREE.Vector3());
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const modelRadius = Math.max(modelSize.x, modelSize.y, modelSize.z, 1);
  const mappingByName = new Map(mappings.map((mapping) => [mapping.meshName.trim().toLowerCase(), mapping]));
  const matchedMappings = new Set<string>();
  const mappingFor = (object: THREE.Object3D): VehicleComponentMapping | undefined =>
    mappingByName.get(object.name.trim().toLowerCase());
  const categoryFor = (object: THREE.Object3D): ComponentCategory =>
    mappingFor(object)?.category ?? categorizeComponent(object.name);
  const namedRoots: THREE.Object3D[] = [];

  root.traverse((object) => {
    if (object === root || !object.name.trim() || countMeshes(object) === 0) return;
    const category = categoryFor(object);
    if (category === "other" && !mappingFor(object)) return;
    let parent = object.parent;
    while (parent && parent !== root) {
      const parentComponent = namedRoots.find((candidate) => candidate === parent);
      if (parentComponent && categoryFor(parentComponent) === category) return;
      parent = parent.parent;
    }
    namedRoots.push(object);
  });

  const componentRoots = namedRoots.filter((candidate) => {
    const category = categoryFor(candidate);
    return !namedRoots.some((other) => {
      if (other === candidate || categoryFor(other) === category) return false;
      let ancestor = other.parent;
      while (ancestor && ancestor !== candidate) ancestor = ancestor.parent;
      return ancestor === candidate;
    });
  });
  const components: VehicleComponent[] = [];
  const claimedMeshes = new Set<THREE.Object3D>();

  const addComponent = (object: THREE.Object3D, fallbackName?: string): void => {
    const meshCount = countMeshes(object);
    if (meshCount === 0) return;
    const mapping = fallbackName ? undefined : mappingByName.get(object.name.trim().toLowerCase());
    if (mapping) matchedMappings.add(mapping.meshName.trim().toLowerCase());
    const allowedModifications =
      mapping?.allowedModifications ?? (object !== root && !fallbackName ? ["material", "transform"] : ["material"]);
    const customizable = mapping?.customizable ?? true;
    const editable = customizable && allowedModifications.includes("material");
    const transformable =
      object !== root && !fallbackName && customizable && allowedModifications.includes("transform");
    let bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) bounds = modelBounds.clone();
    const center = bounds.getCenter(new THREE.Vector3());
    const worldDirection = center.sub(modelCenter);
    if (worldDirection.lengthSq() < 1e-8) worldDirection.set(0, 0.3, 0.8);
    worldDirection.normalize().multiplyScalar(modelRadius * 0.32);
    const parent = object.parent;
    const localOffset =
      object === root
        ? new THREE.Vector3()
        : parent
          ? parent.worldToLocal(center.clone().add(worldDirection)).sub(parent.worldToLocal(center.clone()))
          : worldDirection;
    const id = mapping?.componentId ?? `model-${components.length + 1}`;
    const materialNames = new Set<string>();
    object.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const materials = Array.isArray((child as THREE.Mesh).material)
        ? (child as THREE.Mesh).material as THREE.Material[]
        : [(child as THREE.Mesh).material as THREE.Material];
      for (const material of materials) {
        if (material.name.trim()) materialNames.add(material.name.trim());
      }
    });
    object.userData.gd3dComponentId = id;
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.userData.gd3dComponentId = id;
        claimedMeshes.add(child);
      }
    });
    components.push({
      id,
      name: mapping?.displayName ?? displayName(fallbackName ?? object.name),
      category: fallbackName ? "body" : categoryFor(object),
      meshCount,
      editable,
      transformable,
      bounds,
      object,
      originalPosition: object.position.clone(),
      originalQuaternion: object.quaternion.clone(),
      originalScale: object.scale.clone(),
      explodeOffset: localOffset,
      focusPoint: mapping?.focusPoint
        ? object.localToWorld(new THREE.Vector3(...mapping.focusPoint))
        : bounds.getCenter(new THREE.Vector3()),
      cameraDistance: mapping?.cameraDistance ?? Math.max(1.7, Math.min(7.5, bounds.getSize(new THREE.Vector3()).length() * 1.9)),
      originalMaterialNames: [...materialNames],
      allowedModifications,
      inspectable: mapping?.inspectable ?? true,
      customizable,
    });
  };

  for (const object of componentRoots) addComponent(object);

  let unclaimedMeshes = 0;
  root.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh || claimedMeshes.has(object)) return;
    unclaimedMeshes += 1;
  });
  if (components.length === 0) {
    const meshCount = countMeshes(root);
    if (meshCount > 0) addComponent(root, "Vehicle body (merged mesh)");
    unclaimedMeshes = 0;
  } else if (unclaimedMeshes > 0) {
    const merged = new THREE.Group();
    merged.name = "Unlabelled vehicle geometry";
    const unclaimed: THREE.Object3D[] = [];
    root.traverse((object) => {
      if ((object as THREE.Mesh).isMesh && !claimedMeshes.has(object)) unclaimed.push(object);
    });
    root.add(merged);
    for (const mesh of unclaimed) {
      if (mesh !== merged) merged.attach(mesh);
    }
    addComponent(merged, "Unlabelled geometry (merged)");
  }

  root.updateMatrixWorld(true);
  return {
    components,
    mergedMeshCount: unclaimedMeshes,
    unmatchedMappings: mappings
      .filter((mapping) => !matchedMappings.has(mapping.meshName.trim().toLowerCase()))
      .map((mapping) => mapping.meshName),
  };
}

export function setExplodedView(components: VehicleComponent[], amount: number): void {
  const factor = THREE.MathUtils.clamp(amount, 0, 1);
  for (const component of components) {
    component.object.position
      .copy(component.originalPosition)
      .addScaledVector(component.explodeOffset, factor);
    component.object.quaternion.copy(component.originalQuaternion);
    component.object.scale.copy(component.originalScale);
  }
}

export function resetComponentTransform(component: VehicleComponent): void {
  component.object.position.copy(component.originalPosition);
  component.object.quaternion.copy(component.originalQuaternion);
  component.object.scale.copy(component.originalScale);
}

export function componentForObject(
  object: THREE.Object3D,
  components: VehicleComponent[],
): VehicleComponent | undefined {
  let current: THREE.Object3D | null = object;
  while (current) {
    const id = current.userData.gd3dComponentId ?? current.userData.partId;
    if (typeof id === "string") return components.find((component) => component.id === id);
    current = current.parent;
  }
  return undefined;
}

export function componentFocusBounds(
  components: VehicleComponent[],
  selectedId: string,
  root: THREE.Object3D,
): THREE.Box3 {
  const component = components.find((candidate) => candidate.id === selectedId);
  return new THREE.Box3().setFromObject(component?.object ?? root);
}

export function rotateComponent(
  component: VehicleComponent,
  axis: "x" | "y" | "z",
  radians: number,
): void {
  if (!component.transformable) return;
  component.object.quaternion.copy(component.originalQuaternion);
  component.object.rotateOnAxis(
    axis === "x" ? new THREE.Vector3(1, 0, 0) : axis === "y" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1),
    radians,
  );
}

export function applyComponentRotation(
  component: VehicleComponent,
  rotation: [number, number, number],
): void {
  if (!component.transformable) return;
  const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation, "XYZ"));
  component.object.quaternion.copy(component.originalQuaternion).multiply(delta);
}

export function setComponentMaterial(
  component: VehicleComponent,
  material: { color?: string; metalness?: number; roughness?: number },
): void {
  component.object.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const current of materials) {
      const candidate = current as THREE.Material & {
        color?: THREE.Color;
        metalness?: number;
        roughness?: number;
      };
      if (material.color && candidate.color) candidate.color.set(material.color);
      if (material.metalness !== undefined && "metalness" in candidate) {
        candidate.metalness = material.metalness;
      }
      if (material.roughness !== undefined && "roughness" in candidate) {
        candidate.roughness = material.roughness;
      }
      candidate.needsUpdate = true;
    }
  });
}
