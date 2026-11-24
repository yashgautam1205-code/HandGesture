import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";

const MAX_FILE_COUNT = 256;
const MAX_MAIN_FILE_BYTES = 96 * 1024 * 1024;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const MAX_REDIRECTS = 4;

export type VehicleAssetErrorCode =
  | "NOT_AVAILABLE"
  | "LICENSE_REVIEW_REQUIRED"
  | "INVALID"
  | "DOWNLOAD_FAILED"
  | "OFFLINE"
  | "CANCELLED";

export class VehicleAssetServiceError extends Error {
  constructor(
    readonly code: VehicleAssetErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VehicleAssetServiceError";
  }
}

export type VehicleAssetProgress = {
  vehicleId: string;
  stage: "cache" | "download" | "validate";
  loaded: number;
  total: number;
  percent: number;
};

export type VehicleAssetLoadResult = {
  vehicleId: string;
  source: "local" | "remote";
  cached: boolean;
  files: Array<{ path: string; data: ArrayBuffer }>;
};

export type VehicleAssetCacheStatus = {
  cached: boolean;
  invalid: boolean;
  bytes: number;
};

export type VehicleAssetServiceOptions = {
  manifestPath: string;
  assetRoot: string;
  cacheRoot: string;
  fetcher?: typeof fetch;
};

type RemoteAssetFile = { path: string; url: string };
type ResolvedVehicle = {
  id: string;
  mainFile: string;
  files: string[];
  remoteFiles: RemoteAssetFile[] | null;
  integrity: Record<string, string>;
};
type ActiveRequest = { ownerId: number; controller: AbortController };
type ProgressCallback = (progress: VehicleAssetProgress) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorCode(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

function isSafeAssetPath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes(":") ||
    value.includes("?") ||
    value.includes("#") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  ) {
    return false;
  }
  try {
    return value.split("/").every((segment) => {
      const decoded = decodeURIComponent(segment);
      return segment.length > 0 &&
        decoded !== "." &&
        decoded !== ".." &&
        !decoded.includes("/") &&
        !decoded.includes("\\") &&
        !decoded.includes(":");
    });
  } catch {
    return false;
  }
}

function isPublicHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
    const ipVersion = isIP(host);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
      return false;
    }
    if (ipVersion === 4) {
      const octets = host.split(".").map(Number);
      if (
        octets[0] === 0 ||
        octets[0] === 10 ||
        octets[0] === 127 ||
        octets[0] >= 224 ||
        (octets[0] === 169 && octets[1] === 254) ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168)
      ) {
        return false;
      }
    } else if (ipVersion === 6) {
      if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return false;
    } else if (!host.includes(".")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function asVehicleAssetError(error: unknown): VehicleAssetServiceError {
  if (error instanceof VehicleAssetServiceError) return error;
  if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
    return new VehicleAssetServiceError("CANCELLED", "Vehicle asset retrieval was cancelled.");
  }
  if (error instanceof TypeError) {
    return new VehicleAssetServiceError("OFFLINE", "The registered vehicle asset could not be reached.");
  }
  return new VehicleAssetServiceError("DOWNLOAD_FAILED", "The registered vehicle asset could not be retrieved.");
}

function normalizedAssetPath(value: string): string {
  return value.replace(/\\/g, "/").toLowerCase();
}

