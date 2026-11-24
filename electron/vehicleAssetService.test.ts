import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VehicleAssetService, VehicleAssetServiceError } from "./vehicleAssetService";

const vehicleId = "demo-car";
const mainFile = "vehicles/demo-car/model.glb";

function createGlb(document: unknown = { asset: { version: "2.0" }, buffers: [] }): Buffer {
  const json = Buffer.from(JSON.stringify(document), "utf8");
  const jsonLength = Math.ceil(json.byteLength / 4) * 4;
  const glb = Buffer.alloc(20 + jsonLength, 0x20);
  glb.write("glTF", 0, "ascii");
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.byteLength, 8);
  glb.writeUInt32LE(jsonLength, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  json.copy(glb, 20);
  return glb;
}

function createManifest(bytes: Buffer, overrides: Record<string, unknown> = {}) {
  return [
    {
      id: vehicleId,
      asset: {
        status: "available",
        accuracy: "verified",
        mainFile,
        files: [mainFile],
        source: { name: "Test source", url: "https://assets.example/source", attribution: null },
        license: { name: "Test license", url: "https://assets.example/license", attribution: null },
        integrity: { [mainFile]: createHash("sha256").update(bytes).digest("hex") },
        remoteFiles: [{ path: mainFile, url: "https://assets.example/model.glb" }],
        ...overrides,
      },
    },
  ];
}

