import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as THREE from "three";
import {
  buildComponentRegistry,
  type VehicleComponent,
  type VehicleComponentMapping,
} from "./components";

export type ModelFileData = { path: string; data: string };
export type ModelAssetData = {
  name: string;
  mainFile: string;
  files: ModelFileData[];
};
export type LoadedVehicle = {
  root: THREE.Group;
  components: VehicleComponent[];
  mergedMeshCount: number;
  asset: ModelAssetData;
  audit: VehicleModelAudit;
};
export type VehicleModelAudit = {
  meshCount: number;
  materialCount: number;
  textureCount: number;
  bounds: { width: number; height: number; depth: number };
  normalizationScale: number;
  orientation: "standard" | "review";
  warnings: string[];
  unmatchedComponentMappings: string[];
};
export type ModelProgress = { loaded: number; total: number; percent: number };
export type LoadedObject = { object: THREE.Group; asset: ModelAssetData };

const MAX_FILE_COUNT = 256;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const MAX_MODEL_BYTES = 96 * 1024 * 1024;

function normalizePath(value: string): string {
  const segments: string[] = [];
  for (const segment of value.replace(/\\/g, "/").split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
    } else {
      segments.push(decodeURIComponent(segment));
    }
  }
  return segments.join("/").toLowerCase();
}

function validateAssetPath(value: string): void {
  if (
    !value ||
    value.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value) ||
    value.replace(/\\/g, "/").split("/").some((segment) => segment === "..")
  ) {
    throw new Error(`Invalid model resource path: ${value}`);
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const stride = 0x8000;
  for (let index = 0; index < bytes.length; index += stride) {
    binary += String.fromCharCode(...bytes.subarray(index, index + stride));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function packModelFiles(files: File[]): Promise<ModelAssetData> {
  if (files.length === 0 || files.length > MAX_FILE_COUNT) {
    throw new Error(`Select between 1 and ${MAX_FILE_COUNT} model files.`);
  }
  const modelFile = files.find((file) => /\.(glb|gltf)$/i.test(file.name));
  if (!modelFile) throw new Error("No GLB or glTF model file was selected.");
  if (modelFile.size === 0 || modelFile.size > MAX_MODEL_BYTES) {
    throw new Error("The main model file is empty or exceeds the 96 MB limit.");
  }
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new Error("The selected model and supporting files exceed the 128 MB limit.");
  }

  const paths = new Set<string>();
  const packed: ModelFileData[] = [];
  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    validateAssetPath(path);
    const normalized = normalizePath(path);
    if (paths.has(normalized)) throw new Error(`Duplicate model resource path: ${path}`);
    paths.add(normalized);
    packed.push({ path, data: bytesToBase64(new Uint8Array(await file.arrayBuffer())) });
  }
  return {
    name: modelFile.name,
    mainFile: modelFile.webkitRelativePath || modelFile.name,
    files: packed,
  };
}

export function unpackModelAsset(asset: ModelAssetData): File[] {
  if (
    !asset ||
    typeof asset.name !== "string" ||
    typeof asset.mainFile !== "string" ||
    !Array.isArray(asset.files) ||
    asset.files.length === 0 ||
    asset.files.length > MAX_FILE_COUNT
  ) {
    throw new Error("The saved project contains an invalid model asset.");
  }
  if (!/\.(glb|gltf)$/i.test(asset.name)) {
    throw new Error("The saved project has an unsupported model file name.");
  }
  const totalEncodedLength = asset.files.reduce((total, file) => {
    if (
      typeof file.path !== "string" ||
      typeof file.data !== "string" ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(file.data)
    ) {
      throw new Error("The saved model contains an invalid resource entry.");
    }
    validateAssetPath(file.path);
    return total + file.data.length;
  }, 0);
  if (totalEncodedLength > Math.ceil((MAX_TOTAL_BYTES * 4) / 3)) {
    throw new Error("The saved model resources exceed the 128 MB limit.");
  }
  if (!asset.files.some((file) => normalizePath(file.path) === normalizePath(asset.mainFile))) {
    throw new Error("The saved model does not include its main GLB/glTF file.");
  }
  return asset.files.map(({ path, data }) => {
    if (typeof path !== "string" || typeof data !== "string") {
      throw new Error("The saved model contains an invalid resource entry.");
    }
    const bytes = base64ToBytes(data);
    const file = new File([bytes], path.split("/").pop() || path, {
      type: /\.(glb|gltf)$/i.test(path) ? "model/gltf-binary" : "application/octet-stream",
    });
    Object.defineProperty(file, "webkitRelativePath", { value: path });
    return file;
  });
}

