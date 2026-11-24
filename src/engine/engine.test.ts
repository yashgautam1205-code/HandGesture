import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import {
  buildComponentRegistry,
  componentFocusBounds,
  componentForObject,
  resetComponentTransform,
  setExplodedView,
} from "./components";
import { MaterialController, disposeVehicle } from "./materialController";
import { loadPartFiles, loadVehicleFiles } from "./modelLoader";
import { parseProject, serializeProject } from "./projectConfig";
import { createPartFromObject } from "./parts";
import type { Customization } from "../store/studio";
import { validateVehicleCatalogue, VEHICLE_CATALOGUE } from "../vehicles/catalogue";
import { loadCatalogueVehicle } from "../vehicles/loadCatalogueAsset";
import type { VehicleCatalogueRecord } from "../vehicles/types";

Object.defineProperty(globalThis, "ProgressEvent", {
  configurable: true,
  value: class ProgressEventPolyfill extends Event {
    lengthComputable: boolean;
    loaded: number;
    total: number;
    constructor(type: string, init: ProgressEventInit = {}) {
      super(type);
      this.lengthComputable = init.lengthComputable ?? false;
      this.loaded = init.loaded ?? 0;
      this.total = init.total ?? 0;
    }
  },
});

const customization: Customization = {
  paint: "#1d5e66",
  finish: "metallic",
  paintMetallic: 0.82,
  paintRoughness: 0.26,
  clearCoat: 0.72,
  spoiler: true,
  windowTint: true,
  wheelColor: "#a9b5bd",
  wheelDesign: "five-spoke",
  spoilerStyle: "sport",
  bumperStyle: "street",
  environment: "dark-showroom",
  quality: "high",
};

function gltfFile(names: string[] = ["Bonnet", "Wheel_FL"]): File {
  const buffer = new ArrayBuffer(42);
  new Float32Array(buffer, 0, 9).set([
    -1, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ]);
  new Uint16Array(buffer, 36, 3).set([0, 1, 2]);
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const data = btoa(binary);
  const nodes = names.map((name, index) => ({
    name,
    mesh: 0,
    translation: [index * 2, 0, 0],
  }));

  const document = {
    asset: { version: "2.0", generator: "Gesture Drive tests" },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, index) => index) }],
    nodes,
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    buffers: [{ uri: `data:application/octet-stream;base64,${data}`, byteLength: 42 }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 },
      { buffer: 0, byteOffset: 36, byteLength: 6, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [-1, 0, 0],
        max: [1, 1, 0],
      },
      { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
    ],
  };
  return new File([JSON.stringify(document)], "sample.gltf", { type: "model/gltf+json" });
}

async function glbFile(): Promise<File> {
  const parsed = JSON.parse(await gltfFile(["Front_Bumper"]).text()) as {
    buffers: Array<{ uri: string; byteLength: number }>;
  };
  const encoded = parsed.buffers[0].uri.split(",")[1];
  const binary = atob(encoded);
  const payload = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) payload[index] = binary.charCodeAt(index);
  delete (parsed.buffers[0] as Partial<(typeof parsed.buffers)[0]>).uri;
  const json = new TextEncoder().encode(JSON.stringify(parsed));
  const jsonLength = Math.ceil(json.length / 4) * 4;
  const binaryLength = Math.ceil(payload.length / 4) * 4;
  const totalLength = 12 + 8 + jsonLength + 8 + binaryLength;
  const glb = new ArrayBuffer(totalLength);
  const view = new DataView(glb);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(glb, 20, json.length).set(json);
  new Uint8Array(glb, 20 + json.length, jsonLength - json.length).fill(0x20);
  const binaryChunkOffset = 20 + jsonLength;
  view.setUint32(binaryChunkOffset, binaryLength, true);
  view.setUint32(binaryChunkOffset + 4, 0x004e4942, true);
  new Uint8Array(glb, binaryChunkOffset + 8, payload.length).set(payload);
  return new File([glb], "sample.glb", { type: "model/gltf-binary" });
}

