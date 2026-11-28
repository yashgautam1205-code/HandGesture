export {};

declare global {
  interface Window {
    gestureDrive?: {
      saveProject(contents: string): Promise<boolean>;
      loadProject(): Promise<string | null>;
      saveScreenshot(dataUrl: string): Promise<boolean>;
      getAIStatus(): Promise<{
        provider: "openai" | "anthropic" | "none";
        enabled: boolean;
        model: string | null;
      }>;
      requestAI(systemPrompt: string, userPrompt: string): Promise<{
        text: string | null;
        error: string | null;
        offline: boolean;
        provider: "openai" | "anthropic" | "none";
      }>;
      loadVehicleAsset(
        vehicleId: string,
        requestId: string,
        onProgress: (progress: {
          vehicleId: string;
          stage: "cache" | "download" | "validate";
          loaded: number;
          total: number;
          percent: number;
        }) => void,
      ): Promise<{
        vehicleId: string;
        source: "local" | "remote";
        cached: boolean;
        files: Array<{ path: string; data: ArrayBuffer }>;
      }>;
      cancelVehicleAsset(requestId: string): Promise<boolean>;
      getVehicleAssetCacheStatus(vehicleId: string): Promise<{
        cached: boolean;
        invalid: boolean;
        bytes: number;
      }>;
      removeVehicleAssetCache(vehicleId: string): Promise<boolean>;
    };
  }
}