function filePath(file: File): string {
  return normalizePath(file.webkitRelativePath || file.name);
}

function findMainFile(files: File[], requested?: string): File {
  const candidates = files.filter((file) => /\.(glb|gltf)$/i.test(file.name));
  const main = requested
    ? candidates.find((candidate) => filePath(candidate) === normalizePath(requested))
    : candidates[0];
  if (!main) throw new Error("The selected asset does not contain its GLB/glTF model file.");
  return main;
}

function resourceUri(uri: string, modelPath: string): string {
  const directory = modelPath.includes("/") ? modelPath.slice(0, modelPath.lastIndexOf("/") + 1) : "";
  return normalizePath(`${directory}${uri}`);
}

function parseGLTF(
  loader: GLTFLoader,
  data: string | ArrayBuffer,
  basePath: string,
): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    loader.parse(data, basePath, resolve, reject);
  });
}

function normalizeVehicle(scene: THREE.Group): { root: THREE.Group; scale: number; sourceSize: THREE.Vector3 } {
  const wrapper = new THREE.Group();
  wrapper.name = "Gesture Drive imported vehicle";
  wrapper.add(scene);
  wrapper.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(wrapper);
  if (bounds.isEmpty()) throw new Error("The selected model contains no visible geometry.");
  const size = bounds.getSize(new THREE.Vector3());
  const largestDimension = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
    throw new Error("The selected model has invalid geometry dimensions.");
  }
  const center = bounds.getCenter(new THREE.Vector3());
  wrapper.scale.setScalar(4.4 / largestDimension);
  wrapper.position.set(
    -center.x * wrapper.scale.x,
    -bounds.min.y * wrapper.scale.y,
    -center.z * wrapper.scale.z,
  );
  wrapper.updateMatrixWorld(true);
  return { root: wrapper, scale: wrapper.scale.x, sourceSize: size };
}