// Node lacks createImageBitmap; browser verification covers actual PNG decoding and rendering.
async function imageBitmapFromPng(source: Blob, _options?: ImageBitmapOptions): Promise<ImageBitmap> {
  const bytes = new Uint8Array(await source.arrayBuffer());
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    throw new Error("The Node image decoder shim accepts embedded PNG textures only.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    close() {},
  };
}

describe("vehicle component registry", () => {
  it("detects named meshes and links raycast hits to their registered component", () => {
    const root = new THREE.Group();
    const bonnet = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), new THREE.MeshStandardMaterial());
    bonnet.name = "Bonnet";
    root.add(bonnet);
    const { components, mergedMeshCount } = buildComponentRegistry(root);
    expect(components.map(({ name, category }) => [name, category])).toEqual([["Bonnet", "bonnet"]]);
    expect(componentForObject(bonnet, components)).toBe(components[0]);
    expect(mergedMeshCount).toBe(0);
  });

  it("marks unnamed combined geometry as one merged component", () => {
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
    const { components } = buildComponentRegistry(root);
    expect(components).toHaveLength(1);
    expect(components[0].name.toLowerCase()).toContain("merged mesh");
    expect(components[0].transformable).toBe(false);
  });

  it("restores original transforms after partial and full explosion", () => {
    const root = new THREE.Group();
    const bonnet = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    bonnet.name = "Bonnet";
    bonnet.position.set(1, 2, 3);
    root.add(bonnet);
    const { components } = buildComponentRegistry(root);
    const original = bonnet.position.clone();
    setExplodedView(components, 0.45);
    expect(bonnet.position.equals(original)).toBe(false);
    setExplodedView(components, 1);
    setExplodedView(components, 0);
    expect(bonnet.position.toArray()).toEqual(original.toArray());
    bonnet.position.set(9, 9, 9);
    resetComponentTransform(components[0]);
    expect(bonnet.position.toArray()).toEqual(original.toArray());
  });

  it("calculates component-focused bounds separately from full-model bounds", () => {
    const root = new THREE.Group();
    const bonnet = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), new THREE.MeshStandardMaterial());
    bonnet.name = "Bonnet";
    bonnet.position.x = 2;
    root.add(bonnet);
    root.add(new THREE.Mesh(new THREE.BoxGeometry(8, 1, 6), new THREE.MeshStandardMaterial()));
    const { components } = buildComponentRegistry(root);
    const focus = componentFocusBounds(components, components[0].id, root);
    expect(focus.getCenter(new THREE.Vector3()).x).toBeCloseTo(2);
    expect(focus.getSize(new THREE.Vector3()).x).toBeCloseTo(1);
  });

  it("maps explicitly named generic nodes and retains component inspection metadata", () => {
    const root = new THREE.Group();
    const node = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    node.name = "Node_001";
    root.add(node);
    const result = buildComponentRegistry(root, [{
      componentId: "engine-block",
      meshName: "Node_001",
      displayName: "Engine block",
      category: "other",
      focusPoint: [0.2, 0.1, 0],
      cameraDistance: 2.4,
      allowedModifications: ["material"],
      inspectable: true,
      customizable: false,
    }]);

    expect(result.unmatchedMappings).toEqual([]);
    expect(result.components[0]).toMatchObject({
      id: "engine-block",
      name: "Engine block",
      category: "other",
      cameraDistance: 2.4,
      allowedModifications: ["material"],
      inspectable: true,
      customizable: false,
    });
    expect(result.components[0].focusPoint.toArray()).toEqual([0.2, 0.1, 0]);
  });
});

