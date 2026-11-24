import type { ComponentCategory, VehicleComponentMapping } from "../engine/components";

export type VehicleAssetStatus = "available" | "unavailable" | "license-review-required";
export type VehicleAccuracyStatus = "verified" | "unverified" | "not-available";

export type VehicleAssetAttribution = {
  name: string;
  url: string | null;
  attribution: string | null;
};

export type VehicleRemoteAssetFile = {
  path: string;
  url: string;
};

export type VehicleAssetManifest = {
  status: VehicleAssetStatus;
  mainFile: string | null;
  files: string[];
  remoteFiles?: VehicleRemoteAssetFile[] | null;
  integrity?: Record<string, string> | null;
  source: VehicleAssetAttribution | null;
  license: VehicleAssetAttribution | null;
  accuracy: VehicleAccuracyStatus;
};

export type VehicleSpecification = string | number;

export type VehicleCatalogueRecord = {
  id: string;
  manufacturer: string;
  model: string;
  generation: string | null;
  year: number | null;
  variant: string | null;
  bodyStyle?: string | null;
  displayName: string;
  thumbnail: string | null;
  specifications: Record<string, VehicleSpecification> | null;
  asset: VehicleAssetManifest;
  components: VehicleComponentMapping[];
  customizationOptions: string[];
};

export type VehicleProjectMetadata = {
  catalogueVehicleId?: string;
  displayName?: string;
  assetSource?: string;
  assetVerification?: Exclude<VehicleAccuracyStatus, "not-available">;
};

export type { ComponentCategory, VehicleComponentMapping };
