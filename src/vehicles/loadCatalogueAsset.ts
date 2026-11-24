import { loadVehicleFiles, type LoadedVehicle, type ModelProgress } from "../engine/modelLoader";
import type { VehicleCatalogueRecord } from "./types";

const MAX_CATALOGUE_ASSET_BYTES = 128 * 1024 * 1024;

export async function fetchCatalogueAssetFiles(
  vehicle: VehicleCatalogueRecord,
  onProgress?: (progress: ModelProgress) => void,
  requestId: string = crypto.randomUUID(),
): Promise<File[]> {
  if (vehicle.asset.status !== "available" || !vehicle.asset.mainFile) {
    throw new Error("3D MODEL NOT AVAILABLE — ASSET REQUIRED");
  }
  if (vehicle.asset.files.length === 0 || vehicle.asset.files.length > 256) {
    throw new Error(`Vehicle "${vehicle.displayName}" has an invalid asset file list.`);
  }

  if (window.gestureDrive) {
    const result = await window.gestureDrive.loadVehicleAsset(vehicle.id, requestId, (progress) => {
      onProgress?.({
        loaded: progress.loaded,
        total: progress.total,
        percent: progress.percent,
      });
    });
    return result.files.map(({ path, data }) => {
      const file = new File([data], path.split("/").pop() || path, {
        type: /\.glb$/i.test(path)
          ? "model/gltf-binary"
          : /\.gltf$/i.test(path)
            ? "model/gltf+json"
            : "application/octet-stream",
      });
      Object.defineProperty(file, "webkitRelativePath", { value: path });
      return file;
    });
  }
  if (vehicle.asset.remoteFiles?.length) {
    throw new Error("Remote catalogue assets require the secure desktop asset service.");
  }

  const files: File[] = [];
  let totalBytes = 0;
  for (let index = 0; index < vehicle.asset.files.length; index += 1) {
    const path = vehicle.asset.files[index];
    const url = new URL(path, window.location.href);
    if (url.origin !== window.location.origin) {
      throw new Error(`Vehicle asset paths must be local to this application: ${path}`);
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Vehicle asset file "${path}" is missing (HTTP ${response.status}).`);
    }
    const data = await response.arrayBuffer();
    totalBytes += data.byteLength;
    if (totalBytes > MAX_CATALOGUE_ASSET_BYTES) {
      throw new Error("The vehicle asset and its resources exceed the 128 MB limit.");
    }
    const expectedHash = vehicle.asset.integrity?.[path];
    if (!expectedHash) {
      throw new Error(`The vehicle asset has no integrity record for "${path}".`);
    }
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
    const actualHash = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (actualHash !== expectedHash.toLowerCase()) {
      throw new Error(`Vehicle asset integrity verification failed for "${path}".`);
    }
    const name = path.split("/").pop() || path;
    const file = new File([data], name, {
      type: /\.(glb|gltf)$/i.test(path) ? "model/gltf-binary" : "application/octet-stream",
    });
    Object.defineProperty(file, "webkitRelativePath", { value: path });
    files.push(file);
    onProgress?.({
      loaded: index + 1,
      total: vehicle.asset.files.length,
      percent: Math.round(((index + 1) / vehicle.asset.files.length) * 100),
    });
  }
  return files;
}

export async function loadCatalogueVehicle(
  vehicle: VehicleCatalogueRecord,
  onProgress?: (progress: ModelProgress) => void,
  requestId?: string,
): Promise<LoadedVehicle> {
  const files = await fetchCatalogueAssetFiles(vehicle, onProgress, requestId);
  return loadVehicleFiles(files, onProgress, vehicle.asset.mainFile ?? undefined, vehicle.components);
}