describe("GLB and glTF loading", () => {
  it("parses a local glTF file and constructs component metadata", async () => {
    const loaded = await loadVehicleFiles([gltfFile()]);
    expect(loaded.root).toBeInstanceOf(THREE.Group);
    expect(loaded.components.map((component) => component.category)).toEqual(["bonnet", "wheel"]);
    expect(loaded.asset.name).toBe("sample.gltf");
  });

  it("reports model audit metrics and component mappings that did not match", async () => {
    const loaded = await loadVehicleFiles(
      [gltfFile()],
      undefined,
      undefined,
      [{ meshName: "Missing_Node", category: "body" }],
    );
    expect(loaded.audit.meshCount).toBe(2);
    expect(loaded.audit.materialCount).toBeGreaterThan(0);
    expect(loaded.audit.bounds.width).toBeGreaterThan(0);
    expect(loaded.audit.normalizationScale).toBeGreaterThan(0);
    expect(loaded.audit.unmatchedComponentMappings).toEqual(["Missing_Node"]);
    expect(loaded.audit.warnings).toContain("1 component mapping(s) did not match a named model node.");
  });

  it("parses a local GLB file with an embedded binary buffer", async () => {
    const loaded = await loadVehicleFiles([await glbFile()]);
    expect(loaded.asset.name).toBe("sample.glb");
    expect(loaded.components[0].category).toBe("bumper");
  });

  it("loads a replacement part without applying vehicle normalization", async () => {
    const loaded = await loadPartFiles([gltfFile(["Wheel"])]);
    expect(loaded.object).toBeInstanceOf(THREE.Group);
    expect(loaded.asset.name).toBe("sample.gltf");
  });

  it("reports invalid model files without falling back to an invalid scene", async () => {
    const invalid = new File(["not a model"], "broken.gltf");
    await expect(loadVehicleFiles([invalid])).rejects.toThrow("Could not load vehicle model");
  });

  it("reports missing external resources instead of silently omitting them", async () => {
    const file = new File(
      [JSON.stringify({
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        buffers: [{ uri: "missing.bin", byteLength: 12 }],
        bufferViews: [{ buffer: 0, byteLength: 12 }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: "VEC3" }],
      })],
      "vehicle.gltf",
    );
    await expect(loadVehicleFiles([file])).rejects.toThrow("Missing glTF resource");
  });

  it("rejects remote dependencies for a local model import", async () => {
    const file = new File(
      [JSON.stringify({
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        buffers: [{ uri: "https://example.invalid/vehicle.bin", byteLength: 12 }],
        bufferViews: [{ buffer: 0, byteLength: 12 }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: "VEC3" }],
      })],
      "vehicle.gltf",
    );
    await expect(loadVehicleFiles([file])).rejects.toThrow("Remote glTF resources are not loaded");
  });
});

