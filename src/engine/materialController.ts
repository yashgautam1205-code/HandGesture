import * as THREE from "three";
import type { ComponentMaterialOverride, Customization } from "../store/studio";
import type { VehicleComponent } from "./components";

type SurfaceMaterial = THREE.Material & {
  color?: THREE.Color;
  metalness?: number;
  roughness?: number;
  emissive?: THREE.Color;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  opacity?: number;
  envMapIntensity?: number;
  wireframe?: boolean;
};

const BODY_CATEGORIES = new Set(["body", "bonnet", "door", "bumper", "spoiler"]);

function uniqueMaterials(materials: THREE.Material | THREE.Material[]): THREE.Material[] {
  return Array.isArray(materials) ? materials : [materials];
}

function resolveStyle(
  category: string,
  customization: Customization,
  override?: ComponentMaterialOverride,
): {
  color: string;
  finish: "gloss" | "matte" | "metallic";
  metallic: number;
  roughness: number;
  clearCoat: number;
  emissive?: string;
  opacity?: number;
} {
  if (override) {
    return {
      color: override.color,
      finish: override.finish,
      metallic: override.metallic ?? (override.finish === "metallic" ? 0.9 : 0.35),
      roughness: override.roughness ?? (override.finish === "matte" ? 0.88 : 0.28),
      clearCoat: override.clearCoat ?? 0.7,
      emissive: override.emissive,
      opacity: override.opacity,
    };
  }
  if (BODY_CATEGORIES.has(category)) {
    return {
      color: customization.paint,
      finish: customization.finish,
      metallic: customization.paintMetallic,
      roughness: customization.paintRoughness,
      clearCoat: customization.clearCoat,
    };
  }
  if (category === "wheel") {
    return {
      color: customization.wheelColor,
      finish: "metallic",
      metallic: 0.92,
      roughness: 0.18,
      clearCoat: 0.25,
    };
  }
  if (category === "window") {
    return {
      color: customization.windowTint ? "#10252d" : "#dfeef3",
      finish: "gloss",
      metallic: 0.08,
      roughness: 0.08,
      clearCoat: 1,
    };
  }
  if (category === "tyre") {
    return {
      color: "#171b20",
      finish: "matte",
      metallic: 0.06,
      roughness: 0.92,
      clearCoat: 0,
    };
  }
  return {
    color: customization.paint,
    finish: customization.finish,
    metallic: customization.paintMetallic,
    roughness: customization.paintRoughness,
    clearCoat: customization.clearCoat,
  };
}

function applyMaterialStyle(material: SurfaceMaterial, style: ReturnType<typeof resolveStyle>): void {
  if (material.color) material.color.set(style.color);
  if ("metalness" in material) material.metalness = style.metallic;
  if ("roughness" in material) material.roughness = style.roughness;
  if ("clearcoat" in material) material.clearcoat = style.clearCoat;
  if ("clearcoatRoughness" in material) material.clearcoatRoughness = Math.min(0.75, style.roughness * 0.8);
  if ("envMapIntensity" in material) material.envMapIntensity = style.finish === "metallic" ? 1.3 : 0.8;
  if ("transmission" in material) material.transmission = style.finish === "gloss" ? 0.22 : 0.08;
  if (style.opacity !== undefined && "opacity" in material) {
    material.opacity = style.opacity;
    material.transparent = style.opacity < 1;
  } else if ("opacity" in material) {
    material.opacity = style.finish === "matte" ? 0.95 : 1;
  }
  if (style.emissive && "emissive" in material && material.emissive) {
    (material.emissive as THREE.Color).set(style.emissive);
  }
  material.needsUpdate = true;
}

export class MaterialController {
  private readonly originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly overrides = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly categoryById = new Map<string, string>();
  private readonly editableById = new Map<string, boolean>();
  private wireframe = false;

  constructor(
    root: THREE.Object3D,
    components: VehicleComponent[],
  ) {
    for (const component of components) {
      this.categoryById.set(component.id, component.category);
      this.editableById.set(component.id, component.editable);
    }
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) this.originals.set(mesh, mesh.material);
    });
  }

  apply(
    customization: Customization,
    componentOverrides: Record<string, ComponentMaterialOverride>,
  ): void {
    for (const [mesh, original] of this.originals) {
      const id = String(mesh.userData.gd3dComponentId ?? "");
      const category = this.categoryById.get(id) ?? "other";
      const override = componentOverrides[id];
      const style = resolveStyle(category, customization, override);
      const editable = this.editableById.get(id) !== false;
      const current = this.overrides.get(mesh);
      if (current) for (const material of uniqueMaterials(current)) material.dispose();

      const updated = uniqueMaterials(original).map((material) => {
        const clone = material.clone() as SurfaceMaterial;
        if ("wireframe" in clone) clone.wireframe = this.wireframe;
        if (editable) applyMaterialStyle(clone, style);
        return clone;
      });
      const replacement = Array.isArray(original) ? updated : updated[0];
      mesh.material = replacement;
      this.overrides.set(mesh, replacement);
    }
  }

  setWireframe(enabled: boolean): void {
    if (this.wireframe === enabled) return;
    this.wireframe = enabled;
    for (const current of this.overrides.values()) {
      for (const material of uniqueMaterials(current)) {
        if ("wireframe" in material) {
          (material as SurfaceMaterial).wireframe = enabled;
          material.needsUpdate = true;
        }
      }
    }
  }

  dispose(): void {
    for (const [mesh, original] of this.originals) {
      const current = this.overrides.get(mesh);
      if (current) for (const material of uniqueMaterials(current)) material.dispose();
      mesh.material = original;
    }
    this.overrides.clear();
  }
}

export function disposeVehicle(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry) geometries.add(mesh.geometry);
    for (const material of uniqueMaterials(mesh.material)) {
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
