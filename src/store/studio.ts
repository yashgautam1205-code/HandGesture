import { create } from "zustand";
import type { GestureName } from "../gesture/classifier";
import type { VehicleComponent } from "../engine/components";
import type { ModelAssetData, VehicleModelAudit } from "../engine/modelLoader";
import type { VehicleProjectMetadata } from "../vehicles/types";
import {
  installPart,
  removePart,
  type AttachmentPoint,
  type PartTransform,
  type ReplacementPart,
} from "../engine/parts";
import type * as THREE from "three";

export type Finish = "gloss" | "matte" | "metallic";
export type WheelDesign = "five-spoke" | "turbine";
export type SpoilerStyle = "sport" | "track";
export type BumperStyle = "street" | "track";
export type EnvironmentPreset = "dark-showroom" | "luxury-studio" | "daylight" | "neutral-inspection";
export type QualityLevel = "low" | "medium" | "high" | "ultra";
export type PresentationMode = "showroom" | "inspection" | "customization" | "presentation";
export type GestureSettings = {
  confidenceThreshold: number;
  gestureCooldown: number;
  smoothing: number;
  pinchThreshold: number;
  calibrationHandScale: number;
  pointDwellMs: number;
  pinchDwellMs: number;
  confirmHoldMs: number;
  twoHandZoom: boolean;
  trackingLostTimeoutMs: number;
};
export type Customization = {
  paint: string;
  finish: Finish;
  paintMetallic: number;
  paintRoughness: number;
  clearCoat: number;
  spoiler: boolean;
  windowTint: boolean;
  wheelColor: string;
  wheelDesign: WheelDesign;
  spoilerStyle: SpoilerStyle;
  bumperStyle: BumperStyle;
  environment: EnvironmentPreset;
  quality: QualityLevel;
  showroomEnvironment?: string;
};
export type ComponentMaterialOverride = {
  color: string;
  finish: Finish;
  metallic?: number;
  roughness?: number;
  clearCoat?: number;
  emissive?: string;
  opacity?: number;
};
export type DesignChange = {
  label: string;
  customization: Partial<Customization>;
  componentMaterials: Record<string, Partial<ComponentMaterialOverride>>;
};
export type VehicleEntry = {
  id: string;
  root: THREE.Group;
  components: VehicleComponent[];
  name: string;
  asset: ModelAssetData;
  mergedMeshCount: number;
  catalogueVehicleId: string | null;
  assetSource: string;
  assetVerification: "verified" | "unverified";
  audit: VehicleModelAudit;
};
type DesignSnapshot = {
  customization: Customization;
  componentMaterials: Record<string, ComponentMaterialOverride>;
  componentRotations: Record<string, [number, number, number]>;
};