async function loadSceneFiles(
  files: File[],
  onProgress?: (progress: ModelProgress) => void,
  requestedMain?: string,
): Promise<{ scene: THREE.Group; asset: ModelAssetData }> {
  if (files.length === 0 || files.length > MAX_FILE_COUNT) {
    throw new Error(`Select between 1 and ${MAX_FILE_COUNT} model files.`);
  }
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new Error("The selected model and supporting files exceed the 128 MB limit.");
  }
  const main = findMainFile(files, requestedMain);
  if (main.size === 0 || main.size > MAX_MODEL_BYTES) {
    throw new Error("The main model file is empty or exceeds the 96 MB limit.");
  }
  const resources = new Map<string, File>();
  for (const file of files) {
    const path = filePath(file);
    if (resources.has(path)) throw new Error(`Duplicate model resource path: ${file.name}`);
    resources.set(path, file);
  }
  const urls: string[] = [];
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    onProgress?.({ loaded, total, percent: total > 0 ? Math.round((loaded / total) * 100) : 0 });
  };
  manager.setURLModifier((url) => {
    if (/^(data:|blob:)/i.test(url)) return url;
    if (/^(app:|https?:)/i.test(url)) {
      const requestUrl = new URL(url, typeof window === "undefined" ? "http://localhost/" : window.location.href);
      const currentOrigin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
      if (requestUrl.origin === currentOrigin) return url;
      throw new Error("Remote glTF resources are not loaded. Select the model and its local dependencies.");
    }
    const key = resourceUri(decodeURIComponent(url.split(/[?#]/, 1)[0]), filePath(main));
    const resource = resources.get(key);
    if (!resource) throw new Error(`Missing glTF resource "${url}". Select the model and all referenced files.`);
    const objectUrl = URL.createObjectURL(resource);
    urls.push(objectUrl);
    return objectUrl;
  });

  try {
    onProgress?.({ loaded: 0, total: totalBytes, percent: 0 });
    const loader = new GLTFLoader(manager);
    const draco = new DRACOLoader(manager);
    const base =
      typeof window === "undefined"
        ? new URL("http://localhost/")
        : new URL(import.meta.env.BASE_URL, window.location.href);
    draco.setDecoderPath(new URL("models/draco/", base).toString());
    loader.setDRACOLoader(draco);
    const data = /\.(glb)$/i.test(main.name)
      ? await main.arrayBuffer()
      : await main.text();
    let gltf: GLTF;
    try {
      gltf = await parseGLTF(loader, data, "");
    } finally {
      draco.dispose();
    }
    const meshCount = countMeshes(gltf.scene);
    if (!meshCount) throw new Error("The selected model has no mesh geometry to display.");
    const packed = await packModelFiles(files);
    onProgress?.({ loaded: totalBytes, total: totalBytes, percent: 100 });
    return { scene: gltf.scene, asset: packed };
  } finally {
    for (const url of urls) URL.revokeObjectURL(url);
  }
}

export async function loadVehicleFiles(
  files: File[],
  onProgress?: (progress: ModelProgress) => void,
  requestedMain?: string,
  componentMappings: VehicleComponentMapping[] = [],
): Promise<LoadedVehicle> {
  try {
    const { scene, asset } = await loadSceneFiles(files, onProgress, requestedMain);
    const { root, scale, sourceSize } = normalizeVehicle(scene);
    const { components, mergedMeshCount, unmatchedMappings } = buildComponentRegistry(root, componentMappings);
    const bounds = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    let meshCount = 0;
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      meshCount += 1;
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of meshMaterials) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value && typeof value === "object" && (value as THREE.Texture).isTexture) {
            textures.add(value as THREE.Texture);
          }
        }
      }
    });
    const warnings: string[] = [];
    if (sourceSize.y > sourceSize.x && sourceSize.y > sourceSize.z) {
      warnings.push("The source model's vertical axis is its largest dimension; check orientation.");
    } else if (sourceSize.x > sourceSize.z * 1.1) {
      warnings.push("The source model is wider than it is long; check whether its forward axis is rotated.");
    }
    if (scale > 100 || scale < 0.001) {
      warnings.push("The model required an extreme unit conversion; inspect its source scale.");
    }
    if (unmatchedMappings.length) {
      warnings.push(`${unmatchedMappings.length} component mapping(s) did not match a named model node.`);
    }
    return {
      root,
      components,
      mergedMeshCount,
      asset,
      audit: {
        meshCount,
        materialCount: materials.size,
        textureCount: textures.size,
        bounds: { width: bounds.x, height: bounds.y, depth: bounds.z },
        normalizationScale: scale,
        orientation: warnings.length ? "review" : "standard",
        warnings,
        unmatchedComponentMappings: unmatchedMappings,
      },
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? `Could not load vehicle model: ${error.message}` : "Could not load vehicle model.",
    );
  }
}

export async function loadPartFiles(
  files: File[],
  onProgress?: (progress: ModelProgress) => void,
  requestedMain?: string,
): Promise<LoadedObject> {
  try {
    const { scene, asset } = await loadSceneFiles(files, onProgress, requestedMain);
    if (!countMeshes(scene)) throw new Error("The selected part contains no mesh geometry.");
    return { object: scene, asset };
  } catch (error) {
    throw new Error(
      error instanceof Error ? `Could not load replacement part: ${error.message}` : "Could not load replacement part.",
    );
  }
}

function countMeshes(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) count += 1;
  });
  return count;
}