describe("imported material and project persistence", () => {
  it("changes and restores original mesh materials", () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ color: "#222222" }),
    );
    mesh.name = "Body";
    root.add(mesh);
    const { components } = buildComponentRegistry(root);
    const original = mesh.material as THREE.MeshStandardMaterial;
    const controller = new MaterialController(root, components);
    controller.apply({ ...customization, paint: "#b93438" }, {});
    expect((mesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe("b93438");
    controller.apply(customization, { [components[0].id]: { color: "#d0d4d2", finish: "matte" } });
    expect((mesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe("d0d4d2");
    controller.dispose();
    expect(mesh.material).toBe(original);
  });

  it("applies material presets to body surfaces without mutating the original material", () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhysicalMaterial({ color: "#111111" }));
    root.add(mesh);
    const { components } = buildComponentRegistry(root);
    const controller = new MaterialController(root, components);
    const preset = { ...customization, paint: "#d0d4d2", paintMetallic: 0.95, paintRoughness: 0.18, clearCoat: 0.82 };
    controller.apply(preset, {});
    const updated = mesh.material as THREE.MeshPhysicalMaterial;
    expect(updated.color.getHexString()).toBe("d0d4d2");
    expect(updated.metalness).toBeCloseTo(0.95);
    expect(updated.roughness).toBeCloseTo(0.18);
    controller.dispose();
    expect(mesh.material).not.toBe(updated);
  });

  it("preserves source appearance for inspection-only mapped components", () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ color: "#222222" }),
    );
    mesh.name = "Node_001";
    root.add(mesh);
    const { components } = buildComponentRegistry(root, [{
      meshName: "Node_001",
      category: "other",
      customizable: false,
    }]);
    const controller = new MaterialController(root, components);
    controller.apply({ ...customization, paint: "#b93438" }, {});
    expect((mesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe("222222");
    controller.dispose();
  });

  it("cleans up unused vehicle resources without throwing", () => {
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
    expect(() => disposeVehicle(root)).not.toThrow();
  });

  it("migrates version 1 procedural projects without losing customization", () => {
    const loaded = parseProject(JSON.stringify({
      version: 1,
      model: "procedural-sport-coupe",
      customization,
    }));

    expect(loaded.version).toBe(2);
    expect(loaded.model).toEqual({ source: "procedural" });
    expect(loaded.customization).toEqual(customization);
  });

  it("round-trips model references, per-part materials, and rotations", () => {
    const asset = {
      name: "sample.glb",
      mainFile: "sample.glb",
      files: [{ path: "sample.glb", data: "AQID" }],
    };
    const json = serializeProject(
      asset,
      customization,
      { "model-1": { color: "#b93438", finish: "gloss", metallic: 0.9, roughness: 0.2, clearCoat: 0.7 } },
      { "model-1": [0.1, 0.2, 0.3] },
    );
    const loaded = parseProject(json);
    expect(loaded.model).toEqual({ source: "imported", asset });
    expect(loaded.componentMaterials["model-1"].color).toBe("#b93438");
    expect(loaded.componentRotations["model-1"]).toEqual([0.1, 0.2, 0.3]);
    expect(loaded.customization.quality).toBe("high");
    expect(loaded.customization.environment).toBe("dark-showroom");
  });

  it("round-trips optional catalogue provenance without changing legacy projects", () => {
    const asset = {
      name: "sample.glb",
      mainFile: "sample.glb",
      files: [{ path: "sample.glb", data: "AQID" }],
    };
    const metadata = {
      catalogueVehicleId: "bmw-3-series",
      displayName: "BMW 3 Series",
      assetSource: "User-provided local file; not verified against catalogue",
      assetVerification: "unverified" as const,
    };
    const loaded = parseProject(serializeProject(asset, customization, {}, {}, [], undefined, metadata));
    expect(loaded.model.source).toBe("imported");
    if (loaded.model.source === "imported") expect(loaded.model).toMatchObject(metadata);

    const legacy = parseProject(serializeProject(asset, customization, {}, {}, [], undefined));
    expect(legacy.model.source === "imported" && legacy.model.assetVerification).toBeUndefined();
  });

  it("round-trips replacement parts and gesture settings", () => {
    const partAsset = {
      name: "wheel.glb",
      mainFile: "wheel.glb",
      files: [{ path: "wheel.glb", data: "AQID" }],
    };
    const partObject = new THREE.Group();
    partObject.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.5), new THREE.MeshStandardMaterial()));
    const part = createPartFromObject(partObject, "wheel", "wheel.glb", partAsset);
    part.replacesComponentId = "model-1";
    const gestureSettings = {
      confidenceThreshold: 0.66,
      gestureCooldown: 2100,
      smoothing: 0.35,
      pinchThreshold: 0.5,
      calibrationHandScale: 0.2,
      pointDwellMs: 650,
      twoHandZoom: false,
      trackingLostTimeoutMs: 4000,
    };
    const json = serializeProject(
      {
        name: "sample.glb",
        mainFile: "sample.glb",
        files: [{ path: "sample.glb", data: "AQID" }],
      },
      customization,
      {},
      {},
      [part],
      gestureSettings,
    );
    const loaded = parseProject(json);
    expect(loaded.replacementParts).toHaveLength(1);
    expect(loaded.replacementParts[0].category).toBe("wheel");
    expect(loaded.replacementParts[0].asset.name).toBe("wheel.glb");
    expect(loaded.gestureSettings?.confidenceThreshold).toBe(0.66);
    expect(loaded.gestureSettings?.twoHandZoom).toBe(false);
  });

  it("rejects malformed or unsupported project files", () => {
    expect(() => parseProject("{bad json")).toThrow("not valid JSON");
    expect(() => parseProject(JSON.stringify({ version: 2, model: { source: "imported" } }))).toThrow(
      "invalid or unsupported model asset",
    );
  });
});