const initialCustomization: Customization = {
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

export const DEFAULT_GESTURE_SETTINGS: GestureSettings = {
  confidenceThreshold: 0.55,
  gestureCooldown: 1800,
  smoothing: 0.4,
  pinchThreshold: 0.45,
  calibrationHandScale: 0.18,
  pointDwellMs: 700,
  pinchDwellMs: 600,
  confirmHoldMs: 800,
  twoHandZoom: true,
  trackingLostTimeoutMs: 3500,
};

const GESTURE_SETTINGS_KEY = "gesture-drive-3d.gesture-settings.v1";

function loadGestureSettings(): GestureSettings {
  if (typeof window === "undefined") return { ...DEFAULT_GESTURE_SETTINGS };
  try {
    const raw = window.localStorage.getItem(GESTURE_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_GESTURE_SETTINGS };
    const value = JSON.parse(raw) as Partial<GestureSettings>;
    return {
      confidenceThreshold: clamp(value.confidenceThreshold ?? DEFAULT_GESTURE_SETTINGS.confidenceThreshold, 0.3, 0.95),
      gestureCooldown: clamp(value.gestureCooldown ?? DEFAULT_GESTURE_SETTINGS.gestureCooldown, 300, 5000),
      smoothing: clamp(value.smoothing ?? DEFAULT_GESTURE_SETTINGS.smoothing, 0.1, 0.9),
      pinchThreshold: clamp(value.pinchThreshold ?? DEFAULT_GESTURE_SETTINGS.pinchThreshold, 0.2, 0.9),
      calibrationHandScale: clamp(
        value.calibrationHandScale ?? DEFAULT_GESTURE_SETTINGS.calibrationHandScale,
        0.08,
        0.45,
      ),
      pointDwellMs: clamp(value.pointDwellMs ?? DEFAULT_GESTURE_SETTINGS.pointDwellMs, 300, 2000),
      pinchDwellMs: clamp(value.pinchDwellMs ?? DEFAULT_GESTURE_SETTINGS.pinchDwellMs, 200, 2000),
      confirmHoldMs: clamp(value.confirmHoldMs ?? DEFAULT_GESTURE_SETTINGS.confirmHoldMs, 200, 2000),
      twoHandZoom: value.twoHandZoom ?? DEFAULT_GESTURE_SETTINGS.twoHandZoom,
      trackingLostTimeoutMs: clamp(
        value.trackingLostTimeoutMs ?? DEFAULT_GESTURE_SETTINGS.trackingLostTimeoutMs,
        1500,
        10000,
      ),
    };
  } catch {
    return { ...DEFAULT_GESTURE_SETTINGS };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function saveGestureSettings(settings: GestureSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GESTURE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Gesture settings remain available for the current session if storage is disabled.
  }
}

type StudioState = {
  selectedPart: string;
  gesture: GestureName;
  handConfidence: number;
  trackingLost: boolean;
  interactionPaused: boolean;
  customization: Customization;
  componentMaterials: Record<string, ComponentMaterialOverride>;
  aiPreview: DesignChange | null;
  componentRotations: Record<string, [number, number, number]>;
  componentVisibility: Record<string, boolean>;
  isolatedComponentId: string | null;
  showWireframe: boolean;
  showMeasurements: boolean;
  presentationMode: PresentationMode;
  autoRotate: boolean;
  cameraView: string;
  cameraViewNonce: number;
  replacementParts: ReplacementPart[];
  previewPartId: string | null;
  gestureSettings: GestureSettings;
  gestureSelectionPreview: string | null;
  vehicleRoot: THREE.Group | null;
  vehicleComponents: VehicleComponent[];
  vehicleLibrary: VehicleEntry[];
  activeVehicleId: string | null;
  vehicleName: string;
  modelAsset: ModelAssetData | null;
  mergedMeshCount: number;
  catalogueVehicleId: string | null;
  assetSource: string;
  assetVerification: "verified" | "unverified" | "not-available";
  modelAudit: VehicleModelAudit | null;
  explode: number;
  zoom: number;
  rotation: [number, number];
  statusMessage: string;
  pointAt: (x: number, y: number) => string;
  setSelectedPart: (id: string) => void;
  setGesture: (gesture: GestureName) => void;
  setHandConfidence: (confidence: number) => void;
  setTrackingLost: (lost: boolean) => void;
  setPaused: (paused: boolean) => void;
  setCustomization: (patch: Partial<Customization>) => void;
  setAIPreview: (preview: DesignChange | null) => void;
  applyDesignChange: (change: DesignChange) => void;
  setComponentMaterial: (id: string, patch: Partial<ComponentMaterialOverride>) => void;
  rotateSelectedComponent: (axis: 0 | 1 | 2, delta: number) => void;
  resetSelectedComponentTransform: () => void;
  setComponentVisible: (id: string, visible: boolean) => void;
  toggleComponentVisible: (id: string) => void;
  isolateComponent: (id: string | null) => void;
  setShowWireframe: (value: boolean) => void;
  setShowMeasurements: (value: boolean) => void;
  setPresentationMode: (mode: PresentationMode) => void;
  setAutoRotate: (value: boolean) => void;
  requestCameraView: (view: string) => void;
  setGestureSelectionPreview: (id: string | null) => void;
  addReplacementPart: (part: ReplacementPart) => void;
  updateReplacementPart: (id: string, patch: Partial<ReplacementPart>) => void;
  updateReplacementPartTransform: (id: string, transform: PartTransform) => void;
  updateReplacementPartAttachment: (id: string, attachment: AttachmentPoint | null) => void;
  previewReplacementPart: (id: string | null) => void;
  installReplacementPart: (id: string) => void;
  uninstallReplacementPart: (id: string) => void;
  removeReplacementPart: (id: string) => void;
  setGestureSettings: (patch: Partial<GestureSettings>) => void;
  resetGestureSettings: () => void;
  loadVehicle: (
    root: THREE.Group,
    components: VehicleComponent[],
    modelAsset: ModelAssetData,
    mergedMeshCount: number,
    metadata: VehicleProjectMetadata | undefined,
    audit: VehicleModelAudit,
  ) => void;
  selectVehicle: (id: string) => void;
  restoreProceduralVehicle: () => void;
  restoreDesign: (snapshot: {
    customization: Customization;
    componentMaterials: Record<string, ComponentMaterialOverride>;
    componentRotations: Record<string, [number, number, number]>;
  }) => void;
  setExplode: (value: number) => void;
  setZoom: (value: number) => void;
  setRotation: (yaw: number, pitch: number) => void;
  confirmCustomization: () => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  bindRaycast: (handler: (x: number, y: number) => string) => void;
};

let pointHandler: ((x: number, y: number) => string) | undefined;
const history: DesignSnapshot[] = [];
const future: DesignSnapshot[] = [];

function snapshot(state: StudioState): DesignSnapshot {
  return {
    customization: { ...state.customization },
    componentMaterials: structuredClone(state.componentMaterials),
    componentRotations: structuredClone(state.componentRotations),
  };
}

function pushHistory(state: StudioState): void {
  history.push(snapshot(state));
  if (history.length > 40) history.shift();
  future.length = 0;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  selectedPart: "body",
  gesture: "none",
  handConfidence: 0,
  trackingLost: false,
  interactionPaused: false,
  customization: initialCustomization,
  componentMaterials: {},
  aiPreview: null,
  componentRotations: {},
  componentVisibility: {},
  isolatedComponentId: null,
  showWireframe: false,
  showMeasurements: false,
  presentationMode: "customization",
  autoRotate: false,
  cameraView: "showroom",
  cameraViewNonce: 0,
  replacementParts: [],
  previewPartId: null,
  gestureSettings: loadGestureSettings(),
  gestureSelectionPreview: null,
  vehicleRoot: null,
  vehicleComponents: [],
  vehicleLibrary: [],
  activeVehicleId: null,
  vehicleName: "Procedural Sport Coupe",
  modelAsset: null,
  mergedMeshCount: 0,
  catalogueVehicleId: null,
  assetSource: "Procedural demo geometry",
  assetVerification: "not-available",
  modelAudit: null,
  explode: 0,
  zoom: 1,
  rotation: [0.35, 0],
  statusMessage: "",
  pointAt: (x, y) => pointHandler?.(x, y) ?? "",
  setSelectedPart: (selectedPart) => {
    const state = get();
    const component = state.vehicleComponents.find((candidate) => candidate.id === selectedPart);
    if (component && !component.inspectable) {
      set({ statusMessage: `${component.name} is not available for inspection` });
      return;
    }
    set({ selectedPart });
  },
  setGesture: (gesture) => set({ gesture }),
  setHandConfidence: (handConfidence) => set({ handConfidence }),
  setTrackingLost: (trackingLost) => set({ trackingLost }),
  setPaused: (interactionPaused) => set({ interactionPaused }),
  setCustomization: (patch) => {
    const state = get();
    pushHistory(state);
    set({
      customization: { ...state.customization, ...patch },
      aiPreview: null,
      statusMessage: "Design updated",
    });
  },
  setAIPreview: (aiPreview) => {
    const state = get();
    if (
      aiPreview &&
      state.vehicleRoot &&
      Object.keys(aiPreview.componentMaterials).some(
        (id) => !state.vehicleComponents.some((component) => component.id === id && component.editable),
      )
    ) {
      set({ aiPreview: null, statusMessage: "Preview targets a component that is not customizable" });
      return;
    }
    set({ aiPreview });
  },
  applyDesignChange: (change) => {
    const state = get();
    if (
      state.vehicleRoot &&
      Object.keys(change.componentMaterials).some(
        (id) => !state.vehicleComponents.some((component) => component.id === id && component.editable),
      )
    ) {
      set({ aiPreview: null, statusMessage: "AI change targets a component that is not customizable" });
      return;
    }
    pushHistory(state);
    const componentMaterials = { ...state.componentMaterials };
    for (const [id, patch] of Object.entries(change.componentMaterials)) {
      const current = componentMaterials[id] ?? {
        color: state.customization.paint,
        finish: state.customization.finish,
        metallic: state.customization.paintMetallic,
        roughness: state.customization.paintRoughness,
        clearCoat: state.customization.clearCoat,
      };
      componentMaterials[id] = { ...current, ...patch };
    }
    set({
      customization: { ...state.customization, ...change.customization },
      componentMaterials,
      aiPreview: null,
      statusMessage: "AI design applied",
    });
  },
  setComponentMaterial: (id, patch) => {
    const state = get();
    if (
      state.vehicleRoot &&
      !state.vehicleComponents.some((component) => component.id === id && component.editable)
    ) {
      set({ statusMessage: "This component does not allow material customization" });
      return;
    }
    const current = state.componentMaterials[id] ?? {
      color: state.customization.paint,
      finish: state.customization.finish,
      metallic: state.customization.paintMetallic,
      roughness: state.customization.paintRoughness,
      clearCoat: state.customization.clearCoat,
    };
    pushHistory(state);
    set({
      componentMaterials: {
        ...state.componentMaterials,
        [id]: { ...current, ...patch },
      },
      aiPreview: null,
      statusMessage: "Component material updated",
    });
  },
  rotateSelectedComponent: (axis, delta) => {
    const state = get();
    const selected = state.selectedPart;
    if (!selected) return;
    if (
      state.vehicleRoot &&
      !state.vehicleComponents.some((component) => component.id === selected && component.transformable)
    ) {
      set({ statusMessage: "This component does not allow transforms" });
      return;
    }
    pushHistory(state);
    const current = state.componentRotations[selected] ?? [0, 0, 0];
    const next: [number, number, number] = [...current];
    next[axis] += delta;
    set({
      componentRotations: { ...state.componentRotations, [selected]: next },
      statusMessage: "Component rotation updated",
    });
  },
  resetSelectedComponentTransform: () => {
    const state = get();
    if (!state.selectedPart) return;
    if (
      state.vehicleRoot &&
      !state.vehicleComponents.some((component) => component.id === state.selectedPart && component.transformable)
    ) {
      set({ statusMessage: "This component does not allow transforms" });
      return;
    }
    pushHistory(state);
    const componentRotations = { ...state.componentRotations };
    delete componentRotations[state.selectedPart];
    set({ componentRotations, statusMessage: "Component transform restored" });
  },
  setComponentVisible: (id, visible) =>
    set((state) => ({
      componentVisibility: { ...state.componentVisibility, [id]: visible },
      statusMessage: visible ? "Component visible" : "Component hidden",
    })),
  toggleComponentVisible: (id) => {
    const current = get().componentVisibility[id] !== false;
    set((state) => ({
      componentVisibility: { ...state.componentVisibility, [id]: !current },
      statusMessage: current ? "Component hidden" : "Component visible",
    }));
  },
  isolateComponent: (id) =>
    set({
      isolatedComponentId: id,
      statusMessage: id ? "Component isolated" : "All components visible",
    }),
  setShowWireframe: (showWireframe) => set({ showWireframe }),
  setShowMeasurements: (showMeasurements) => set({ showMeasurements }),
  setPresentationMode: (presentationMode) =>
    set({ presentationMode, statusMessage: `${presentationMode} mode` }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setGestureSelectionPreview: (gestureSelectionPreview) => set({ gestureSelectionPreview }),
  requestCameraView: (cameraView) =>
    set((state) => ({ cameraView, cameraViewNonce: state.cameraViewNonce + 1 })),
  addReplacementPart: (part) =>
    set((state) => ({
      replacementParts: [...state.replacementParts, part],
      previewPartId: part.id,
      statusMessage: `Replacement part imported: ${part.name}`,
    })),
  updateReplacementPart: (id, patch) =>
    set((state) => ({
      replacementParts: state.replacementParts.map((part) =>
        part.id === id ? { ...part, ...patch } : part,
      ),
    })),
  updateReplacementPartTransform: (id, transform) =>
    set((state) => ({
      replacementParts: state.replacementParts.map((part) =>
        part.id === id ? { ...part, transform } : part,
      ),
      statusMessage: "Replacement part transform updated",
    })),
  updateReplacementPartAttachment: (id, attachment) =>
    set((state) => ({
      replacementParts: state.replacementParts.map((part) =>
        part.id === id ? { ...part, attachment } : part,
      ),
      statusMessage: attachment ? "Attachment point updated" : "Attachment point cleared",
    })),
  previewReplacementPart: (previewPartId) => set({ previewPartId }),
  installReplacementPart: (id) => {
    const state = get();
    const part = state.replacementParts.find((candidate) => candidate.id === id);
    if (!part || !part.replacesComponentId) {
      set({ statusMessage: "Select a target component before installing." });
      return;
    }
    if (part.compatibility === "incompatible") {
      set({ statusMessage: "This replacement part is not compatible with the selected target." });
      return;
    }
    set({
      replacementParts: state.replacementParts.map((candidate) =>
        candidate.id === id ? installPart(candidate, candidate.replacesComponentId) : candidate,
      ),
      previewPartId: null,
      statusMessage: `${part.name} installed`,
    });
  },
  uninstallReplacementPart: (id) => {
    const state = get();
    const part = state.replacementParts.find((candidate) => candidate.id === id);
    if (!part) return;
    set({
      replacementParts: state.replacementParts.map((candidate) =>
        candidate.id === id ? removePart(candidate) : candidate,
      ),
      statusMessage: `${part.name} removed; original component restored`,
    });
  },
  removeReplacementPart: (id) => {
    const state = get();
    const part = state.replacementParts.find((candidate) => candidate.id === id);
    if (!part) return;
    set({
      replacementParts: state.replacementParts.filter((candidate) => candidate.id !== id),
      previewPartId: state.previewPartId === id ? null : state.previewPartId,
      statusMessage: `${part.name} deleted from the replacement library`,
    });
  },
  setGestureSettings: (patch) => {
    const settings = { ...get().gestureSettings, ...patch };
    saveGestureSettings(settings);
    set({ gestureSettings: settings });
  },
  resetGestureSettings: () => {
    const settings = { ...DEFAULT_GESTURE_SETTINGS };
    saveGestureSettings(settings);
    set({ gestureSettings: settings, statusMessage: "Gesture settings restored" });
  },
  loadVehicle: (vehicleRoot, vehicleComponents, modelAsset, mergedMeshCount, metadata, audit) => {
    const state = get();
    pushHistory(state);
    const name = modelAsset.name.replace(/\.(glb|gltf)$/i, "");
    const displayName = metadata?.displayName?.trim() || name;
    const entry: VehicleEntry = {
      id: `${Date.now()}-${state.vehicleLibrary.length}`,
      root: vehicleRoot,
      components: vehicleComponents,
      name: displayName,
      asset: modelAsset,
      mergedMeshCount,
      catalogueVehicleId: metadata?.catalogueVehicleId ?? null,
      assetSource: metadata?.assetSource ?? "User-provided local file",
      assetVerification: metadata?.assetVerification ?? "unverified",
      audit,
    };
    const vehicleLibrary = [...state.vehicleLibrary, entry].slice(-5);
    set({
      vehicleRoot,
      vehicleComponents,
      vehicleLibrary,
      activeVehicleId: entry.id,
      modelAsset,
      mergedMeshCount,
      catalogueVehicleId: entry.catalogueVehicleId,
      assetSource: entry.assetSource,
      assetVerification: entry.assetVerification,
      modelAudit: audit,
      vehicleName: displayName,
      selectedPart: "",
      explode: 0,
      componentMaterials: {},
      componentRotations: {},
      componentVisibility: {},
      isolatedComponentId: null,
      replacementParts: [],
      previewPartId: null,
      aiPreview: null,
      statusMessage: `Loaded ${modelAsset.name}`,
    });
  },
  selectVehicle: (id) => {
    const entry = get().vehicleLibrary.find((vehicle) => vehicle.id === id);
    if (!entry) return;
    set({
      vehicleRoot: entry.root,
      vehicleComponents: entry.components,
      activeVehicleId: entry.id,
      vehicleName: entry.name,
      modelAsset: entry.asset,
      mergedMeshCount: entry.mergedMeshCount,
      catalogueVehicleId: entry.catalogueVehicleId,
      assetSource: entry.assetSource,
      assetVerification: entry.assetVerification,
      modelAudit: entry.audit,
      selectedPart: "",
      explode: 0,
      componentMaterials: {},
      componentRotations: {},
      componentVisibility: {},
      isolatedComponentId: null,
      replacementParts: [],
      previewPartId: null,
      aiPreview: null,
      statusMessage: `Switched to ${entry.name}`,
    });
  },
  restoreProceduralVehicle: () => {
    const state = get();
    pushHistory(state);
    set({
      vehicleRoot: null,
      vehicleComponents: [],
      activeVehicleId: null,
      modelAsset: null,
      mergedMeshCount: 0,
      catalogueVehicleId: null,
      assetSource: "Procedural demo geometry",
      assetVerification: "not-available",
      modelAudit: null,
      vehicleName: "Procedural Sport Coupe",
      selectedPart: "body",
      explode: 0,
      componentMaterials: {},
      componentRotations: {},
      componentVisibility: {},
      isolatedComponentId: null,
      replacementParts: [],
      previewPartId: null,
      aiPreview: null,
      statusMessage: "Procedural model restored",
    });
  },
  restoreDesign: ({ customization, componentMaterials, componentRotations }) =>
    set({
      customization: { ...customization },
      componentMaterials: structuredClone(componentMaterials),
      componentRotations: structuredClone(componentRotations),
      aiPreview: null,
      statusMessage: "Project design loaded",
    }),
  setExplode: (explode) => set({ explode }),
  setZoom: (zoom) => set({ zoom: Math.min(1.65, Math.max(0.72, zoom)) }),
  setRotation: (yaw, pitch) => set({ rotation: [yaw, pitch] }),
  confirmCustomization: () => set({ aiPreview: null, statusMessage: "Customization confirmed" }),
  reset: () => {
    pushHistory(get());
    set({
      customization: initialCustomization,
      componentMaterials: {},
      componentRotations: {},
      componentVisibility: {},
      isolatedComponentId: null,
      showWireframe: false,
      showMeasurements: false,
      replacementParts: [],
      previewPartId: null,
      aiPreview: null,
      gestureSelectionPreview: null,
      trackingLost: false,
      selectedPart: get().vehicleRoot ? "" : "body",
      explode: 0,
      zoom: 1,
      rotation: [0.35, 0],
      statusMessage: "Original procedural model restored",
    });
  },
  undo: () => {
    const previous = history.pop();
    if (previous) {
      future.push(snapshot(get()));
      set({ ...previous, statusMessage: "Change undone" });
    }
  },
  redo: () => {
    const next = future.pop();
    if (next) {
      history.push(snapshot(get()));
      set({ ...next, statusMessage: "Change restored" });
    }
  },
  bindRaycast: (handler) => {
    pointHandler = handler;
  },
}));

export function customizationSnapshot(): Customization {
  return { ...useStudioStore.getState().customization };
}