describe("VehicleAssetService", () => {
  let temporaryRoot: string;
  let manifestPath: string;
  let assetRoot: string;
  let cacheRoot: string;
  let modelBytes: Buffer;

  beforeEach(async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "gesture-drive-assets-"));
    manifestPath = path.join(temporaryRoot, "manifest.json");
    assetRoot = path.join(temporaryRoot, "assets");
    cacheRoot = path.join(temporaryRoot, "cache");
    modelBytes = createGlb();
  });

  afterEach(async () => {
    await rm(temporaryRoot, { recursive: true, force: true });
  });

  async function writeManifest(manifest: unknown): Promise<void> {
    await writeFile(manifestPath, JSON.stringify(manifest), "utf8");
  }

  function service(fetcher?: typeof fetch): VehicleAssetService {
    return new VehicleAssetService({ manifestPath, assetRoot, cacheRoot, fetcher });
  }

  it("verifies and loads registered local files", async () => {
    await writeManifest(createManifest(modelBytes, { remoteFiles: null }));
    const modelPath = path.join(assetRoot, ...mainFile.split("/"));
    await mkdir(path.dirname(modelPath), { recursive: true });
    await writeFile(modelPath, modelBytes);

    const result = await service().loadVehicleAsset(vehicleId, "local-request-123456", 1, () => undefined);

    expect(result.source).toBe("local");
    expect(result.files).toHaveLength(1);
    expect(Buffer.from(result.files[0].data)).toEqual(modelBytes);
  });

  it("downloads once, verifies integrity, reuses the offline cache, and removes it", async () => {
    await writeManifest(createManifest(modelBytes));
    let online = true;
    const fetcher = vi.fn<typeof fetch>(async () => {
      if (!online) throw new TypeError("offline");
      return new Response(new Uint8Array(modelBytes), {
        status: 200,
        headers: { "content-length": String(modelBytes.byteLength) },
      });
    });
    const assetService = service(fetcher);

    const first = await assetService.loadVehicleAsset(vehicleId, "remote-request-123456", 7, () => undefined);
    online = false;
    const cached = await assetService.loadVehicleAsset(vehicleId, "cached-request-123456", 7, () => undefined);

    expect(first.cached).toBe(false);
    expect(cached.cached).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await assetService.getCacheStatus(vehicleId)).toEqual({
      cached: true,
      invalid: false,
      bytes: modelBytes.byteLength,
    });
    await expect(assetService.removeCache(vehicleId)).resolves.toBe(true);
    expect(await assetService.getCacheStatus(vehicleId)).toEqual({ cached: false, invalid: false, bytes: 0 });
  });

  it("keeps unavailable vehicles unavailable", async () => {
    await writeManifest([{ id: vehicleId, asset: { status: "unavailable" } }]);

    await expect(
      service().loadVehicleAsset(vehicleId, "unavailable-123456", 1, () => undefined),
    ).rejects.toMatchObject<Partial<VehicleAssetServiceError>>({ code: "NOT_AVAILABLE" });
  });

  it("blocks assets awaiting license review", async () => {
    await writeManifest(createManifest(modelBytes, {
      status: "license-review-required",
      accuracy: "unverified",
    }));

    await expect(
      service().loadVehicleAsset(vehicleId, "license-request-1234", 1, () => undefined),
    ).rejects.toMatchObject<Partial<VehicleAssetServiceError>>({ code: "LICENSE_REVIEW_REQUIRED" });
  });

  it("retries after a transient server failure", async () => {
    await writeManifest(createManifest(modelBytes));
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(new Uint8Array(modelBytes), { status: 200 }));
    const assetService = service(fetcher);

    await expect(
      assetService.loadVehicleAsset(vehicleId, "retry-first-request", 1, () => undefined),
    ).rejects.toMatchObject<Partial<VehicleAssetServiceError>>({ code: "DOWNLOAD_FAILED" });
    await expect(
      assetService.loadVehicleAsset(vehicleId, "retry-second-request", 1, () => undefined),
    ).resolves.toMatchObject({ cached: false, vehicleId });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("removes a corrupted cache before downloading a verified replacement", async () => {
    await writeManifest(createManifest(modelBytes));
    const fetcher = vi.fn<typeof fetch>(async () =>
      new Response(new Uint8Array(modelBytes), { status: 200 }),
    );
    const assetService = service(fetcher);
    await assetService.loadVehicleAsset(vehicleId, "cache-create-request", 1, () => undefined);
    const fingerprint = (await readdir(path.join(cacheRoot, vehicleId)))[0];
    await writeFile(path.join(cacheRoot, vehicleId, fingerprint, "0.asset"), "corrupt");

    await expect(assetService.getCacheStatus(vehicleId)).resolves.toEqual({
      cached: false,
      invalid: true,
      bytes: 0,
    });
    const replacement = await assetService.loadVehicleAsset(vehicleId, "cache-repair-request", 1, () => undefined);

    expect(replacement.cached).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(await assetService.getCacheStatus(vehicleId)).toEqual({
      cached: true,
      invalid: false,
      bytes: modelBytes.byteLength,
    });
  });

  it("allows removing a stale cache after an asset is marked unavailable", async () => {
    await writeManifest(createManifest(modelBytes));
    const fetcher = async () => new Response(new Uint8Array(modelBytes), { status: 200 });
    const assetService = service(fetcher);
    await assetService.loadVehicleAsset(vehicleId, "stale-cache-create-request", 1, () => undefined);
    await writeManifest([{ id: vehicleId, asset: { status: "unavailable" } }]);

    await expect(assetService.getCacheStatus(vehicleId)).resolves.toEqual({
      cached: false,
      invalid: true,
      bytes: 0,
    });
    await expect(assetService.removeCache(vehicleId)).resolves.toBe(true);
    await expect(assetService.getCacheStatus(vehicleId)).resolves.toEqual({
      cached: false,
      invalid: false,
      bytes: 0,
    });
  });

  it("rejects a registered file with a mismatched hash and leaves no cache", async () => {
    await writeManifest(createManifest(modelBytes, { integrity: { [mainFile]: "0".repeat(64) } }));
    const fetcher = async () => new Response(new Uint8Array(modelBytes), { status: 200 });

    await expect(
      service(fetcher).loadVehicleAsset(vehicleId, "hash-request-123456", 1, () => undefined),
    ).rejects.toMatchObject<Partial<VehicleAssetServiceError>>({ code: "INVALID" });
    await expect(readdir(path.join(cacheRoot, vehicleId))).resolves.toEqual([]);
  });

  it("rejects redirects outside the manifest source origin", async () => {
    await writeManifest(createManifest(modelBytes));
    const fetcher = async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://other.example/model.glb" },
      });

    await expect(
      service(fetcher).loadVehicleAsset(vehicleId, "redirect-request-1234", 1, () => undefined),
    ).rejects.toMatchObject<Partial<VehicleAssetServiceError>>({ code: "INVALID" });
  });

  it("cancels only the request owned by the requesting renderer", async () => {
    await writeManifest(createManifest(modelBytes));
    let markStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const fetcher: typeof fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
        markStarted();
      });
    const assetService = service(fetcher);
    const request = assetService.loadVehicleAsset(vehicleId, "cancel-request-123456", 23, () => undefined);
    await started;

    expect(assetService.cancelRequest("cancel-request-123456", 24)).toBe(false);
    expect(assetService.cancelRequest("cancel-request-123456", 23)).toBe(true);
    await expect(request).rejects.toMatchObject<Partial<VehicleAssetServiceError>>({ code: "CANCELLED" });
  });

  it("rejects glTF resources that are not present in the registered file list", async () => {
    modelBytes = createGlb({
      asset: { version: "2.0" },
      buffers: [{ uri: "../../unregistered.bin" }],
    });
    await writeManifest(createManifest(modelBytes));
    const fetcher = async () => new Response(new Uint8Array(modelBytes), { status: 200 });

    await expect(
      service(fetcher).loadVehicleAsset(vehicleId, "resource-request-1234", 1, () => undefined),
    ).rejects.toMatchObject<Partial<VehicleAssetServiceError>>({ code: "INVALID" });
  });
});