describe("vehicle catalogue", () => {
  it("validates the catalogue and keeps unsupported targets unavailable", () => {
    expect(VEHICLE_CATALOGUE).toHaveLength(19);
    expect(VEHICLE_CATALOGUE.filter((vehicle) => vehicle.id !== "bmw-m4")
      .every((vehicle) => vehicle.asset.status === "unavailable")).toBe(true);
    expect(VEHICLE_CATALOGUE.every((vehicle) => vehicle.specifications === null)).toBe(true);
    expect(VEHICLE_CATALOGUE.find((vehicle) => vehicle.id === "bmw-m4")).toMatchObject({
      generation: "G82",
      displayName: "BMW M4 G82",
      year: null,
      variant: null,
      asset: {
        status: "available",
        accuracy: "verified",
        mainFile: "vehicles/bmw-m4/bmw-m4.glb",
      },
      components: [
        { meshName: "BodyParts_1", category: "body", componentId: "bmw-m4-body-assembly" },
        { meshName: "WHeelsandrims_2", category: "wheel", componentId: "bmw-m4-wheel-assembly" },
      ],
    });
  });

  it("loads the supplied BMW M4 GLB through the vehicle loader and applies supported component materials", async () => {
    const vehicle = VEHICLE_CATALOGUE.find((candidate) => candidate.id === "bmw-m4");
    if (!vehicle?.asset.mainFile) throw new Error("The BMW M4 asset is not registered.");

    const assetPath = vehicle.asset.mainFile;
    const bytes = await readFile(fileURLToPath(new URL("../../public/vehicles/bmw-m4/bmw-m4.glb", import.meta.url)));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(vehicle.asset.integrity?.[assetPath]);

    const file = new File([new Uint8Array(bytes)], "bmw-m4.glb", { type: "model/gltf-binary" });
    Object.defineProperty(file, "webkitRelativePath", { value: assetPath });
    const previousCreateImageBitmap = globalThis.createImageBitmap;
    const previousSelf = Reflect.get(globalThis, "self");
    if (typeof previousSelf === "undefined") {
      Object.defineProperty(globalThis, "self", { configurable: true, value: globalThis });
    }
    if (typeof previousCreateImageBitmap !== "function") {
      Object.defineProperty(globalThis, "createImageBitmap", {
        configurable: true,
        value: imageBitmapFromPng,
      });
    }

    let loaded: Awaited<ReturnType<typeof loadVehicleFiles>> | undefined;
    try {
      loaded = await loadVehicleFiles(
        [file],
        undefined,
        assetPath,
        vehicle.components,
      );
      expect(loaded.audit).toMatchObject({
        meshCount: 30,
        materialCount: 28,
        textureCount: 12,
        orientation: "standard",
        unmatchedComponentMappings: [],
        warnings: [],
      });
      expect(loaded.components.map(({ id, category, meshCount }) => ({ id, category, meshCount }))).toEqual([
        { id: "bmw-m4-body-assembly", category: "body", meshCount: 27 },
        { id: "bmw-m4-wheel-assembly", category: "wheel", meshCount: 3 },
      ]);
      expect(loaded.audit.bounds.depth).toBeGreaterThan(loaded.audit.bounds.height);
      expect(loaded.components.every((component) => component.editable && component.inspectable)).toBe(true);

      const bodyComponent = loaded.components.find((component) => component.id === "bmw-m4-body-assembly");
      if (!bodyComponent) throw new Error("The BMW M4 body mapping did not load.");
      let bodyMesh: THREE.Mesh | undefined;
      bodyComponent.object.traverse((child) => {
        if (!bodyMesh && (child as THREE.Mesh).isMesh) bodyMesh = child as THREE.Mesh;
      });
      if (!bodyMesh) throw new Error("The BMW M4 body assembly contains no mesh.");
      const originalColor = bodyMesh.material as THREE.MeshStandardMaterial;
      const originalHex = originalColor.color.getHexString();
      const controller = new MaterialController(loaded.root, loaded.components);
      controller.apply(customization, {
        "bmw-m4-body-assembly": { color: "#b93438", finish: "matte" },
      });
      expect((bodyMesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe("b93438");
      controller.dispose();
      expect((bodyMesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe(originalHex);

      const project = parseProject(serializeProject(
        loaded.asset,
        customization,
        {},
        {},
        [],
        undefined,
        {
          catalogueVehicleId: vehicle.id,
          displayName: vehicle.displayName,
          assetSource: vehicle.asset.source?.name ?? "Catalogue asset",
          assetVerification: "verified",
        },
      ));
      expect(project.model).toMatchObject({
        source: "imported",
        catalogueVehicleId: "bmw-m4",
        asset: { name: "bmw-m4.glb", mainFile: assetPath },
      });
    } finally {
      if (loaded) disposeVehicle(loaded.root);
      if (typeof previousCreateImageBitmap === "function") {
        Object.defineProperty(globalThis, "createImageBitmap", {
          configurable: true,
          value: previousCreateImageBitmap,
        });
      } else {
        Reflect.deleteProperty(globalThis, "createImageBitmap");
      }
      if (typeof previousSelf !== "undefined") {
        Object.defineProperty(globalThis, "self", { configurable: true, value: previousSelf });
      } else {
        Reflect.deleteProperty(globalThis, "self");
      }
    }
  });

  it("round-trips BMW M4 vehicle identity, paint, component materials, and replacement parts", async () => {
    const vehicle = VEHICLE_CATALOGUE.find((candidate) => candidate.id === "bmw-m4");
    if (!vehicle?.asset.mainFile) throw new Error("The BMW M4 asset is not registered.");

    const assetPath = vehicle.asset.mainFile;
    const bytes = await readFile(fileURLToPath(new URL("../../public/vehicles/bmw-m4/bmw-m4.glb", import.meta.url)));
    const file = new File([new Uint8Array(bytes)], "bmw-m4.glb", { type: "model/gltf-binary" });
    Object.defineProperty(file, "webkitRelativePath", { value: assetPath });

    const previousCreateImageBitmap = globalThis.createImageBitmap;
    const previousSelf = Reflect.get(globalThis, "self");
    if (typeof previousSelf === "undefined") {
      Object.defineProperty(globalThis, "self", { configurable: true, value: globalThis });
    }
    if (typeof previousCreateImageBitmap !== "function") {
      Object.defineProperty(globalThis, "createImageBitmap", {
        configurable: true,
        value: (_blob: Blob) => Promise.resolve({ width: 4, height: 4, close: () => {} } as ImageBitmap),
      });
    }

    let loaded: Awaited<ReturnType<typeof loadVehicleFiles>> | undefined;
    try {
      loaded = await loadVehicleFiles([file], undefined, assetPath, vehicle.components);
      if (!loaded) throw new Error("BMW M4 did not load.");

      const bodyComponent = loaded.components.find((c) => c.id === "bmw-m4-body-assembly");
      if (!bodyComponent) throw new Error("Body component missing.");
      const controller = new MaterialController(loaded.root, loaded.components);
      controller.apply(
        { ...customization, paint: "#b93438" },
        { "bmw-m4-body-assembly": { color: "#b93438", finish: "matte" } },
      );

      const partObject = new THREE.Group();
      partObject.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.5), new THREE.MeshStandardMaterial()));
      const partAsset = {
        name: "wheel.glb",
        mainFile: "wheel.glb",
        files: [{ path: "wheel.glb", data: "AQID" }],
      };
      const part = createPartFromObject(partObject, "wheel", "wheel.glb", partAsset);
      part.replacesComponentId = "bmw-m4-wheel-assembly";
      controller.dispose();

      const projectJson = serializeProject(
        loaded.asset,
        { ...customization, paint: "#b93438" },
        { "bmw-m4-body-assembly": { color: "#b93438", finish: "matte" } },
        {},
        [part],
        undefined,
        {
          catalogueVehicleId: vehicle.id,
          displayName: vehicle.displayName,
          assetSource: vehicle.asset.source?.name ?? "Catalogue asset",
          assetVerification: "verified",
        },
      );

      const project = parseProject(projectJson);

      expect(project.model.source).toBe("imported");
      if (project.model.source !== "imported") throw new Error("Model not imported.");
      expect(project.model.catalogueVehicleId).toBe("bmw-m4");
      expect(project.model.displayName).toBe("BMW M4 G82");
      expect(project.model.assetSource).toBe(vehicle.asset.source?.name);
      expect(project.model.assetVerification).toBe("verified");

      expect(project.model.asset.name).toBe("bmw-m4.glb");
      expect(project.model.asset.mainFile).toBe(assetPath);
      expect(project.model.asset.files.length).toBe(1);

      expect(project.customization.paint).toBe("#b93438");

      expect(project.componentMaterials["bmw-m4-body-assembly"]).toMatchObject({
        color: "#b93438",
        finish: "matte",
      });

      expect(project.replacementParts).toHaveLength(1);
      expect(project.replacementParts[0].category).toBe("wheel");
      expect(project.replacementParts[0].replacesComponentId).toBe("bmw-m4-wheel-assembly");

      const reloadedFiles = (await import("./modelLoader")).unpackModelAsset(project.model.asset);
      const reloaded = await loadVehicleFiles(reloadedFiles, undefined, project.model.asset.mainFile, vehicle.components);
      expect(reloaded.audit.meshCount).toBe(30);
      expect(reloaded.audit.materialCount).toBe(28);
      expect(reloaded.components.map((c) => c.id)).toEqual([
        "bmw-m4-body-assembly",
        "bmw-m4-wheel-assembly",
      ]);
      disposeVehicle(reloaded.root);
    } finally {
      if (loaded) disposeVehicle(loaded.root);
      if (typeof previousCreateImageBitmap === "function") {
        Object.defineProperty(globalThis, "createImageBitmap", {
          configurable: true,
          value: previousCreateImageBitmap,
        });
      } else {
        Reflect.deleteProperty(globalThis, "createImageBitmap");
      }
      if (typeof previousSelf !== "undefined") {
        Object.defineProperty(globalThis, "self", { configurable: true, value: previousSelf });
      } else {
        Reflect.deleteProperty(globalThis, "self");
      }
    }
  });

  it("rejects verified catalogue assets without source and license attribution", () => {
    const records = structuredClone(VEHICLE_CATALOGUE);
    records[0] = {
      ...records[0],
      asset: {
        status: "available",
        mainFile: "vehicles/bmw-3-series.glb",
        files: ["vehicles/bmw-3-series.glb"],
        source: null,
        license: null,
        accuracy: "verified",
      },
    };
    expect(() => validateVehicleCatalogue(records)).toThrow("requires source and license URLs");
  });

  it("validates remote asset URLs before exposing available catalogue records", () => {
    const records = structuredClone(VEHICLE_CATALOGUE);
    const assetPath = "vehicles/bmw-3-series/model.glb";
    const verifiedAsset: VehicleCatalogueRecord["asset"] = {
      status: "available",
      accuracy: "verified",
      mainFile: assetPath,
      files: [assetPath],
      remoteFiles: [{ path: assetPath, url: "https://assets.example/model.glb" }],
      integrity: { [assetPath]: "a".repeat(64) },
      source: { name: "Reviewed source", url: "https://assets.example/source", attribution: null },
      license: { name: "Reviewed license", url: "https://assets.example/license", attribution: null },
    };
    records[0] = { ...records[0], asset: verifiedAsset };
    expect(validateVehicleCatalogue(records)[0].asset.status).toBe("available");

    for (const url of [
      "http://assets.example/model.glb",
      "https://assets.example:444/model.glb",
      "https://127.0.0.1/model.glb",
      "https://localhost./model.glb",
    ]) {
      records[0] = {
        ...records[0],
        asset: { ...verifiedAsset, remoteFiles: [{ path: assetPath, url }] },
      };
      expect(() => validateVehicleCatalogue(records)).toThrow("invalid remote asset file");
    }
  });

  it("reports a missing 3D asset instead of falling back to procedural geometry", async () => {
    await expect(loadCatalogueVehicle(VEHICLE_CATALOGUE[0])).rejects.toThrow(
      "3D MODEL NOT AVAILABLE — ASSET REQUIRED",
    );
  });
});