function validateExternalResources(
  document: unknown,
  mainFile: string,
  registeredFiles: Set<string>,
): void {
  if (!isRecord(document) || !isRecord(document.asset) || document.asset.version !== "2.0") {
    throw new VehicleAssetServiceError("INVALID", "The registered glTF file has an unsupported format.");
  }
  const mainDirectory = path.posix.dirname(mainFile);
  for (const section of ["buffers", "images"] as const) {
    const entries = document[section];
    if (entries === undefined) continue;
    if (!Array.isArray(entries)) {
      throw new VehicleAssetServiceError("INVALID", "The glTF resource list is malformed.");
    }
    for (const entry of entries) {
      if (!isRecord(entry)) {
        throw new VehicleAssetServiceError("INVALID", "The glTF resource list contains an invalid entry.");
      }
      if (entry.uri === undefined) continue;
      if (typeof entry.uri !== "string") {
        throw new VehicleAssetServiceError("INVALID", "The glTF contains an invalid resource URI.");
      }
      if (/^data:/i.test(entry.uri)) continue;
      if (/^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(entry.uri) || entry.uri.includes("\\")) {
        throw new VehicleAssetServiceError("INVALID", "External glTF resources must be registered as relative files.");
      }
      let uri: string;
      try {
        uri = decodeURIComponent(entry.uri.split(/[?#]/, 1)[0]);
      } catch {
        throw new VehicleAssetServiceError("INVALID", "The glTF contains an invalid encoded resource URI.");
      }
      const resolved = path.posix.normalize(path.posix.join(mainDirectory, uri));
      if (
        resolved === ".." ||
        resolved.startsWith("../") ||
        !registeredFiles.has(normalizedAssetPath(resolved))
      ) {
        throw new VehicleAssetServiceError(
          "INVALID",
          `The glTF resource "${entry.uri}" is not included in the registered asset files.`,
        );
      }
    }
  }
}

function validateMainFile(
  bytes: Uint8Array,
  mainFile: string,
  registeredFiles: Set<string>,
): void {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (/\.glb$/i.test(mainFile)) {
    if (
      buffer.length < 20 ||
      buffer.toString("ascii", 0, 4) !== "glTF" ||
      buffer.readUInt32LE(4) !== 2 ||
      buffer.readUInt32LE(8) !== buffer.length ||
      buffer.readUInt32LE(16) !== 0x4e4f534a
    ) {
      throw new VehicleAssetServiceError("INVALID", "The registered GLB file has an invalid header.");
    }
    const jsonLength = buffer.readUInt32LE(12);
    if (jsonLength < 2 || 20 + jsonLength > buffer.length) {
      throw new VehicleAssetServiceError("INVALID", "The registered GLB has a malformed JSON chunk.");
    }
    let document: unknown;
    try {
      document = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).replace(/\0+$/g, "").trim());
    } catch {
      throw new VehicleAssetServiceError("INVALID", "The registered GLB contains invalid JSON.");
    }
    validateExternalResources(document, mainFile, registeredFiles);
    return;
  }

  let document: unknown;
  try {
    document = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new VehicleAssetServiceError("INVALID", "The registered glTF file is not valid UTF-8 JSON.");
  }
  validateExternalResources(document, mainFile, registeredFiles);
}

function cacheFingerprint(vehicle: ResolvedVehicle): string {
  return createHash("sha256")
    .update(JSON.stringify({
      files: vehicle.files,
      remoteFiles: vehicle.remoteFiles,
      integrity: vehicle.integrity,
    }))
    .digest("hex");
}

export class VehicleAssetService {
  private readonly fetcher: typeof fetch;
  private readonly activeRequests = new Map<string, ActiveRequest>();

  constructor(private readonly options: VehicleAssetServiceOptions) {
    this.fetcher = options.fetcher ?? globalThis.fetch;
  }

  async loadVehicleAsset(
    vehicleIdValue: unknown,
    requestIdValue: unknown,
    ownerId: number,
    onProgress: ProgressCallback,
  ): Promise<VehicleAssetLoadResult> {
    const vehicle = await this.resolveVehicle(vehicleIdValue);
    if (typeof requestIdValue !== "string" || !/^[a-zA-Z0-9_-]{16,64}$/.test(requestIdValue)) {
      throw new VehicleAssetServiceError("INVALID", "The vehicle asset request ID is invalid.");
    }
    if (this.activeRequests.has(requestIdValue)) {
      throw new VehicleAssetServiceError("INVALID", "The vehicle asset request is already active.");
    }
    const controller = new AbortController();
    this.activeRequests.set(requestIdValue, { ownerId, controller });
    try {
      return vehicle.remoteFiles
        ? await this.loadRemoteVehicle(vehicle, controller.signal, onProgress)
        : await this.loadLocalVehicle(vehicle, controller.signal, onProgress);
    } catch (error) {
      throw asVehicleAssetError(error);
    } finally {
      if (this.activeRequests.get(requestIdValue)?.controller === controller) {
        this.activeRequests.delete(requestIdValue);
      }
    }
  }

  cancelRequest(requestId: unknown, ownerId: number): boolean {
    if (typeof requestId !== "string") return false;
    const active = this.activeRequests.get(requestId);
    if (!active || active.ownerId !== ownerId) return false;
    active.controller.abort();
    return true;
  }

  cancelOwner(ownerId: number): void {
    for (const active of this.activeRequests.values()) {
      if (active.ownerId === ownerId) active.controller.abort();
    }
  }

  async getCacheStatus(vehicleIdValue: unknown): Promise<VehicleAssetCacheStatus> {
    const vehicle = await this.resolveVehicle(vehicleIdValue, true);
    if (!vehicle.remoteFiles) {
      return { cached: false, invalid: await this.cacheDirectoryHasEntries(vehicle.id), bytes: 0 };
    }
    const result = await this.readCache(vehicle, false, () => undefined);
    return result
      ? { cached: true, invalid: false, bytes: result.bytes }
      : { cached: false, invalid: await this.cacheDirectoryHasEntries(vehicle.id), bytes: 0 };
  }

  async removeCache(vehicleIdValue: unknown): Promise<boolean> {
    const vehicle = await this.resolveVehicle(vehicleIdValue, true);
    const vehicleDirectory = path.join(this.options.cacheRoot, vehicle.id);
    try {
      const rootInfo = await lstat(this.options.cacheRoot);
      const info = await lstat(vehicleDirectory);
      if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory() || info.isSymbolicLink() || !info.isDirectory()) {
        throw new VehicleAssetServiceError("INVALID", "The vehicle cache directory is not a safe directory.");
      }
    } catch (error) {
      if (errorCode(error) === "ENOENT") return false;
      throw error;
    }
    await rm(vehicleDirectory, { recursive: true, force: false });
    return true;
  }

  private async resolveVehicle(
    vehicleIdValue: unknown,
    allowUnavailable = false,
  ): Promise<ResolvedVehicle> {
    if (typeof vehicleIdValue !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(vehicleIdValue)) {
      throw new VehicleAssetServiceError("INVALID", "The vehicle ID is invalid.");
    }
    let catalogue: unknown;
    try {
      catalogue = JSON.parse(await readFile(this.options.manifestPath, "utf8")) as unknown;
    } catch {
      throw new VehicleAssetServiceError("INVALID", "The bundled vehicle catalogue could not be read.");
    }
    if (!Array.isArray(catalogue)) {
      throw new VehicleAssetServiceError("INVALID", "The bundled vehicle catalogue is malformed.");
    }
    const matches = catalogue.filter((record) => isRecord(record) && record.id === vehicleIdValue);
    const record = matches[0];
    if (matches.length !== 1 || !isRecord(record)) {
      throw new VehicleAssetServiceError("NOT_AVAILABLE", "This vehicle is not registered in the catalogue.");
    }
    const vehicle = record;
    const assetValue = vehicle.asset;
    if (!isRecord(assetValue)) {
      throw new VehicleAssetServiceError("NOT_AVAILABLE", "This vehicle is not registered in the catalogue.");
    }
    const asset = assetValue;
    if (asset.status === "unavailable") {
      if (allowUnavailable) return { id: vehicleIdValue, mainFile: "", files: [], remoteFiles: null, integrity: {} };
      throw new VehicleAssetServiceError("NOT_AVAILABLE", "3D MODEL NOT AVAILABLE — ASSET REQUIRED");
    }
    if (asset.status === "license-review-required" || asset.accuracy === "unverified") {
      if (allowUnavailable) return { id: vehicleIdValue, mainFile: "", files: [], remoteFiles: null, integrity: {} };
      throw new VehicleAssetServiceError(
        "LICENSE_REVIEW_REQUIRED",
        "This asset cannot be fetched until its source, licence, and integrity have been verified.",
      );
    }
    if (asset.status !== "available" || asset.accuracy !== "verified") {
      throw new VehicleAssetServiceError("INVALID", "The registered vehicle asset metadata failed validation.");
    }

    const mainFile = asset.mainFile;
    if (typeof mainFile !== "string" || !isSafeAssetPath(mainFile) || !/\.(glb|gltf)$/i.test(mainFile)) {
      throw new VehicleAssetServiceError("INVALID", "The registered vehicle main file path is invalid.");
    }
    if (!Array.isArray(asset.files) || asset.files.length === 0 || asset.files.length > MAX_FILE_COUNT) {
      throw new VehicleAssetServiceError("INVALID", "The registered vehicle asset file list is invalid.");
    }
    const files: string[] = [];
    for (const file of asset.files) {
      if (!isSafeAssetPath(file)) {
        throw new VehicleAssetServiceError("INVALID", "The registered vehicle asset file list contains an unsafe path.");
      }
      files.push(file);
    }
    if (!files.includes(mainFile)) {
      throw new VehicleAssetServiceError("INVALID", "The registered vehicle asset file list omits its main model.");
    }
    const integrityValue = asset.integrity;
    if (!isRecord(integrityValue) || Object.keys(integrityValue).length !== files.length) {
      throw new VehicleAssetServiceError("INVALID", "The registered vehicle integrity metadata is incomplete.");
    }
    const integrity: Record<string, string> = {};
    for (const file of files) {
      const hash = integrityValue[file];
      if (typeof hash !== "string" || !/^[a-f0-9]{64}$/i.test(hash)) {
        throw new VehicleAssetServiceError("INVALID", `The registered SHA-256 hash is invalid for "${file}".`);
      }
      integrity[file] = hash;
    }
    if (
      !isRecord(asset.source) ||
      !isPublicHttpsUrl(asset.source.url) ||
      !isRecord(asset.license) ||
      !isPublicHttpsUrl(asset.license.url)
    ) {
      throw new VehicleAssetServiceError("INVALID", "The registered source and license metadata is invalid.");
    }

    const uniqueFiles = new Set(files.map(normalizedAssetPath));
    if (uniqueFiles.size !== files.length) {
      throw new VehicleAssetServiceError("INVALID", "The registered vehicle asset contains duplicate file paths.");
    }
    let remoteFiles: RemoteAssetFile[] | null = null;
    if (asset.remoteFiles !== undefined && asset.remoteFiles !== null) {
      if (!Array.isArray(asset.remoteFiles) || asset.remoteFiles.length !== files.length) {
        throw new VehicleAssetServiceError("INVALID", "The registered remote vehicle files failed validation.");
      }
      remoteFiles = [];
      for (const remoteFile of asset.remoteFiles) {
        if (
          !isRecord(remoteFile) ||
          typeof remoteFile.path !== "string" ||
          !files.includes(remoteFile.path) ||
          !isPublicHttpsUrl(remoteFile.url)
        ) {
          throw new VehicleAssetServiceError("INVALID", "The registered remote vehicle files failed validation.");
        }
        remoteFiles.push({ path: remoteFile.path, url: remoteFile.url });
      }
      if (new Set(remoteFiles.map((file) => file.path)).size !== files.length) {
        throw new VehicleAssetServiceError("INVALID", "The registered remote vehicle files contain duplicates.");
      }
    }
    if (files.reduce((sum, file) => sum + file.length, 0) > 16_384) {
      throw new VehicleAssetServiceError("INVALID", "The registered vehicle asset paths are too long.");
    }
    return {
      id: vehicleIdValue,
      mainFile,
      files,
      remoteFiles,
      integrity,
    };
  }

  private async loadLocalVehicle(
    vehicle: ResolvedVehicle,
    signal: AbortSignal,
    onProgress: ProgressCallback,
  ): Promise<VehicleAssetLoadResult> {
    const files: Array<{ path: string; data: ArrayBuffer }> = [];
    let totalBytes = 0;
    for (let index = 0; index < vehicle.files.length; index += 1) {
      signal.throwIfAborted();
      const relativePath = vehicle.files[index];
      let bytes: Buffer;
      try {
        bytes = await this.readSafeLocalFile(relativePath);
      } catch (error) {
        if (errorCode(error) === "ENOENT") {
          throw new VehicleAssetServiceError("NOT_AVAILABLE", `Registered local asset file is missing: ${relativePath}`);
        }
        throw error;
      }
      totalBytes += bytes.byteLength;
      this.validateFileSize(
        relativePath,
        bytes.byteLength,
        totalBytes,
        normalizedAssetPath(relativePath) === normalizedAssetPath(vehicle.mainFile),
      );
      if (sha256(bytes) !== vehicle.integrity[relativePath].toLowerCase()) {
        throw new VehicleAssetServiceError("INVALID", `Registered local asset failed SHA-256 verification: ${relativePath}`);
      }
      files.push({ path: relativePath, data: toArrayBuffer(bytes) });
      onProgress({
        vehicleId: vehicle.id,
        stage: "validate",
        loaded: index + 1,
        total: vehicle.files.length,
        percent: Math.round(((index + 1) / vehicle.files.length) * 100),
      });
    }
    const main = files.find((file) => normalizedAssetPath(file.path) === normalizedAssetPath(vehicle.mainFile));
    if (!main) throw new VehicleAssetServiceError("INVALID", "The registered main vehicle model is missing.");
    validateMainFile(new Uint8Array(main.data), vehicle.mainFile, new Set(vehicle.files.map(normalizedAssetPath)));
    return { vehicleId: vehicle.id, source: "local", cached: false, files };
  }

  private validateFileSize(
    relativePath: string,
    fileBytes: number,
    totalBytes: number,
    isMainFile: boolean,
  ): void {
    if (
      fileBytes <= 0 ||
      fileBytes > (isMainFile ? MAX_MAIN_FILE_BYTES : MAX_TOTAL_BYTES) ||
      totalBytes > MAX_TOTAL_BYTES
    ) {
      throw new VehicleAssetServiceError("INVALID", `Registered vehicle asset file exceeds its size limit: ${relativePath}`);
    }
  }

  private async readSafeLocalFile(relativePath: string): Promise<Buffer> {
    const rootInfo = await lstat(this.options.assetRoot);
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
      throw new VehicleAssetServiceError("INVALID", "The packaged vehicle asset directory is not safe.");
    }
    let currentPath = this.options.assetRoot;
    const segments = relativePath.split("/");
    for (let index = 0; index < segments.length; index += 1) {
      currentPath = path.join(currentPath, segments[index]);
      const info = await lstat(currentPath);
      if (info.isSymbolicLink() || (index < segments.length - 1 && !info.isDirectory())) {
        throw new VehicleAssetServiceError("INVALID", "A registered vehicle asset path is not a regular file path.");
      }
      if (index === segments.length - 1 && !info.isFile()) {
        throw new VehicleAssetServiceError("INVALID", "A registered vehicle asset is not a regular file.");
      }
    }
    return readFile(currentPath);
  }

  private async loadRemoteVehicle(
    vehicle: ResolvedVehicle,
    signal: AbortSignal,
    onProgress: ProgressCallback,
  ): Promise<VehicleAssetLoadResult> {
    const cached = await this.readCache(vehicle, true, onProgress);
    signal.throwIfAborted();
    if (cached) {
      return {
        vehicleId: vehicle.id,
        source: "remote",
        cached: true,
        files: cached.files,
      };
    }
    const remoteByPath = new Map(vehicle.remoteFiles?.map((file) => [file.path, file]) ?? []);
    const fingerprint = cacheFingerprint(vehicle);
    const vehicleCacheDirectory = path.join(this.options.cacheRoot, vehicle.id);
    await this.ensureSafeCacheDirectory(vehicleCacheDirectory);
    const stagingDirectory = path.join(vehicleCacheDirectory, `${fingerprint}.pending-${randomUUID()}`);
    await mkdir(stagingDirectory);
    try {
      let totalBytes = 0;
      for (let index = 0; index < vehicle.files.length; index += 1) {
        signal.throwIfAborted();
        const relativePath = vehicle.files[index];
        const remoteFile = remoteByPath.get(relativePath);
        if (!remoteFile) {
          throw new VehicleAssetServiceError("INVALID", `No remote source is registered for "${relativePath}".`);
        }
        const destination = path.join(stagingDirectory, `${index}.asset`);
        const downloadedBytes = await this.downloadFile(
          remoteFile.url,
          destination,
          signal,
          relativePath,
          normalizedAssetPath(relativePath) === normalizedAssetPath(vehicle.mainFile),
          vehicle.integrity[relativePath],
          (filePercent) => {
            const percent = Math.floor(((index + filePercent / 100) / vehicle.files.length) * 100);
            onProgress({
              vehicleId: vehicle.id,
              stage: "download",
              loaded: index + filePercent / 100,
              total: vehicle.files.length,
              percent,
            });
          },
        );
        totalBytes += downloadedBytes;
        if (totalBytes > MAX_TOTAL_BYTES) {
          throw new VehicleAssetServiceError("INVALID", "The selected vehicle asset exceeds the 128 MB limit.");
        }
      }

      const mainIndex = vehicle.files.findIndex(
        (file) => normalizedAssetPath(file) === normalizedAssetPath(vehicle.mainFile),
      );
      if (mainIndex < 0) throw new VehicleAssetServiceError("INVALID", "The registered main vehicle model is missing.");
      const mainBytes = await readFile(path.join(stagingDirectory, `${mainIndex}.asset`));
      validateMainFile(mainBytes, vehicle.mainFile, new Set(vehicle.files.map(normalizedAssetPath)));
      signal.throwIfAborted();

      const finalDirectory = path.join(vehicleCacheDirectory, fingerprint);
      try {
        await rename(stagingDirectory, finalDirectory);
      } catch (error) {
        if (errorCode(error) !== "EEXIST" && errorCode(error) !== "ENOTEMPTY") throw error;
        await rm(stagingDirectory, { recursive: true, force: true });
        const concurrentCache = await this.readCache(vehicle, false, onProgress);
        if (concurrentCache) {
          return {
            vehicleId: vehicle.id,
            source: "remote",
            cached: true,
            files: concurrentCache.files,
          };
        }
        throw new VehicleAssetServiceError("DOWNLOAD_FAILED", "The vehicle cache could not be finalized.");
      }
      const completed = await this.readCache(vehicle, false, onProgress);
      if (!completed) throw new VehicleAssetServiceError("INVALID", "The downloaded vehicle cache failed validation.");
      return {
        vehicleId: vehicle.id,
        source: "remote",
        cached: false,
        files: completed.files,
      };
    } catch (error) {
      try {
        await rm(stagingDirectory, { recursive: true, force: true });
      } catch {
        throw new VehicleAssetServiceError(
          "DOWNLOAD_FAILED",
          "Vehicle asset retrieval failed and its incomplete temporary cache could not be removed.",
        );
      }
      throw error;
    }
  }

  private async downloadFile(
    initialUrl: string,
    destination: string,
    signal: AbortSignal,
    relativePath: string,
    isMainFile: boolean,
    expectedHash: string,
    onProgress: (percent: number) => void,
  ): Promise<number> {
    const response = await this.fetchWithSafeRedirects(initialUrl, signal);
    if (!response.ok) {
      await response.body?.cancel();
      throw new VehicleAssetServiceError(
        response.status === 404 ? "INVALID" : "DOWNLOAD_FAILED",
        `The registered asset server returned HTTP ${response.status}.`,
      );
    }
    if (!response.body) {
      throw new VehicleAssetServiceError("INVALID", "The registered asset response has no file content.");
    }
    const rawLength = response.headers.get("content-length");
    const announcedLength = rawLength === null ? 0 : Number(rawLength);
    if (!Number.isFinite(announcedLength) || announcedLength < 0) {
      await response.body.cancel();
      throw new VehicleAssetServiceError("INVALID", "The registered asset server returned an invalid file size.");
    }
    const maxFileBytes = isMainFile
      ? MAX_MAIN_FILE_BYTES
      : MAX_TOTAL_BYTES;
    if (announcedLength > maxFileBytes) {
      await response.body.cancel();
      throw new VehicleAssetServiceError("INVALID", "A registered vehicle asset file exceeds its size limit.");
    }

    const integrity = createHash("sha256");
    const reader = response.body.getReader();
    let handle: Awaited<ReturnType<typeof open>> | undefined;
    let bytesLoaded = 0;
    try {
      handle = await open(destination, "wx");
      while (true) {
        signal.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        bytesLoaded += value.byteLength;
        if (bytesLoaded > maxFileBytes) {
          throw new VehicleAssetServiceError("INVALID", "A registered vehicle asset file exceeds its size limit.");
        }
        integrity.update(value);
        let written = 0;
        while (written < value.byteLength) {
          const result = await handle.write(value.subarray(written));
          if (result.bytesWritten === 0) {
            throw new VehicleAssetServiceError("DOWNLOAD_FAILED", "A vehicle asset could not be written to its cache.");
          }
          written += result.bytesWritten;
        }
        const percent = announcedLength > 0
          ? Math.min(100, Math.round((bytesLoaded / announcedLength) * 100))
          : 0;
        onProgress(percent);
      }
      await handle.sync();
    } finally {
      if (handle) await handle.close();
      reader.releaseLock();
    }
    if (bytesLoaded === 0) {
      throw new VehicleAssetServiceError("INVALID", `The registered vehicle asset file is empty: ${relativePath}`);
    }
    if (integrity.digest("hex") !== expectedHash.toLowerCase()) {
      throw new VehicleAssetServiceError("INVALID", `The downloaded vehicle file failed SHA-256 verification: ${relativePath}`);
    }
    return bytesLoaded;
  }

  private async fetchWithSafeRedirects(urlValue: string, signal: AbortSignal): Promise<Response> {
    if (!isPublicHttpsUrl(urlValue)) {
      throw new VehicleAssetServiceError("INVALID", "The registered remote asset URL is not a safe HTTPS URL.");
    }
    const initialUrl = new URL(urlValue);
    let currentUrl = initialUrl;
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      let response: Response;
      try {
        response = await this.fetcher(currentUrl, { signal, redirect: "manual" });
      } catch (error) {
        throw asVehicleAssetError(error);
      }
      const actualUrl = response.url ? new URL(response.url) : currentUrl;
      if (!isPublicHttpsUrl(actualUrl.toString()) || actualUrl.origin !== initialUrl.origin) {
        await response.body?.cancel();
        throw new VehicleAssetServiceError("INVALID", "The asset server redirected outside its registered HTTPS origin.");
      }
      if (![301, 302, 303, 307, 308].includes(response.status)) return response;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new VehicleAssetServiceError("DOWNLOAD_FAILED", "The registered asset server returned an invalid redirect.");
      }
      let redirectedUrl: URL;
      try {
        redirectedUrl = new URL(location, currentUrl);
      } catch {
        throw new VehicleAssetServiceError("INVALID", "The registered asset server returned an invalid redirect URL.");
      }
      if (
        !isPublicHttpsUrl(redirectedUrl.toString()) ||
        redirectedUrl.origin !== initialUrl.origin
      ) {
        throw new VehicleAssetServiceError("INVALID", "The asset server redirected outside its registered HTTPS origin.");
      }
      currentUrl = redirectedUrl;
    }
    throw new VehicleAssetServiceError("DOWNLOAD_FAILED", "The registered asset server redirected too many times.");
  }

  private async readCache(
    vehicle: ResolvedVehicle,
    removeInvalid: boolean,
    onProgress: ProgressCallback,
  ): Promise<{ files: Array<{ path: string; data: ArrayBuffer }>; bytes: number } | null> {
    const fingerprint = cacheFingerprint(vehicle);
    const vehicleDirectory = path.join(this.options.cacheRoot, vehicle.id);
    const cacheDirectory = path.join(vehicleDirectory, fingerprint);
    try {
      const rootInfo = await lstat(this.options.cacheRoot);
      const vehicleInfo = await lstat(vehicleDirectory);
      const cacheInfo = await lstat(cacheDirectory);
      if (
        rootInfo.isSymbolicLink() ||
        vehicleInfo.isSymbolicLink() ||
        cacheInfo.isSymbolicLink() ||
        !rootInfo.isDirectory() ||
        !vehicleInfo.isDirectory() ||
        !cacheInfo.isDirectory()
      ) {
        throw new VehicleAssetServiceError("INVALID", "The vehicle cache contains an unsafe path.");
      }
    } catch (error) {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    }

    const files: Array<{ path: string; data: ArrayBuffer }> = [];
    let totalBytes = 0;
    for (let index = 0; index < vehicle.files.length; index += 1) {
      const relativePath = vehicle.files[index];
      const cacheFile = path.join(cacheDirectory, `${index}.asset`);
      let bytes: Buffer;
      try {
        const info = await lstat(cacheFile);
        if (info.isSymbolicLink() || !info.isFile()) {
          throw new VehicleAssetServiceError("INVALID", "The vehicle cache contains an unsafe file.");
        }
        bytes = await readFile(cacheFile);
      } catch (error) {
        if (errorCode(error) === "ENOENT") {
          if (removeInvalid) await rm(cacheDirectory, { recursive: true, force: true });
          return null;
        }
        throw error;
      }
      totalBytes += bytes.byteLength;
      if (
        totalBytes > MAX_TOTAL_BYTES ||
        bytes.byteLength > (normalizedAssetPath(relativePath) === normalizedAssetPath(vehicle.mainFile)
          ? MAX_MAIN_FILE_BYTES
          : MAX_TOTAL_BYTES) ||
        sha256(bytes) !== vehicle.integrity[relativePath].toLowerCase()
      ) {
        if (removeInvalid) await rm(cacheDirectory, { recursive: true, force: true });
        return null;
      }
      files.push({ path: relativePath, data: toArrayBuffer(bytes) });
      onProgress({
        vehicleId: vehicle.id,
        stage: "cache",
        loaded: index + 1,
        total: vehicle.files.length,
        percent: Math.round(((index + 1) / vehicle.files.length) * 100),
      });
    }
    const main = files.find((file) => normalizedAssetPath(file.path) === normalizedAssetPath(vehicle.mainFile));
    if (!main) return null;
    try {
      validateMainFile(new Uint8Array(main.data), vehicle.mainFile, new Set(vehicle.files.map(normalizedAssetPath)));
    } catch {
      if (removeInvalid) await rm(cacheDirectory, { recursive: true, force: true });
      return null;
    }
    return { files, bytes: totalBytes };
  }

  private async cacheDirectoryHasEntries(vehicleId: string): Promise<boolean> {
    try {
      const rootInfo = await lstat(this.options.cacheRoot);
      const vehicleDirectory = path.join(this.options.cacheRoot, vehicleId);
      const vehicleInfo = await lstat(vehicleDirectory);
      if (
        rootInfo.isSymbolicLink() ||
        vehicleInfo.isSymbolicLink() ||
        !rootInfo.isDirectory() ||
        !vehicleInfo.isDirectory()
      ) {
        throw new VehicleAssetServiceError("INVALID", "The vehicle cache contains an unsafe path.");
      }
      return (await readdir(vehicleDirectory)).length > 0;
    } catch (error) {
      if (errorCode(error) === "ENOENT") return false;
      throw error;
    }
  }

  private async ensureSafeCacheDirectory(vehicleDirectory: string): Promise<void> {
    await mkdir(this.options.cacheRoot, { recursive: true });
    const rootInfo = await lstat(this.options.cacheRoot);
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
      throw new VehicleAssetServiceError("INVALID", "The vehicle cache root is not a safe directory.");
    }
    try {
      await mkdir(vehicleDirectory);
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
    }
    const vehicleInfo = await lstat(vehicleDirectory);
    if (vehicleInfo.isSymbolicLink() || !vehicleInfo.isDirectory()) {
      throw new VehicleAssetServiceError("INVALID", "The vehicle cache path is not a safe directory.");
    }
  }
}
