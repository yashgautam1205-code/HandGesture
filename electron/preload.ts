import { contextBridge, ipcRenderer } from "electron";
import type { AIProviderResult, AIProviderStatus } from "./aiProvider";

type VehicleAssetProgress = {
  vehicleId: string;
  stage: "cache" | "download" | "validate";
  loaded: number;
  total: number;
  percent: number;
};

type VehicleAssetLoadResult = {
  vehicleId: string;
  source: "local" | "remote";
  cached: boolean;
  files: Array<{ path: string; data: ArrayBuffer }>;
};

type VehicleAssetReply =
  | { ok: true; result: VehicleAssetLoadResult }
  | { ok: false; code: string; message: string };

function isVehicleAssetProgress(value: unknown): value is VehicleAssetProgress & { requestId: string } {
  if (!value || typeof value !== "object") return false;
  const progress = value as Record<string, unknown>;
  return (
    typeof progress.requestId === "string" &&
    typeof progress.vehicleId === "string" &&
    ["cache", "download", "validate"].includes(String(progress.stage)) &&
    typeof progress.loaded === "number" &&
    Number.isFinite(progress.loaded) &&
    typeof progress.total === "number" &&
    Number.isFinite(progress.total) &&
    typeof progress.percent === "number" &&
    Number.isFinite(progress.percent)
  );
}

contextBridge.exposeInMainWorld("gestureDrive", {
  saveProject: (contents: string) => ipcRenderer.invoke("project:save", contents) as Promise<boolean>,
  loadProject: () => ipcRenderer.invoke("project:load") as Promise<string | null>,
  getAIStatus: () => ipcRenderer.invoke("ai:status") as Promise<AIProviderStatus>,
  requestAI: (systemPrompt: string, userPrompt: string) =>
    ipcRenderer.invoke("ai:request", { systemPrompt, userPrompt }) as Promise<AIProviderResult>,
  loadVehicleAsset: async (
    vehicleId: string,
    requestId: string,
    onProgress: (progress: VehicleAssetProgress) => void,
  ): Promise<VehicleAssetLoadResult> => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      if (isVehicleAssetProgress(payload) && payload.requestId === requestId) {
        onProgress({
          vehicleId: payload.vehicleId,
          stage: payload.stage,
          loaded: payload.loaded,
          total: payload.total,
          percent: payload.percent,
        });
      }
    };
    ipcRenderer.on("vehicle-asset:progress", listener);
    try {
      const reply = await ipcRenderer.invoke(
        "vehicle-asset:load",
        vehicleId,
        requestId,
      ) as VehicleAssetReply;
      if (!reply.ok) {
        const error = new Error(reply.message);
        error.name = "VehicleAssetBridgeError";
        Object.assign(error, { code: reply.code });
        throw error;
      }
      return reply.result;
    } finally {
      ipcRenderer.removeListener("vehicle-asset:progress", listener);
    }
  },
  cancelVehicleAsset: (requestId: string) =>
    ipcRenderer.invoke("vehicle-asset:cancel", requestId) as Promise<boolean>,
  getVehicleAssetCacheStatus: (vehicleId: string) =>
    ipcRenderer.invoke("vehicle-asset:cache-status", vehicleId) as Promise<{
      cached: boolean;
      invalid: boolean;
      bytes: number;
    }>,
  removeVehicleAssetCache: (vehicleId: string) =>
    ipcRenderer.invoke("vehicle-asset:cache-remove", vehicleId) as Promise<boolean>,
});