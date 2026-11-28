import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import AIAssistant from "./AIAssistant";
import { useHandTracker } from "../gesture/useHandTracker";
import { DEFAULT_GESTURE_SETTINGS, useStudioStore, type Finish } from "../store/studio";
import type { VehicleEntry } from "../store/studio";
import { createProposalDesignChange, PROCEDURAL_COMPONENTS } from "../ai/designChange";
import type { LoadedVehicle, ModelProgress } from "../engine/modelLoader";
import { parseProject, serializeProject } from "../engine/projectConfig";
import { CAMERA_VIEWS } from "../viewer/cameraSystem";
import {
  DEFAULT_SHOWROOM_ENVIRONMENT,
  SHOWROOM_ENVIRONMENTS,
} from "../viewer/showroomEnvironments";
import {
  getVehicleCatalogueRecord,
  VEHICLE_CATALOGUE,
  VEHICLE_MANUFACTURERS,
} from "../vehicles/catalogue";
import type { VehicleCatalogueRecord, VehicleProjectMetadata } from "../vehicles/types";
import {
  createPartFromObject,
  evaluateCompatibility,
  PART_CATEGORIES,
  type PartCategory,
  type ReplacementPart,
} from "../engine/parts";

const CarScene = lazy(() => import("../viewer/CarScene"));

const partNames: Record<string, string> = {
  body: "Body shell",
  hood: "Bonnet",
  roof: "Roof",
  "front-bumper": "Front bumper",
  "rear-bumper": "Rear bumper",
  window: "Windows",
  "door-left": "Left door",
  "door-right": "Right door",
  "wheel-front-left": "Front-left wheel",
  "wheel-front-right": "Front-right wheel",
  "wheel-rear-left": "Rear-left wheel",
  "wheel-rear-right": "Rear-right wheel",
  headlights: "Headlights",
  spoiler: "Rear spoiler",
  exhaust: "Exhaust",
  "": "Full vehicle",
};

const PART_CATEGORY_LABELS: Record<PartCategory, string> = {
  wheel: "Wheel",
  rim: "Rim",
  tyre: "Tyre",
  spoiler: "Spoiler",
  "front-bumper": "Front bumper",
  "rear-bumper": "Rear bumper",
  headlight: "Headlight",
  taillight: "Taillight",
  exhaust: "Exhaust",
  "side-skirt": "Side skirt",
  mirror: "Mirror",
};

const paintPresets = [
  { name: "Deep Teal", color: "#1d5e66", metallic: 0.82, roughness: 0.26, clearCoat: 0.72, finish: "metallic" as Finish },
  { name: "Heat Red", color: "#b93438", metallic: 0.88, roughness: 0.2, clearCoat: 0.7, finish: "gloss" as Finish },
  { name: "Silver", color: "#d0d4d2", metallic: 0.95, roughness: 0.18, clearCoat: 0.82, finish: "metallic" as Finish },
  { name: "Graphite", color: "#2c3546", metallic: 0.7, roughness: 0.26, clearCoat: 0.62, finish: "metallic" as Finish },
  { name: "Bronze", color: "#a37948", metallic: 0.76, roughness: 0.35, clearCoat: 0.5, finish: "metallic" as Finish },
  { name: "Pearl", color: "#e0e5e8", metallic: 0.84, roughness: 0.16, clearCoat: 0.9, finish: "gloss" as Finish },
] as const;

const PROCEDURAL_BOUNDS: Record<string, { width: number; height: number; depth: number }> = {
  body: { width: 1.8, height: 0.62, depth: 3.8 },
  hood: { width: 1.72, height: 0.18, depth: 1.24 },
  roof: { width: 1.35, height: 0.56, depth: 1.68 },
  "front-bumper": { width: 1.9, height: 0.28, depth: 0.28 },
  "rear-bumper": { width: 1.9, height: 0.28, depth: 0.3 },
  window: { width: 1.23, height: 0.42, depth: 1.56 },
  "door-left": { width: 0.08, height: 0.47, depth: 1.48 },
  "door-right": { width: 0.08, height: 0.47, depth: 1.48 },
  "wheel-front-left": { width: 0.23, height: 0.88, depth: 0.88 },
  "wheel-front-right": { width: 0.23, height: 0.88, depth: 0.88 },
  "wheel-rear-left": { width: 0.23, height: 0.88, depth: 0.88 },
  "wheel-rear-right": { width: 0.23, height: 0.88, depth: 0.88 },
  headlights: { width: 1.24, height: 0.1, depth: 0.08 },
  spoiler: { width: 1.68, height: 0.29, depth: 0.34 },
  exhaust: { width: 0.16, height: 0.16, depth: 0.18 },
};

function readCatalogueIdList(key: string): string[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export default function StudioApp() {
  const tracker = useHandTracker();
  const modelInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const partInputRef = useRef<HTMLInputElement>(null);
  const modelImportTargetRef = useRef<VehicleCatalogueRecord | null>(null);
  const catalogueRequestIdRef = useRef<string | null>(null);
  const vehicleLibrary = useStudioStore((state) => state.vehicleLibrary);
  const previousLibraryRef = useRef(vehicleLibrary);
  const selectedPart = useStudioStore((state) => state.selectedPart);
  const gesture = useStudioStore((state) => state.gesture);
  const handConfidence = useStudioStore((state) => state.handConfidence);
  const interactionPaused = useStudioStore((state) => state.interactionPaused);
  const customization = useStudioStore((state) => state.customization);
  const explode = useStudioStore((state) => state.explode);
  const zoom = useStudioStore((state) => state.zoom);
  const statusMessage = useStudioStore((state) => state.statusMessage);
  const vehicleRoot = useStudioStore((state) => state.vehicleRoot);
  const vehicleComponents = useStudioStore((state) => state.vehicleComponents);
  const activeVehicleId = useStudioStore((state) => state.activeVehicleId);
  const vehicleName = useStudioStore((state) => state.vehicleName);
  const modelAsset = useStudioStore((state) => state.modelAsset);
  const mergedMeshCount = useStudioStore((state) => state.mergedMeshCount);
  const catalogueVehicleId = useStudioStore((state) => state.catalogueVehicleId);
  const assetSource = useStudioStore((state) => state.assetSource);
  const assetVerification = useStudioStore((state) => state.assetVerification);
  const modelAudit = useStudioStore((state) => state.modelAudit);
  const componentMaterials = useStudioStore((state) => state.componentMaterials);
  const componentRotations = useStudioStore((state) => state.componentRotations);
  const componentVisibility = useStudioStore((state) => state.componentVisibility);
  const isolatedComponentId = useStudioStore((state) => state.isolatedComponentId);
  const showWireframe = useStudioStore((state) => state.showWireframe);
  const showMeasurements = useStudioStore((state) => state.showMeasurements);
  const replacementParts = useStudioStore((state) => state.replacementParts);
  const previewPartId = useStudioStore((state) => state.previewPartId);
  const gestureSettings = useStudioStore((state) => state.gestureSettings);
  const trackingLost = useStudioStore((state) => state.trackingLost);
  const aiPreview = useStudioStore((state) => state.aiPreview);
  const setCustomization = useStudioStore((state) => state.setCustomization);
  const setAIPreview = useStudioStore((state) => state.setAIPreview);
  const applyDesignChange = useStudioStore((state) => state.applyDesignChange);
  const setExplode = useStudioStore((state) => state.setExplode);
  const setZoom = useStudioStore((state) => state.setZoom);
  const setSelectedPart = useStudioStore((state) => state.setSelectedPart);
  const setPaused = useStudioStore((state) => state.setPaused);
  const undo = useStudioStore((state) => state.undo);
  const redo = useStudioStore((state) => state.redo);
  const loadVehicle = useStudioStore((state) => state.loadVehicle);
  const selectVehicle = useStudioStore((state) => state.selectVehicle);
  const restoreProceduralVehicle = useStudioStore((state) => state.restoreProceduralVehicle);
  const restoreDesign = useStudioStore((state) => state.restoreDesign);
  const setComponentMaterial = useStudioStore((state) => state.setComponentMaterial);
  const rotateSelectedComponent = useStudioStore((state) => state.rotateSelectedComponent);
  const resetSelectedComponentTransform = useStudioStore((state) => state.resetSelectedComponentTransform);
  const toggleComponentVisible = useStudioStore((state) => state.toggleComponentVisible);
  const isolateComponent = useStudioStore((state) => state.isolateComponent);
  const setShowWireframe = useStudioStore((state) => state.setShowWireframe);
  const setShowMeasurements = useStudioStore((state) => state.setShowMeasurements);
  const cameraView = useStudioStore((state) => state.cameraView);
  const requestCameraView = useStudioStore((state) => state.requestCameraView);
  const presentationMode = useStudioStore((state) => state.presentationMode);
  const setPresentationMode = useStudioStore((state) => state.setPresentationMode);
  const autoRotate = useStudioStore((state) => state.autoRotate);
  const setAutoRotate = useStudioStore((state) => state.setAutoRotate);
  const addReplacementPart = useStudioStore((state) => state.addReplacementPart);
  const updateReplacementPart = useStudioStore((state) => state.updateReplacementPart);
  const updateReplacementPartTransform = useStudioStore((state) => state.updateReplacementPartTransform);
  const previewReplacementPart = useStudioStore((state) => state.previewReplacementPart);
  const installReplacementPart = useStudioStore((state) => state.installReplacementPart);
  const uninstallReplacementPart = useStudioStore((state) => state.uninstallReplacementPart);
  const removeReplacementPart = useStudioStore((state) => state.removeReplacementPart);
  const setGestureSettings = useStudioStore((state) => state.setGestureSettings);
  const resetGestureSettings = useStudioStore((state) => state.resetGestureSettings);
  const reset = useStudioStore((state) => state.reset);
  const [activeTab, setActiveTab] = useState<"library" | "components" | "replacement">("library");
  const [activeStudioCategory, setActiveStudioCategory] = useState<"exterior" | "wheels" | "interior" | "accessories">("exterior");
  const [componentFilter, setComponentFilter] = useState<"all" | "interior">("all");
  const [componentSearch, setComponentSearch] = useState("");
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [catalogueManufacturer, setCatalogueManufacturer] = useState("");
  const [catalogueGeneration, setCatalogueGeneration] = useState("");
  const [catalogueYear, setCatalogueYear] = useState("");
  const [catalogueVariant, setCatalogueVariant] = useState("");
  const [catalogueBodyStyle, setCatalogueBodyStyle] = useState("");
  const [catalogueFilter, setCatalogueFilter] = useState<"all" | "available" | "favorites" | "recent">("all");
  const [catalogueFavorites, setCatalogueFavorites] = useState<string[]>(() =>
    readCatalogueIdList("gesture-drive-3d.catalogue-favorites.v1"),
  );
  const [recentCatalogueIds, setRecentCatalogueIds] = useState<string[]>(() =>
    readCatalogueIdList("gesture-drive-3d.catalogue-recent.v1"),
  );
  const [selectedCatalogueId, setSelectedCatalogueId] = useState("");
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const rightSidebarContentRef = useRef<HTMLDivElement>(null);
  const [importing, setImporting] = useState(false);
  const [modelProgress, setModelProgress] = useState<ModelProgress | null>(null);
  const [modelError, setModelError] = useState("");
  const [partImporting, setPartImporting] = useState(false);
  const [partError, setPartError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [catalogueCacheStatus, setCatalogueCacheStatus] = useState<{
    cached: boolean;
    invalid: boolean;
    bytes: number;
  } | null>(null);
  const [catalogueCacheError, setCatalogueCacheError] = useState("");
  const [cataloguePreferenceError, setCataloguePreferenceError] = useState("");
  const [cacheRefresh, setCacheRefresh] = useState(0);
  const selectedCatalogueVehicle = VEHICLE_CATALOGUE.find((vehicle) => vehicle.id === selectedCatalogueId) ?? null;
  const activeCatalogueRecord = catalogueVehicleId ? getVehicleCatalogueRecord(catalogueVehicleId) : undefined;
  const catalogueOptions = useMemo(() => ({
    generations: [...new Set(VEHICLE_CATALOGUE.flatMap((vehicle) => vehicle.generation ? [vehicle.generation] : []))].sort(),
    years: [...new Set(VEHICLE_CATALOGUE.flatMap((vehicle) => vehicle.year ? [vehicle.year] : []))].sort((a, b) => a - b),
    variants: [...new Set(VEHICLE_CATALOGUE.flatMap((vehicle) => vehicle.variant ? [vehicle.variant] : []))].sort(),
    bodyStyles: [...new Set(VEHICLE_CATALOGUE.flatMap((vehicle) => vehicle.bodyStyle ? [vehicle.bodyStyle] : []))].sort(),
  }), []);
  const filteredCatalogueVehicles = useMemo(() => {
    const query = catalogueSearch.trim().toLowerCase();
    const filtered = VEHICLE_CATALOGUE.filter((vehicle) => {
      const searchable = [
        vehicle.manufacturer,
        vehicle.model,
        vehicle.generation,
        vehicle.year,
        vehicle.variant,
        vehicle.bodyStyle,
        vehicle.displayName,
      ].filter((value) => value !== null).join(" ").toLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (!catalogueManufacturer || vehicle.manufacturer === catalogueManufacturer) &&
        (!catalogueGeneration || vehicle.generation === catalogueGeneration) &&
        (!catalogueYear || String(vehicle.year) === catalogueYear) &&
        (!catalogueVariant || vehicle.variant === catalogueVariant) &&
        (!catalogueBodyStyle || vehicle.bodyStyle === catalogueBodyStyle) &&
        (catalogueFilter !== "available" || vehicle.asset.status === "available") &&
        (catalogueFilter !== "favorites" || catalogueFavorites.includes(vehicle.id)) &&
        (catalogueFilter !== "recent" || recentCatalogueIds.includes(vehicle.id))
      );
    });
    if (catalogueFilter === "recent") {
      return [...filtered].sort((left, right) =>
        recentCatalogueIds.indexOf(left.id) - recentCatalogueIds.indexOf(right.id),
      );
    }
    return filtered;
  }, [
    catalogueSearch,
    catalogueManufacturer,
    catalogueGeneration,
    catalogueYear,
    catalogueVariant,
    catalogueBodyStyle,
    catalogueFilter,
    catalogueFavorites,
    recentCatalogueIds,
  ]);
  useEffect(() => {
    try {
      window.localStorage.setItem("gesture-drive-3d.catalogue-favorites.v1", JSON.stringify(catalogueFavorites));
      window.localStorage.setItem("gesture-drive-3d.catalogue-recent.v1", JSON.stringify(recentCatalogueIds));
      setCataloguePreferenceError("");
    } catch {
      setCataloguePreferenceError("Catalogue favorites and recent selections could not be saved on this device.");
    }
  }, [catalogueFavorites, recentCatalogueIds]);
  useEffect(() => {
    const bridge = window.gestureDrive;
    if (!selectedCatalogueVehicle || !bridge) {
      setCatalogueCacheStatus(null);
      setCatalogueCacheError("");
      return;
    }
    let active = true;
    setCatalogueCacheStatus(null);
    setCatalogueCacheError("");
    void bridge.getVehicleAssetCacheStatus(selectedCatalogueVehicle.id).then((status) => {
      if (active) setCatalogueCacheStatus(status);
    }).catch((error: unknown) => {
      if (active) {
        setCatalogueCacheError(error instanceof Error ? error.message : "Vehicle cache status is unavailable.");
      }
    });
    return () => {
      active = false;
    };
  }, [selectedCatalogueVehicle?.id, selectedCatalogueVehicle?.asset.status, cacheRefresh]);
  const selectedComponent = vehicleComponents.find((component) => component.id === selectedPart);
  const previewPart = replacementParts.find((part) => part.id === previewPartId);
  const selectedReplacementPart = previewPart ?? replacementParts[replacementParts.length - 1];
  const replacementTargetOptions: Array<[string, string]> = vehicleRoot
    ? vehicleComponents
        .filter((component) => component.inspectable)
        .map((component) => [component.id, component.name] as [string, string])
    : Object.entries(partNames).filter(([id]) => id !== "");
  const selectedOverride = selectedPart ? componentMaterials[selectedPart] : undefined;
  const hudMaterialColor = selectedOverride?.color ?? (
    vehicleRoot && selectedPart
      ? undefined
      : selectedPart.startsWith("wheel-")
        ? customization.wheelColor
        : selectedPart === "headlights"
          ? "#d9f6ff"
          : customization.paint
  );
  const hudMaterialFinish = selectedOverride?.finish ?? (
    vehicleRoot && selectedPart
      ? undefined
      : selectedPart.startsWith("wheel-")
        ? "metallic"
        : customization.finish
  );
  const hudBounds = selectedComponent
    ? {
        width: selectedComponent.bounds.max.x - selectedComponent.bounds.min.x,
        height: selectedComponent.bounds.max.y - selectedComponent.bounds.min.y,
        depth: selectedComponent.bounds.max.z - selectedComponent.bounds.min.z,
      }
    : !vehicleRoot && selectedPart
      ? PROCEDURAL_BOUNDS[selectedPart]
      : undefined;
  const componentEntries = useMemo(
    () =>
      vehicleRoot
        ? vehicleComponents
            .filter((component) => component.inspectable)
            .map((component) => [component.id, component.name] as [string, string])
        : Object.entries(partNames).filter(([id]) => id !== ""),
    [vehicleRoot, vehicleComponents],
  );
  const interiorComponentIds = useMemo(
    () =>
      new Set(
        vehicleComponents
          .filter((component) => ["seat", "dashboard", "steering-wheel"].includes(component.category))
          .map((component) => component.id),
      ),
    [vehicleComponents],
  );
  const visibleComponentEntries =
    componentFilter === "interior"
      ? componentEntries.filter(([id]) => interiorComponentIds.has(id))
      : componentEntries;
  const searchedComponentEntries = useMemo(() => {
    const query = componentSearch.trim().toLowerCase();
    if (!query) return visibleComponentEntries;
    return visibleComponentEntries.filter(
      ([id, name]) => name.toLowerCase().includes(query) || id.toLowerCase().includes(query),
    );
  }, [componentSearch, visibleComponentEntries]);
  const selectedRotation: [number, number, number] = selectedPart
    ? componentRotations[selectedPart] ?? [0, 0, 0]
    : [0, 0, 0];
  const availableProposalComponents = vehicleRoot
    ? vehicleComponents
        .filter((component) => component.inspectable && component.editable)
        .map(({ id, name, category }) => ({ id, name, category }))
    : PROCEDURAL_COMPONENTS;
  const detectedHands = tracker.landmarks.length;
  const calibrationLabel =
    Math.abs(gestureSettings.calibrationHandScale - DEFAULT_GESTURE_SETTINGS.calibrationHandScale) > 0.001
      ? "CUSTOM SCALE"
      : "DEFAULT SCALE";
  const activeGestureAction = tracker.status !== "ready"
    ? "CAMERA UNAVAILABLE"
    : interactionPaused
      ? "PAUSED BY USER"
      : trackingLost
        ? "TRACKING LOST"
        : detectedHands === 0
          ? "WAITING FOR HAND"
          : gesture === "closed-fist"
            ? "INTERACTION HELD"
            : gesture === "open-palm"
              ? "ORBIT"
              : gesture === "pinch"
                ? "ZOOM"
                : gesture === "pointing"
                  ? "DWELL SELECT"
                  : gesture === "thumbs-up"
                    ? "DESIGN CONFIRMATION"
                    : gesture === "two-hand-spread"
                      ? "EXPLODED VIEW"
                      : gesture === "two-hand-zoom"
                        ? gestureSettings.twoHandZoom ? "TWO-HAND ZOOM" : "TWO-HAND ZOOM DISABLED"
                        : "READY";

  function navigateStudioCategory(category: "exterior" | "wheels" | "interior" | "accessories") {
    setActiveStudioCategory(category);
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    if (category === "interior") {
      setComponentFilter("interior");
      setActiveTab("components");
      sidebarContentRef.current?.scrollTo({ top: 0, behavior });
      rightSidebarContentRef.current?.scrollTo({ top: 0, behavior });
      return;
    }
    if (category === "accessories") {
      setComponentFilter("all");
      setActiveTab("replacement");
      sidebarContentRef.current?.scrollTo({ top: 0, behavior });
      document.getElementById("bumpers-heading")?.scrollIntoView({ behavior, block: "start" });
      return;
    }
    document
      .getElementById(category === "wheels" ? "wheels-heading" : "paint-heading")
      ?.scrollIntoView({ behavior, block: "start" });
  }

  function prepareAIProposal(p: Parameters<typeof createProposalDesignChange>[0]): string | null {
    const result = createProposalDesignChange(p, availableProposalComponents);
    if (!result.change) return result.reason ?? "This proposal cannot be previewed.";
    setAIPreview(result.change);
    return null;
  }

  function applyAIProposal(p: Parameters<typeof createProposalDesignChange>[0]): string | null {
    const result = createProposalDesignChange(p, availableProposalComponents);
    if (!result.change) return result.reason ?? "This proposal can no longer be applied.";
    applyDesignChange(result.change);
    return null;
  }

  const applySelectedMaterial = () => {
    if (!selectedPart) {
      setCustomization({
        paint: customization.paint,
        finish: customization.finish,
        paintMetallic: customization.paintMetallic,
        paintRoughness: customization.paintRoughness,
        clearCoat: customization.clearCoat,
      });
      return;
    }
    setComponentMaterial(selectedPart, {
      color: customization.paint,
      finish: customization.finish,
      metallic: customization.paintMetallic,
      roughness: customization.paintRoughness,
      clearCoat: customization.clearCoat,
    });
  };

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    const activeIds = new Set(vehicleLibrary.map((entry) => entry.id));
    const removed = previousLibraryRef.current.filter((entry) => !activeIds.has(entry.id));
    if (removed.length) {
      void import("../engine/materialController").then(({ disposeVehicle }) => {
        for (const entry of removed) disposeVehicle(entry.root);
      });
    }
    previousLibraryRef.current = vehicleLibrary;
  }, [vehicleLibrary]);

  function registerLoadedVehicle(
    loaded: LoadedVehicle,
    metadata?: VehicleProjectMetadata,
  ) {
    loadVehicle(loaded.root, loaded.components, loaded.asset, loaded.mergedMeshCount, metadata, loaded.audit);
    setActiveTab("components");
    setSaveMessage(
      loaded.mergedMeshCount
        ? `Loaded; ${loaded.mergedMeshCount} mesh(es) could not be separated by name`
        : `Loaded ${metadata?.displayName ?? loaded.asset.name}`,
    );
  }

  function openModelPicker(target: VehicleCatalogueRecord | null = null) {
    modelImportTargetRef.current = target;
    modelInputRef.current?.click();
  }

  function openModelFolderPicker(target: VehicleCatalogueRecord | null = null) {
    modelImportTargetRef.current = target;
    folderInputRef.current?.click();
  }

  async function importModel(files: FileList | File[], target?: VehicleCatalogueRecord | null) {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;
    setImporting(true);
    setModelError("");
    setModelProgress({ loaded: 0, total: 0, percent: 0 });
    try {
      const { loadVehicleFiles } = await import("../engine/modelLoader");
      const mainFile = selectedFiles.find((file) => /\.(glb|gltf)$/i.test(file.name));
      const modelPath = mainFile?.webkitRelativePath || mainFile?.name;
      const loaded = await loadVehicleFiles(selectedFiles, setModelProgress, modelPath, target?.components);
      const metadata: VehicleProjectMetadata | undefined = target
        ? {
            catalogueVehicleId: target.id,
            displayName: target.displayName,
            assetSource: "User-provided local file; not verified against catalogue",
            assetVerification: "unverified",
          }
        : undefined;
      registerLoadedVehicle(loaded, metadata);
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "The model could not be loaded.");
    } finally {
      setImporting(false);
      window.setTimeout(() => setModelProgress(null), 1200);
    }
  }

  async function loadCatalogueModel(vehicle: VehicleCatalogueRecord) {
    const requestId = crypto.randomUUID();
    catalogueRequestIdRef.current = requestId;
    setImporting(true);
    setModelError("");
    setModelProgress({ loaded: 0, total: 0, percent: 0 });
    try {
      const { loadCatalogueVehicle } = await import("../vehicles/loadCatalogueAsset");
      const loaded = await loadCatalogueVehicle(vehicle, setModelProgress, requestId);
      const metadata: VehicleProjectMetadata = {
        catalogueVehicleId: vehicle.id,
        displayName: vehicle.displayName,
        assetSource: vehicle.asset.source?.name ?? "Catalogue asset",
        assetVerification: vehicle.asset.accuracy === "verified" ? "verified" : "unverified",
      };
      registerLoadedVehicle(loaded, metadata);
      setRecentCatalogueIds((current) => [vehicle.id, ...current.filter((id) => id !== vehicle.id)].slice(0, 20));
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "The catalogue model could not be loaded.");
    } finally {
      catalogueRequestIdRef.current = null;
      setImporting(false);
      setCacheRefresh((current) => current + 1);
      window.setTimeout(() => setModelProgress(null), 1200);
    }
  }

  function cancelCatalogueModel() {
    const requestId = catalogueRequestIdRef.current;
    if (requestId && window.gestureDrive) {
      void window.gestureDrive.cancelVehicleAsset(requestId).catch((error: unknown) => {
        setModelError(error instanceof Error ? error.message : "The vehicle retrieval could not be cancelled.");
      });
    }
  }

  async function removeSelectedCatalogueCache(vehicle: VehicleCatalogueRecord) {
    const bridge = window.gestureDrive;
    if (!bridge) return;
    try {
      await bridge.removeVehicleAssetCache(vehicle.id);
      setCacheRefresh((current) => current + 1);
    } catch (error) {
      setCatalogueCacheError(error instanceof Error ? error.message : "The vehicle cache could not be removed.");
    }
  }

  function toggleCatalogueFavorite(vehicleId: string) {
    setCatalogueFavorites((current) =>
      current.includes(vehicleId)
        ? current.filter((id) => id !== vehicleId)
        : [...current, vehicleId],
    );
  }
  function targetInfoFor(part: ReplacementPart): {
    id: string;
    name: string;
    dimensions: { width: number; height: number; depth: number };
  } | null {
    const id = part.replacesComponentId;
    if (!id) return null;
    if (vehicleRoot) {
      const component = vehicleComponents.find((candidate) => candidate.id === id);
      if (!component) return null;
      const size = {
        width: component.bounds.max.x - component.bounds.min.x,
        height: component.bounds.max.y - component.bounds.min.y,
        depth: component.bounds.max.z - component.bounds.min.z,
      };
      return { id, name: component.name, dimensions: size };
    }
    const dimensions = PROCEDURAL_BOUNDS[id];
    return dimensions ? { id, name: partNames[id] ?? id, dimensions } : null;
  }

  function refreshCompatibility(part: ReplacementPart): ReplacementPart {
    const target = targetInfoFor(part);
    if (!target) {
      return {
        ...part,
        compatibility: "unverified",
        compatibilityReason: "Select a target component",
      };
    }
    const result = evaluateCompatibility(part, target.name, target.dimensions);
    return { ...part, compatibility: result.status, compatibilityReason: result.reason };
  }

  function changeReplacementPart(id: string, patch: Partial<ReplacementPart>) {
    updateReplacementPart(id, patch);
    const current = useStudioStore.getState().replacementParts.find((part) => part.id === id);
    if (!current) return;
    const updated = refreshCompatibility(current);
    updateReplacementPart(id, {
      compatibility: updated.compatibility,
      compatibilityReason: updated.compatibilityReason,
    });
  }

  async function importReplacementPart(files: FileList | File[]) {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;
    const mainFile = selectedFiles.find((file) => /\.(glb|gltf)$/i.test(file.name));
    if (!mainFile) {
      setPartError("Select a GLB or glTF replacement part.");
      return;
    }
    setPartImporting(true);
    setPartError("");
    try {
      const { loadPartFiles } = await import("../engine/modelLoader");
      const loaded = await loadPartFiles(
        selectedFiles,
        undefined,
        mainFile.webkitRelativePath || mainFile.name,
      );
      const category: PartCategory =
        selectedComponent?.category === "spoiler"
          ? "spoiler"
          : selectedComponent?.category === "bumper"
            ? "front-bumper"
            : selectedComponent?.category === "wheel"
              ? "wheel"
              : "wheel";
      const part = createPartFromObject(loaded.object, category, loaded.asset.name, loaded.asset);
      part.replacesComponentId = selectedPart || null;
      const refreshed = refreshCompatibility(part);
      addReplacementPart(refreshed);
      setActiveTab("replacement");
      setSaveMessage(`Imported replacement part ${loaded.asset.name}`);
    } catch (error) {
      setPartError(error instanceof Error ? error.message : "The replacement part could not be loaded.");
    } finally {
      setPartImporting(false);
    }
  }

  function calibrateGesture() {
    const calibrated = tracker.calibrate();
    setSaveMessage(calibrated ? "Gesture calibration captured" : "Gesture calibration needs a clear hand pose");
    window.setTimeout(() => setSaveMessage(""), 3200);
  }

  function updateReplacementTransform(
    kind: "position" | "rotation" | "scale",
    axis: 0 | 1 | 2,
    value: number,
  ) {
    if (!selectedReplacementPart) return;
    const transform = {
      ...selectedReplacementPart.transform,
      [kind]: [...selectedReplacementPart.transform[kind]] as [number, number, number],
    };
    transform[kind][axis] = kind === "rotation" ? (value * Math.PI) / 180 : value;
    updateReplacementPartTransform(selectedReplacementPart.id, transform);
  }

  function updateAttachmentOffset(axis: 0 | 1 | 2, value: number) {
    if (!selectedReplacementPart) return;
    const attachment = selectedReplacementPart.attachment ?? {
      position: [0, 0, 0] as [number, number, number],
      normal: [0, 1, 0] as [number, number, number],
    };
    const position = [...attachment.position] as [number, number, number];
    position[axis] = value;
    changeReplacementPart(selectedReplacementPart.id, {
      attachment: { ...attachment, position },
    });
  }

  function setReplacementTarget(id: string) {
    if (!selectedReplacementPart) return;
    changeReplacementPart(selectedReplacementPart.id, {
      replacesComponentId: id || null,
    });
    if (id) setSelectedPart(id);
  }

  async function saveProject() {
    const contents = serializeProject(
      modelAsset,
      customization,
      componentMaterials,
      componentRotations,
      replacementParts,
      gestureSettings,
      {
        ...(catalogueVehicleId ? { catalogueVehicleId } : {}),
        displayName: vehicleName,
        assetSource,
        ...(assetVerification !== "not-available" ? { assetVerification } : {}),
      },
    );
    try {
      if (window.gestureDrive) {
        setSaveMessage((await window.gestureDrive.saveProject(contents)) ? "Project saved" : "Save cancelled");
      } else {
        const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "vehicle-design.gd3d.json";
        anchor.click();
        URL.revokeObjectURL(url);
        setSaveMessage("Project exported");
      }
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not save project");
    }
    window.setTimeout(() => setSaveMessage(""), 3200);
  }

  async function captureScreenshot() {
    const canvas = document.querySelector(".workspace canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setSaveMessage("3D viewport is not available");
      window.setTimeout(() => setSaveMessage(""), 3200);
      return;
    }
    try {
      const dataUrl = canvas.toDataURL("image/png");
      if (window.gestureDrive) {
        setSaveMessage((await window.gestureDrive.saveScreenshot(dataUrl)) ? "Screenshot saved" : "Screenshot cancelled");
      } else {
        const anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = "gesture-drive-showroom.png";
        anchor.click();
        setSaveMessage("Screenshot exported");
      }
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not capture screenshot");
    }
    window.setTimeout(() => setSaveMessage(""), 3200);
  }

  async function loadProject() {
    try {
      const contents = window.gestureDrive
        ? await window.gestureDrive.loadProject()
        : await new Promise<string | null>((resolve) => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json,application/json";
            input.onchange = () => {
              const file = input.files?.[0];
              if (!file) return resolve(null);
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => resolve(null);
              reader.readAsText(file);
            };
            input.click();
          });
      if (contents === null) return;
      const project = parseProject(contents);
      if (project.model.source === "imported") {
        const { loadVehicleFiles, unpackModelAsset } = await import("../engine/modelLoader");
        const files = unpackModelAsset(project.model.asset);
        const catalogueRecord = project.model.catalogueVehicleId
          ? getVehicleCatalogueRecord(project.model.catalogueVehicleId)
          : undefined;
        const loaded = await loadVehicleFiles(
          files,
          setModelProgress,
          project.model.asset.mainFile,
          catalogueRecord?.components,
        );
        registerLoadedVehicle(loaded, project.model);
      } else {
        restoreProceduralVehicle();
      }
      restoreDesign({
        customization: project.customization,
        componentMaterials: project.componentMaterials,
        componentRotations: project.componentRotations,
      });
      if (project.gestureSettings) setGestureSettings(project.gestureSettings);
      if (project.replacementParts.length) {
        const { loadPartFiles, unpackModelAsset } = await import("../engine/modelLoader");
        for (const storedPart of project.replacementParts) {
          try {
            const files = unpackModelAsset(storedPart.asset);
            const loaded = await loadPartFiles(files, undefined, storedPart.asset.mainFile);
            const part = createPartFromObject(
              loaded.object,
              storedPart.category,
              storedPart.assetName,
              storedPart.asset,
            );
            addReplacementPart({
              ...part,
              ...storedPart,
              object: loaded.object,
              asset: storedPart.asset,
            });
          } catch {
            // A missing replacement asset should not prevent the vehicle design from loading.
          }
        }
      }
      setSaveMessage("Project loaded");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not load project");
    }
    window.setTimeout(() => setSaveMessage(""), 3200);
  }

  // ---- ICONS ----
  const Icons = {
    menu: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
    camera: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
    cameraOff: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v13" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
    pause: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </svg>
    ),
    play: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    reset: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    ),
    explode: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 19.5L19 3.5" />
        <path d="M21 12H10" />
        <path d="M21 3H3v18" />
        <path d="M5 3H3v18h18V5" />
      </svg>
    ),
    home: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    plus: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    folder: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </svg>
    ),
    undo: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v6h6" />
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
      </svg>
    ),
    redo: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
      </svg>
    ),
    save: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
    ),
    upload: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    download: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    settings: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    chevronDown: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    chevronRight: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    ),
    visibility: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    visibilityOff: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ),
    wireframe: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
        <line x1="12" y1="22" x2="12" y2="15.5" />
        <polyline points="22 8.5 12 15.5 2 8.5" />
      </svg>
    ),
    ruler: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.321a2 2 0 0 0 .83-.497z" />
        <path d="m15 15 6-6" />
      </svg>
    ),
    cube: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.321a2 2 0 0 0 .83-.497z" />
        <path d="m15 15 6-6" />
      </svg>
    ),
    expand: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 21l-6-6m6-6v-4.8m0 4.8h-4.8" />
        <path d="M3 3 9 9m-6 6V7.2m0 4.8H7.2" />
      </svg>
    ),
    compress: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l6.707 6.707M21 21l-6.707-6.707M3 21l6.707-6.707M21 3l-6.707 6.707" />
      </svg>
    ),
    sparkle: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    eye: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    hand: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
        <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 0 1 2 2v.5" />
        <path d="M22 14v.5" />
        <path d="M6 17a3.5 3.5 0 1 1 7 0" />
        <path d="M10 18v3" />
        <path d="M14 20v.5" />
        <path d="M18 22v-2" />
      </svg>
    ),
    cpu: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 12h16" />
        <path d="M12 4v16" />
        <path d="M8 8h8" />
        <path d="M8 16h8" />
      </svg>
    ),
    palette: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5" />
        <circle cx="18" cy="11" r="2.5" />
        <circle cx="6.5" cy="11" r="2.5" />
        <circle cx="11" cy="17.5" r="2.5" />
        <path d="M21 21l-4.34-4.34a2.17 2.17 0 0 0-3 0L3 21" />
      </svg>
    ),
    cog: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    target: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    rotateCcw: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    ),
    rotateCw: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    ),
    refreshCw: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    ),
    help: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    droplet: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6a6.88 6.88 0 0 0-10 1.5c0 2.3 1.2 4.3 3 6.5s3 5.5 3 8z" />
      </svg>
    ),
    sun: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="M4.93 4.93l1.41 1.41" />
        <path d="M17.66 17.66l1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="M6.34 17.66l-1.41 1.41" />
        <path d="M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
    moon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    ),
    monitor: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    checkbox: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    radio: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
    arrowUpRight: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="17 7 7 7 7 17" />
      </svg>
    ),
    alert: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    x: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  };

  return (
    <main className="app-shell">
      <input
        ref={modelInputRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        hidden
        onChange={(event) => {
          const target = modelImportTargetRef.current;
          modelImportTargetRef.current = null;
          if (event.currentTarget.files) void importModel(event.currentTarget.files, target);
          event.currentTarget.value = "";
        }}
        aria-label="Choose a GLB or glTF vehicle model"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          const target = modelImportTargetRef.current;
          modelImportTargetRef.current = null;
          if (event.currentTarget.files) void importModel(event.currentTarget.files, target);
          event.currentTarget.value = "";
        }}
        aria-label="Choose a model folder and its resources"
      />
      {/* TOPBAR */}
      <header className="topbar" role="banner">
        <div className="brand">
          <div className="brand-mark">GD<span>3D</span></div>
          <div className="brand-text">
            <span className="brand-title">GESTURE DRIVE</span>
            <span className="brand-subtitle">VEHICLE DESIGN STUDIO</span>
          </div>
        </div>
        <div className="model-title">
          <span className={`status-dot ${tracker.status === "ready" ? "active" : "inactive"}`} />
          {vehicleName.toUpperCase()}
          <span className="model-tag">{vehicleRoot ? "IMPORTED MODEL" : "PROCEDURAL DEMO"}</span>
        </div>
        <div className="project-readout" aria-live="polite">
          <span>PROJECT STATUS</span>
          <strong>{saveMessage || statusMessage || "STUDIO READY"}</strong>
        </div>
        <div className="topbar-actions">
          <div className={`camera-status ${tracker.status === "ready" ? "active" : ""}`}>
            {tracker.status === "ready" ? Icons.camera : Icons.cameraOff}
            <span>{tracker.status === "ready" ? "CAMERA ACTIVE" : "CAMERA OFF"}</span>
          </div>
          <button className="btn btn-ghost btn-icon tooltip" data-tooltip="Undo" onClick={undo} aria-label="Undo">
            {Icons.undo}
          </button>
          <button className="btn btn-ghost btn-icon tooltip" data-tooltip="Redo" onClick={redo} aria-label="Redo">
            {Icons.redo}
          </button>
          <button
            className="btn btn-ghost btn-icon tooltip"
            data-tooltip={interactionPaused ? "Resume gesture interaction" : "Pause gesture interaction"}
            onClick={() => setPaused(!interactionPaused)}
            aria-label={interactionPaused ? "Resume gesture interaction" : "Pause gesture interaction"}
          >
            {interactionPaused ? Icons.play : Icons.pause}
          </button>
          <button className="topbar-save tooltip" data-tooltip="Save project" onClick={saveProject} aria-label="Save project">
            {Icons.save}
          </button>
          <button className="btn btn-ghost btn-icon tooltip" data-tooltip="Capture screenshot" onClick={() => void captureScreenshot()} aria-label="Capture screenshot">
            {Icons.camera}
          </button>
        </div>
      </header>

      {/* WORKSPACE GRID */}
      <div className="workspace" data-presentation-mode={presentationMode}>
        {/* LEFT SIDEBAR */}
        <aside className="left-sidebar" role="complementary" aria-label="Vehicle library and components">
          <div className="sidebar-tabs" role="tablist" aria-label="Sidebar sections">
            <button
              role="tab"
              aria-selected={activeTab === "library"}
              className={`sidebar-tab ${activeTab === "library" ? "active" : ""}`}
              onClick={() => setActiveTab("library")}
            >
              <span className="sidebar-tab-icon">{Icons.menu}</span>
              LIBRARY
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "components"}
              className={`sidebar-tab ${activeTab === "components" ? "active" : ""}`}
              onClick={() => { setActiveTab("components"); setComponentFilter("all"); }}
            >
              <span className="sidebar-tab-icon">{Icons.target}</span>
              COMPONENTS
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "replacement"}
              className={`sidebar-tab ${activeTab === "replacement" ? "active" : ""}`}
              onClick={() => setActiveTab("replacement")}
            >
              <span className="sidebar-tab-icon">{Icons.cog}</span>
              PARTS
            </button>
          </div>

          <nav className="studio-category-nav" aria-label="Customization categories">
            {([
              ["exterior", "EXTERIOR", "01"],
              ["wheels", "WHEELS", "02"],
              ["interior", "INTERIOR", "03"],
              ["accessories", "ACCESSORIES", "04"],
            ] as const).map(([category, label, number]) => (
              <button
                key={category}
                className={`studio-category-button ${activeStudioCategory === category ? "active" : ""}`}
                onClick={() => navigateStudioCategory(category)}
                aria-pressed={activeStudioCategory === category}
                aria-label={`Show ${label.toLowerCase()} customization`}
              >
                <span className="studio-category-index">{number}</span>
                <span>{label}</span>
                <span className="studio-category-mark" aria-hidden="true" />
              </button>
            ))}
          </nav>

          <div className="sidebar-content" ref={sidebarContentRef}>
            {activeTab === "library" && (
              <section className="sidebar-section" aria-labelledby="library-heading">
                <div className="section-header">
                  <h2 id="library-heading" className="section-title">YOUR WORKSPACE</h2>
                  <button className="btn btn-ghost btn-icon tooltip" data-tooltip="Save project" onClick={saveProject} aria-label="Save project">
                    {Icons.save}
                  </button>
                </div>

                {/* Procedural Vehicle Card */}
                <button
                  className={`sidebar-item ${!vehicleRoot ? "active" : ""}`}
                  onClick={restoreProceduralVehicle}
                  aria-pressed={!vehicleRoot}
                >
                  <div className="sidebar-item-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.3-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                      <circle cx="7" cy="17" r="2" />
                      <circle cx="17" cy="17" r="2" />
                    </svg>
                  </div>
                  <div className="sidebar-item-content">
                    <span className="sidebar-item-title">Sport Coupe</span>
                    <span className="sidebar-item-subtitle">Procedural · Fully Editable</span>
                  </div>
                  <span className="sidebar-item-indicator" />
                </button>

                {/* Imported Vehicles */}
                {vehicleLibrary.map((entry: VehicleEntry) => (
                  <button
                    key={entry.id}
                    className={`sidebar-item ${activeVehicleId === entry.id ? "active" : ""}`}
                    onClick={() => selectVehicle(entry.id)}
                    aria-pressed={activeVehicleId === entry.id}
                  >
                    <div className="sidebar-item-icon" aria-hidden="true">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.3-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                        <circle cx="7" cy="17" r="2" />
                        <circle cx="17" cy="17" r="2" />
                      </svg>
                    </div>
                    <div className="sidebar-item-content">
                      <span className="sidebar-item-title">{entry.name}</span>
                      <span className="sidebar-item-subtitle">GLB/glTF · {entry.components.length} components</span>
                    </div>
                    <span className="sidebar-item-indicator" />
                  </button>
                ))}

                <div className="panel" style={{ marginTop: "var(--space-4)", padding: "var(--space-3)" }}>
                  <div className="section-header">
                    <h3 className="section-title">VEHICLE DATABASE</h3>
                    <span className="section-count">{filteredCatalogueVehicles.length}/{VEHICLE_CATALOGUE.length}</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: "0 0 var(--space-3)" }}>
                    Catalogue metadata is separate from 3D assets. No licensed vehicle models are bundled.
                  </p>
                  <input
                    type="search"
                    value={catalogueSearch}
                    onChange={(event) => setCatalogueSearch(event.target.value)}
                    placeholder="Search manufacturer, model, year..."
                    aria-label="Search vehicle catalogue"
                    style={{ width: "100%", marginBottom: "var(--space-2)" }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                    <select
                      aria-label="Filter by manufacturer"
                      value={catalogueManufacturer}
                      onChange={(event) => setCatalogueManufacturer(event.target.value)}
                    >
                      <option value="">All manufacturers</option>
                      {VEHICLE_MANUFACTURERS.map((manufacturer) => (
                        <option value={manufacturer} key={manufacturer}>{manufacturer}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by generation"
                      value={catalogueGeneration}
                      onChange={(event) => setCatalogueGeneration(event.target.value)}
                      disabled={!catalogueOptions.generations.length}
                    >
                      <option value="">All generations</option>
                      {catalogueOptions.generations.map((generation) => (
                        <option value={generation} key={generation}>{generation}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by model year"
                      value={catalogueYear}
                      onChange={(event) => setCatalogueYear(event.target.value)}
                      disabled={!catalogueOptions.years.length}
                    >
                      <option value="">All years</option>
                      {catalogueOptions.years.map((year) => (
                        <option value={year} key={year}>{year}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by variant"
                      value={catalogueVariant}
                      onChange={(event) => setCatalogueVariant(event.target.value)}
                      disabled={!catalogueOptions.variants.length}
                    >
                      <option value="">All variants</option>
                      {catalogueOptions.variants.map((variant) => (
                        <option value={variant} key={variant}>{variant}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by body style"
                      value={catalogueBodyStyle}
                      onChange={(event) => setCatalogueBodyStyle(event.target.value)}
                      disabled={!catalogueOptions.bodyStyles.length}
                    >
                      <option value="">All body styles</option>
                      {catalogueOptions.bodyStyles.map((bodyStyle) => (
                        <option value={bodyStyle} key={bodyStyle}>{bodyStyle}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter catalogue availability"
                      value={catalogueFilter}
                      onChange={(event) => setCatalogueFilter(event.target.value as typeof catalogueFilter)}
                    >
                      <option value="all">All vehicles</option>
                      <option value="available">Available assets</option>
                      <option value="favorites">Favorites</option>
                      <option value="recent">Recent selections</option>
                    </select>
                  </div>
                  <div className="sidebar-list" style={{ marginTop: "var(--space-3)", maxHeight: 300, overflowY: "auto" }}>
                    {filteredCatalogueVehicles.map((vehicle) => {
                      const vehicleLabel = [
                        vehicle.generation,
                        vehicle.year,
                        vehicle.variant,
                      ].filter((value) => value !== null).join(" · ");
                      const isAvailable = vehicle.asset.status === "available";
                      return (
                        <button
                          key={vehicle.id}
                          className={`vehicle-card ${selectedCatalogueId === vehicle.id ? "selected" : ""} ${!isAvailable ? "unavailable" : ""}`}
                          onClick={() => {
                            setSelectedCatalogueId(vehicle.id);
                            setRecentCatalogueIds((current) =>
                              [vehicle.id, ...current.filter((id) => id !== vehicle.id)].slice(0, 20),
                            );
                          }}
                          aria-pressed={selectedCatalogueId === vehicle.id}
                        >
                          <div className="vehicle-card-header">
                            <div>
                              <h4 className="vehicle-card-title">{vehicle.displayName}</h4>
                              {vehicleLabel && <p className="vehicle-card-subtitle">{vehicleLabel}</p>}
                            </div>
                            <span className={`vehicle-card-status ${isAvailable ? "available" : "unavailable"}`}>
                              {isAvailable
                                ? `${vehicle.asset.accuracy.toUpperCase()}`
                                : vehicle.asset.status === "license-review-required"
                                  ? "LICENSE REVIEW"
                                  : "UNAVAILABLE"}
                            </span>
                          </div>
                          <div className="vehicle-card-details">
                            <span className="vehicle-card-detail">
                              <span className="vehicle-card-detail-label">Body:</span>
                              <span className="vehicle-card-detail-value">{vehicle.bodyStyle || "Not specified"}</span>
                            </span>
                          </div>
                          {!isAvailable && (
                            <div style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                              {vehicle.asset.status === "license-review-required"
                                ? "License review required before asset can be used"
                                : "3D model not available — user must provide asset"}
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {!filteredCatalogueVehicles.length && (
                      <p className="text-muted" style={{ padding: "var(--space-2)", fontSize: "var(--text-xs)" }}>
                        No catalogue entries match these filters.
                      </p>
                    )}
                  </div>
                  {selectedCatalogueVehicle && (
                    <div style={{ marginTop: "var(--space-3)" }}>
                      <button
                        className="btn btn-outline"
                        style={{ width: "100%", marginBottom: "var(--space-2)" }}
                        onClick={() => toggleCatalogueFavorite(selectedCatalogueVehicle.id)}
                      >
                        {catalogueFavorites.includes(selectedCatalogueVehicle.id)
                          ? "Remove from favorites"
                          : "Add to favorites"}
                      </button>
                      {cataloguePreferenceError && (
                        <p role="status" className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                          {cataloguePreferenceError}
                        </p>
                      )}
                      {selectedCatalogueVehicle.specifications && (
                        <dl style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)" }}>
                          {Object.entries(selectedCatalogueVehicle.specifications).map(([name, value]) => (
                            <div key={name} style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-2)" }}>
                              <dt className="text-muted">{name}</dt>
                              <dd style={{ margin: 0 }}>{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {(selectedCatalogueVehicle.asset.source || selectedCatalogueVehicle.asset.license) && (
                        <div className="text-muted" style={{ marginBottom: "var(--space-3)", fontSize: "var(--text-xs)" }}>
                          {selectedCatalogueVehicle.asset.source && (
                            <p style={{ margin: "0 0 var(--space-1)" }}>
                              Source: {selectedCatalogueVehicle.asset.source.name}
                              {selectedCatalogueVehicle.asset.source.attribution && ` · ${selectedCatalogueVehicle.asset.source.attribution}`}
                            </p>
                          )}
                          {selectedCatalogueVehicle.asset.license && (
                            <p style={{ margin: 0 }}>
                              License: {selectedCatalogueVehicle.asset.license.name}
                              {selectedCatalogueVehicle.asset.license.attribution && ` · ${selectedCatalogueVehicle.asset.license.attribution}`}
                            </p>
                          )}
                        </div>
                      )}
                      {selectedCatalogueVehicle.asset.status === "available" && (
                        <button
                          className="btn btn-outline"
                          style={{ width: "100%", marginBottom: "var(--space-2)" }}
                          disabled={importing}
                          onClick={() => void loadCatalogueModel(selectedCatalogueVehicle)}
                        >
                          {importing ? <span className="spinner" /> : "Load catalogue 3D asset"}
                        </button>
                      )}
                      {importing && catalogueRequestIdRef.current && window.gestureDrive && (
                        <button
                          className="btn btn-outline"
                          style={{ width: "100%", marginBottom: "var(--space-2)" }}
                          onClick={cancelCatalogueModel}
                        >
                          Cancel asset retrieval
                        </button>
                      )}
                      {window.gestureDrive ? (
                        <>
                          {catalogueCacheStatus && (
                            <p className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                              {catalogueCacheStatus.cached
                                ? `Verified offline cache · ${(catalogueCacheStatus.bytes / (1024 * 1024)).toFixed(1)} MB`
                                : catalogueCacheStatus.invalid
                                  ? "A damaged vehicle cache will be replaced on retry."
                                  : "No offline cache"}
                            </p>
                          )}
                          {catalogueCacheError && (
                            <p role="alert" className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                              {catalogueCacheError}
                            </p>
                          )}
                          {catalogueCacheStatus && (catalogueCacheStatus.cached || catalogueCacheStatus.invalid) && (
                            <button
                              className="btn btn-outline"
                              style={{ width: "100%", marginBottom: "var(--space-2)" }}
                              disabled={importing}
                              onClick={() => void removeSelectedCatalogueCache(selectedCatalogueVehicle)}
                            >
                              Remove offline cache
                            </button>
                          )}
                        </>
                      ) : null}
                      <button
                        className="btn btn-outline"
                        style={{ width: "100%" }}
                        disabled={importing}
                        onClick={() => openModelPicker(selectedCatalogueVehicle)}
                      >
                        {importing ? <span className="spinner" /> : `Import local model for ${selectedCatalogueVehicle.model}`}
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ width: "100%", marginTop: "var(--space-2)" }}
                        disabled={importing}
                        onClick={() => openModelFolderPicker(selectedCatalogueVehicle)}
                      >
                        Import model folder & resources
                      </button>
                      <p className="text-muted" style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)" }}>
                        Local imports are user-provided and remain unverified. They do not inherit OEM specifications.
                      </p>
                    </div>
                  )}
                </div>

                <div className="sidebar-actions">
                  <button
                    className="btn btn-outline"
                    disabled={importing}
                    onClick={() => openModelPicker()}
                    aria-label="Import GLB/glTF model"
                  >
                    {importing ? <span className="spinner" /> : <> {Icons.upload} Import GLB / glTF</>}
                  </button>
                  <button
                    className="btn btn-outline"
                    disabled={importing}
                    onClick={() => openModelFolderPicker()}
                    aria-label="Import model folder with resources"
                  >
                    {Icons.folder} Import model folder & resources
                  </button>
                  {vehicleRoot && (
                    <button className="btn btn-ghost" onClick={restoreProceduralVehicle}>
                      {Icons.home} Use procedural fallback
                    </button>
                  )}
                  <button className="btn btn-outline" onClick={loadProject}>
                    {Icons.download} Open saved design
                  </button>
                </div>

                {importing && modelProgress && (
                  <div className="panel" style={{ marginTop: "var(--space-4)", padding: "var(--space-3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-2)", fontSize: "var(--text-xs)" }}>
                      <span>Loading model resources</span>
                      <b>{modelProgress.percent}%</b>
                    </div>
                    <progress max="100" value={modelProgress.percent} className="slider-track" />
                  </div>
                )}
                {modelError && (
                  <div className="panel" style={{ marginTop: "var(--space-4)", padding: "var(--space-3)", borderColor: "var(--error)", background: "var(--error-bg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
                    <span style={{ color: "var(--error)", fontSize: "var(--text-xs)" }}>{modelError}</span>
                    <button className="btn btn-ghost btn-icon" onClick={() => setModelError("")} aria-label="Dismiss error" title="Dismiss">
                      {Icons.x}
                    </button>
                  </div>
                )}
                {modelAsset && modelAudit && (
                  <details className="panel" style={{ marginTop: "var(--space-3)", padding: "var(--space-3)" }}>
                    <summary style={{ cursor: "pointer", fontSize: "var(--text-xs)" }}>MODEL AUDIT · {assetVerification.toUpperCase()}</summary>
                    <p className="text-muted" style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-2)" }}>
                      {assetSource}
                    </p>
                    {assetVerification === "verified" && activeCatalogueRecord?.asset.source && (
                      <p className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                        Source: {activeCatalogueRecord.asset.source.name}
                        {activeCatalogueRecord.asset.source.attribution && ` · ${activeCatalogueRecord.asset.source.attribution}`}
                        {activeCatalogueRecord.asset.license && ` · License: ${activeCatalogueRecord.asset.license.name}`}
                      </p>
                    )}
                    <div className="text-muted" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-1)", fontSize: "var(--text-xs)" }}>
                      <span>Meshes</span><strong>{modelAudit.meshCount}</strong>
                      <span>Materials</span><strong>{modelAudit.materialCount}</strong>
                      <span>Textures</span><strong>{modelAudit.textureCount}</strong>
                      <span>Components</span><strong>{vehicleComponents.length}</strong>
                      <span>Bounds W × H × D</span>
                      <strong>{modelAudit.bounds.width.toFixed(2)} × {modelAudit.bounds.height.toFixed(2)} × {modelAudit.bounds.depth.toFixed(2)}</strong>
                      <span>Normalization scale</span><strong>{modelAudit.normalizationScale.toPrecision(3)}</strong>
                      <span>Orientation</span><strong>{modelAudit.orientation.toUpperCase()}</strong>
                    </div>
                    {modelAudit.warnings.length > 0 && (
                      <ul className="text-muted" style={{ paddingLeft: "var(--space-4)", fontSize: "var(--text-xs)" }}>
                        {modelAudit.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                      </ul>
                    )}
                  </details>
                )}

                <div className="section-header" style={{ marginTop: "var(--space-6)" }}>
                  <h3 className="section-title">CATEGORIES</h3>
                </div>
                {["All vehicles", "Performance", "Luxury", "Concept"].map((item, index) => (
                  <button
                    key={item}
                    className={`sidebar-item ${index === 0 ? "active" : ""}`}
                    style={{ padding: "var(--space-2) var(--space-3)" }}
                  >
                    <span className="sidebar-item-icon" style={{ width: 28, height: 28 }}>{["◈", "⌁", "◇", "✧"][index]}</span>
                    <div className="sidebar-item-content">
                      <span className="sidebar-item-title">{item}</span>
                    </div>
                    <span className="sidebar-item-subtitle" style={{ fontSize: 10 }}>{index === 0 ? "01" : "—"}</span>
                  </button>
                ))}
              </section>
            )}

            {activeTab === "components" && (
              <section className="sidebar-section" aria-labelledby="components-heading">
                <div className="section-header">
                  <h2 id="components-heading" className="section-title">
                    {componentFilter === "interior"
                      ? "INTERIOR COMPONENTS"
                      : vehicleRoot
                        ? "DETECTED COMPONENTS"
                        : "PROCEDURAL COMPONENTS"}
                  </h2>
                  <span className="section-count">{searchedComponentEntries.length}</span>
                </div>

                <input
                  type="search"
                  value={componentSearch}
                  onChange={(event) => setComponentSearch(event.target.value)}
                  placeholder="Search components..."
                  aria-label="Search components"
                  style={{ width: "100%", marginBottom: "var(--space-2)" }}
                />

                <div className="sidebar-list">
                  {searchedComponentEntries.map(([id, name]) => {
                    const component = vehicleComponents.find((candidate) => candidate.id === id);
                    return (
                      <div
                        key={id}
                        className={`sidebar-item ${selectedPart === id ? "active" : ""}`}
                        onClick={() => setSelectedPart(id)}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedPart(id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selectedPart === id}
                      >
                        <div className="sidebar-item-icon" aria-hidden="true">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                          </svg>
                        </div>
                        <div className="sidebar-item-content">
                          <span className="sidebar-item-title">{name}</span>
                          {component && (
                            <span className="sidebar-item-subtitle">
                              {component.category} · {component.meshCount} mesh{component.meshCount === 1 ? "" : "es"}
                              {component.source === "mapping" ? " · mapped" : component.source === "fallback" ? " · merged" : ""}
                            </span>
                          )}
                        </div>
                        <button
                          className="sidebar-item-visibility tooltip"
                          data-tooltip={componentVisibility[id] === false ? "Show component" : "Hide component"}
                          onClick={(e) => { e.stopPropagation(); toggleComponentVisible(id); }}
                          aria-label={componentVisibility[id] === false ? "Show component" : "Hide component"}
                          aria-pressed={componentVisibility[id] === false}
                        >
                          {componentVisibility[id] === false ? Icons.visibilityOff : Icons.visibility}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {componentFilter === "interior" && searchedComponentEntries.length === 0 && (
                  <div className="component-empty-state" role="status">
                    <strong>No editable interior components detected.</strong>
                    <span>
                      {vehicleRoot
                        ? "This model has no named seat, dashboard, or steering-wheel meshes."
                        : "The procedural coupe has no interior geometry. Import a model with named interior meshes to inspect them."}
                    </span>
                  </div>
                )}

                {vehicleRoot && (
                  <button
                    className="sidebar-item"
                    onClick={() => setSelectedPart("")}
                    style={{ marginTop: "var(--space-2)" }}
                  >
                    <div className="sidebar-item-icon" aria-hidden="true">{Icons.home}</div>
                    <div className="sidebar-item-content">
                      <span className="sidebar-item-title">Return to full vehicle</span>
                    </div>
                  </button>
                )}

                {selectedComponent && (
                  <div className="panel component-detail-panel" style={{ marginTop: "var(--space-3)", padding: "var(--space-3)" }}>
                    <div className="section-header" style={{ marginBottom: "var(--space-2)" }}>
                      <h3 className="section-title" style={{ fontSize: "var(--text-xs)" }}>COMPONENT DETAIL</h3>
                      <span className="section-count">{selectedComponent.category}</span>
                    </div>
                    <dl className="component-detail-grid">
                      <dt>Meshes</dt><dd>{selectedComponent.meshCount}</dd>
                      <dt>Material slots</dt><dd>{selectedComponent.originalMaterialNames.length}</dd>
                      <dt>Width</dt><dd>{(selectedComponent.bounds.max.x - selectedComponent.bounds.min.x).toFixed(2)}</dd>
                      <dt>Height</dt><dd>{(selectedComponent.bounds.max.y - selectedComponent.bounds.min.y).toFixed(2)}</dd>
                      <dt>Depth</dt><dd>{(selectedComponent.bounds.max.z - selectedComponent.bounds.min.z).toFixed(2)}</dd>
                      <dt>Material edit</dt><dd>{selectedComponent.editable ? "Yes" : "No"}</dd>
                      <dt>Transform</dt><dd>{selectedComponent.transformable ? "Yes" : "No"}</dd>
                      <dt>Source</dt><dd>{selectedComponent.source}</dd>
                    </dl>
                    {selectedComponent.originalMaterialNames.length > 0 && (
                      <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: "var(--space-2) 0 0" }}>
                        Materials: {selectedComponent.originalMaterialNames.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                <div className="sidebar-actions" style={{ marginTop: "var(--space-4)" }}>
                  <div className="action-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    <button
                      className={`action-btn ${isolatedComponentId ? "active" : ""}`}
                      onClick={() => isolateComponent(isolatedComponentId ? null : selectedPart || null)}
                    >
                      {isolatedComponentId ? Icons.compress : Icons.expand}
                      {isolatedComponentId ? "SHOW ALL" : "ISOLATE"}
                    </button>
                    <button
                      className={`action-btn ${selectedPart && componentVisibility[selectedPart] === false ? "active" : ""}`}
                      onClick={() => selectedPart && toggleComponentVisible(selectedPart)}
                    >
                      {Icons.visibility}
                      {selectedPart && componentVisibility[selectedPart] === false ? "SHOW PART" : "HIDE PART"}
                    </button>
                    <button
                      className={`action-btn ${showWireframe ? "active" : ""}`}
                      onClick={() => setShowWireframe(!showWireframe)}
                    >
                      {Icons.wireframe} WIREFRAME
                    </button>
                    <button
                      className={`action-btn ${showMeasurements ? "active" : ""}`}
                      onClick={() => setShowMeasurements(!showMeasurements)}
                    >
                      {Icons.ruler} MEASURE
                    </button>
                  </div>
                </div>

                <div className="panel" style={{ marginTop: "var(--space-4)", padding: "var(--space-3)", fontSize: "var(--text-xs)", lineHeight: "var(--leading-relaxed)" }}>
                  {vehicleRoot
                    ? mergedMeshCount > 0
                      ? `${mergedMeshCount} mesh(es) could not be separated by their names and are grouped as merged geometry.`
                      : "Components are identified from named model nodes. Unnamed geometry is grouped and not represented as separate parts."
                    : "Parts are separate editable meshes in this procedural demo model."}
                </div>
              </section>
            )}

            {activeTab === "replacement" && (
              <section className="sidebar-section" aria-labelledby="replacement-heading">
                <div className="section-header">
                  <h2 id="replacement-heading" className="section-title">REPLACEMENT PARTS</h2>
                  <span className="section-count">{replacementParts.length}</span>
                </div>

                <button
                  className="btn btn-outline"
                  disabled={partImporting}
                  onClick={() => partInputRef.current?.click()}
                  style={{ width: "100%" }}
                  aria-label="Import replacement GLB/glTF part"
                >
                  {partImporting ? <span className="spinner" /> : <> {Icons.upload} Import replacement GLB / glTF</>}
                </button>
                <input
                  ref={partInputRef}
                  className="hidden-input"
                  type="file"
                  accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.ktx2"
                  multiple
                  onChange={(event) => {
                    if (event.currentTarget.files) void importReplacementPart(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
                {partError && (
                  <div className="panel" style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", borderColor: "var(--error)", background: "var(--error-bg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
                    <span style={{ color: "var(--error)", fontSize: "var(--text-xs)" }}>{partError}</span>
                    <button className="btn btn-ghost btn-icon" onClick={() => setPartError("")} aria-label="Dismiss error" title="Dismiss">
                      {Icons.x}
                    </button>
                  </div>
                )}

                <div className="sidebar-list" style={{ marginTop: "var(--space-3)" }}>
                  {replacementParts.map((part) => (
                    <button
                      key={part.id}
                      className={`sidebar-item ${selectedReplacementPart?.id === part.id ? "active" : ""}`}
                      onClick={() => previewReplacementPart(part.id)}
                      aria-pressed={selectedReplacementPart?.id === part.id}
                    >
                      <div className="sidebar-item-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                      </div>
                      <div className="sidebar-item-content">
                        <span className="sidebar-item-title">{part.name}</span>
                        <span className="sidebar-item-subtitle">{PART_CATEGORY_LABELS[part.category]}</span>
                      </div>
                      {part.installed && <span className="badge badge-success" style={{ fontSize: 10, marginLeft: "var(--space-2)" }}>INSTALLED</span>}
                    </button>
                  ))}
                </div>

                {!replacementParts.length && (
                  <div className="panel" style={{ marginTop: "var(--space-4)", padding: "var(--space-4)", textAlign: "center" }}>
                    <span className="text-muted">Import a replacement wheel, bumper, spoiler, light, or other GLB/glTF part.</span>
                    <br />
                    <span className="text-dim" style={{ fontSize: "var(--text-xs)" }}>Select a target component to preview and validate the fit.</span>
                  </div>
                )}

                {selectedReplacementPart && (
                  <div className="replacement-editor" style={{ marginTop: "var(--space-4)" }}>
                    <div className="section-header">
                      <h3 className="section-title">SELECTED PART</h3>
                      <span className="section-count">{selectedReplacementPart.assetName}</span>
                    </div>

                    <div className="replacement-field">
                      <label htmlFor="part-category">Category</label>
                      <select
                        id="part-category"
                        value={selectedReplacementPart.category}
                        onChange={(event) =>
                          changeReplacementPart(selectedReplacementPart.id, {
                            category: event.target.value as PartCategory,
                          })
                        }
                      >
                        {PART_CATEGORIES.map((category) => (
                          <option value={category} key={category}>{PART_CATEGORY_LABELS[category]}</option>
                        ))}
                      </select>
                    </div>

                    <div className="replacement-field">
                      <label htmlFor="part-target">Target component</label>
                      <select
                        id="part-target"
                        value={selectedReplacementPart.replacesComponentId ?? ""}
                        onChange={(event) => setReplacementTarget(event.target.value)}
                      >
                        <option value="">Select target</option>
                        {replacementTargetOptions.map(([id, name]) => (
                          <option value={id} key={id}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div className={`compatibility-badge ${selectedReplacementPart.compatibility}`}>
                      <span className="status-icon">
                        {selectedReplacementPart.compatibility === "verified" && Icons.checkbox}
                        {selectedReplacementPart.compatibility === "user-configured" && Icons.cog}
                        {selectedReplacementPart.compatibility === "unverified" && Icons.alert}
                        {selectedReplacementPart.compatibility === "incompatible" && <span style={{color: "var(--error)"}}>✕</span>}
                      </span>
                      <span className="status-text">{selectedReplacementPart.compatibility.toUpperCase()}</span>
                      <span className="status-reason">{selectedReplacementPart.compatibilityReason}</span>
                    </div>

                    <div className="transform-grid">
                      {(["position", "rotation", "scale"] as const).map((kind) => (
                        <div key={kind} className="transform-row">
                          <span className="transform-label">{kind.toUpperCase()}</span>
                          {(["X", "Y", "Z"] as const).map((axis, index) => (
                            <div key={axis} className="transform-input-group">
                              <span className="axis-label">{axis}</span>
                              <input
                                type="number"
                                step={kind === "rotation" ? 1 : 0.01}
                                value={Number(
                                  (
                                    selectedReplacementPart.transform[kind][index] *
                                    (kind === "rotation" ? 180 / Math.PI : 1)
                                  ).toFixed(2),
                                )}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  if (Number.isFinite(value)) {
                                    updateReplacementTransform(kind, index as 0 | 1 | 2, value);
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                      <div className="transform-row">
                        <span className="transform-label">ATTACH</span>
                        {(["X", "Y", "Z"] as const).map((axis, index) => (
                          <div key={axis} className="transform-input-group">
                            <span className="axis-label">{axis}</span>
                            <input
                              type="number"
                              step={0.01}
                              value={Number((selectedReplacementPart.attachment?.position[index] ?? 0).toFixed(2))}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                if (Number.isFinite(value)) updateAttachmentOffset(index as 0 | 1 | 2, value);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="action-group" style={{ marginTop: "var(--space-3)" }}>
                      <button className="action-btn" onClick={() => previewReplacementPart(selectedReplacementPart.id)}>
                        {Icons.eye} PREVIEW
                      </button>
                      <button
                        className="action-btn primary"
                        disabled={!selectedReplacementPart.replacesComponentId}
                        onClick={() => installReplacementPart(selectedReplacementPart.id)}
                      >
                        {selectedReplacementPart.installed ? Icons.checkbox : Icons.download}
                        {selectedReplacementPart.installed ? "INSTALLED" : "INSTALL"}
                      </button>
                      <button
                        className="action-btn danger"
                        disabled={!selectedReplacementPart.installed}
                        onClick={() => uninstallReplacementPart(selectedReplacementPart.id)}
                      >
                        {Icons.refreshCw} REMOVE
                      </button>
                    </div>

                    <div className="action-group" style={{ marginTop: "var(--space-2)" }}>
                      <button
                        className="action-btn"
                        onClick={() =>
                          changeReplacementPart(selectedReplacementPart.id, {
                            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
                          })
                        }
                      >
                        {Icons.refreshCw} RESET TRANSFORM
                      </button>
                      <button className="action-btn danger" onClick={() => removeReplacementPart(selectedReplacementPart.id)}>
                        {Icons.refreshCw} DELETE PART
                      </button>
                    </div>

                    <div className="part-dimensions">
                      <span>SIZE</span>
                      <span>{selectedReplacementPart.dimensions.width.toFixed(2)} × {selectedReplacementPart.dimensions.height.toFixed(2)} × {selectedReplacementPart.dimensions.depth.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* AI Assistant always visible at bottom of sidebar */}
            <AIAssistant
              onPreviewProposal={prepareAIProposal}
              onApplyProposal={applyAIProposal}
              onCancelPreview={() => setAIPreview(null)}
              vehicleComponents={vehicleComponents}
              customization={customization}
              componentMaterials={componentMaterials}
              vehicleName={vehicleName}
              isImported={Boolean(vehicleRoot)}
              assetSource={assetSource}
              assetVerification={assetVerification}
              catalogueVehicleId={catalogueVehicleId}
              replacementParts={replacementParts}
            />
          </div>
        </aside>

        {/* CENTER COLUMN - 3D VIEWPORT */}
        <section className="center-column" role="main" aria-label="3D Vehicle Viewport">
          <div className="viewport-toolbar">
            <div className="breadcrumb">
              <span>STUDIO</span>
              <span className="breadcrumb-separator">/</span>
              <span>VEHICLES</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{vehicleName.toUpperCase()}</span>
            </div>
            <div className="viewport-tools">
              <span className="fps-badge">
                {Icons.monitor} 60 FPS
              </span>
              <button className="btn btn-ghost btn-icon tooltip" data-tooltip="Reset vehicle" onClick={reset} aria-label="Reset vehicle">
                {Icons.reset}
              </button>
              <button
                className={`btn ${explode > 0 ? "btn-primary" : "btn-ghost"} btn-icon tooltip`}
                data-tooltip="Toggle exploded view"
                onClick={() => setExplode(explode > 0 ? 0 : 0.8)}
                aria-label="Toggle exploded view"
                aria-pressed={explode > 0}
              >
                {Icons.explode}
              </button>
            </div>
          </div>

          <div className="viewport">
            <div className="viewport-label" aria-hidden="true">
              <span className={`status-dot ${tracker.status === "ready" ? "active" : "inactive"}`} />
              3D VIEWPORT
              <span className="breadcrumb-separator" />
              <span>ORBIT · SELECT · CUSTOMIZE</span>
            </div>

            {aiPreview && (
              <div className="ai-preview-banner" role="status" aria-live="polite">
                <span className="status-dot active" />
                3D PREVIEW — {aiPreview.label}
                <span>Not committed</span>
              </div>
            )}

            <div className="engineering-hud" aria-label="Selected component technical information" aria-live="polite">
              <div className="engineering-hud-header">
                <span className="engineering-live-dot" />
                LIVE COMPONENT DATA
              </div>
              <strong className="engineering-component-name">
                {selectedComponent?.name ?? (selectedPart ? partNames[selectedPart] ?? selectedPart : "Full vehicle")}
              </strong>
              <div className="engineering-component-meta">
                <span>{selectedComponent?.category.toUpperCase() ?? (selectedPart ? "PROCEDURAL PART" : "VEHICLE")}</span>
                {selectedComponent && <span>{selectedComponent.meshCount} MESH{selectedComponent.meshCount === 1 ? "" : "ES"}</span>}
                <span>ID {selectedPart || (vehicleRoot ? "ASSET ROOT" : "VEHICLE")}</span>
              </div>
              <div className="engineering-hud-divider" />
              <div className="engineering-material-row">
                {hudMaterialColor ? (
                  <>
                    <span className="engineering-material-swatch" style={{ backgroundColor: hudMaterialColor }} />
                    <span>{hudMaterialColor.toUpperCase()}</span>
                  </>
                ) : (
                  <span>SOURCE MATERIAL</span>
                )}
                {hudMaterialFinish && <span className="engineering-finish">{hudMaterialFinish.toUpperCase()}</span>}
              </div>
              {selectedComponent && (
                <div className="engineering-bounds">
                  SOURCE MATERIALS&nbsp;
                  {selectedComponent.originalMaterialNames.length
                    ? selectedComponent.originalMaterialNames.join(", ")
                    : "UNNAMED"}
                  <span className="breadcrumb-separator" />
                  {selectedComponent.customizable && selectedComponent.allowedModifications.length
                    ? "CUSTOMIZABLE"
                    : "INSPECT ONLY"}
                </div>
              )}
              {hudBounds && (
                <div className="engineering-bounds">
                  MODEL BOUNDS&nbsp;
                  {hudBounds.width.toFixed(2)} ×
                  {hudBounds.height.toFixed(2)} ×
                  {hudBounds.depth.toFixed(2)}
                </div>
              )}
            </div>

            <Suspense fallback={<div className="viewer-loading"><span className="spinner" /> PREPARING 3D STUDIO…</div>}>
              <CarScene />
            </Suspense>

            <div className="viewport-hint" aria-hidden="true">
              <span>{Icons.hand}</span>
              Drag to orbit · Scroll to zoom
            </div>

            <div className="view-cube" aria-hidden="true">
              <div className="view-cube-face">
                FRONT<br />
                <strong>↑</strong>
              </div>
              <span className="view-cube-label">CAMERA VIEW</span>
            </div>

            <div className="viewport-bottom">
              <div className="selected-chip">
                <span className="selection-mark">{Icons.target}</span>
                <div className="chip-label">
                  <small>SELECTED COMPONENT</small>
                  <strong>{partNames[selectedPart] ?? selectedPart}</strong>
                </div>
              </div>
              <div className="zoom-controls">
                <button className="zoom-btn tooltip" data-tooltip="Zoom in" onClick={() => setZoom(zoom + 0.1)} aria-label="Zoom in">{Icons.plus}</button>
                <span className="zoom-value">{Math.round(zoom * 100)}%</span>
                <button className="zoom-btn tooltip" data-tooltip="Zoom out" onClick={() => setZoom(zoom - 0.1)} aria-label="Zoom out">{Icons.chevronDown}</button>
              </div>
              <div className="explode-controls">
                <button
                  className={`explode-btn ${explode > 0 && explode < 1 ? "active" : ""}`}
                  onClick={() => setExplode(explode > 0 && explode < 1 ? 0 : 0.45)}
                  aria-pressed={explode > 0 && explode < 1}
                >
                  {Icons.expand} PARTIAL
                </button>
                <button
                  className={`explode-btn ${explode === 1 ? "active" : ""}`}
                  onClick={() => setExplode(explode === 1 ? 0 : 1)}
                  aria-pressed={explode === 1}
                >
                  {Icons.expand} FULL EXPLODE
                </button>
                {explode > 0 && (
                  <button className="explode-btn restore" onClick={() => setExplode(0)}>
                    {Icons.compress} RESTORE
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="control-strip">
            <div className="gesture-summary">
              <div className={`gesture-icon ${tracker.status === "ready" ? "active" : ""}`} aria-hidden="true">
                {tracker.status === "ready" ? Icons.hand : Icons.cpu}
              </div>
              <div className="gesture-status">
                <small>GESTURE CONTROL</small>
                <strong>
                  {tracker.status === "ready"
                    ? interactionPaused
                      ? "PAUSED"
                      : detectedHands === 0
                        ? "NO HAND DETECTED"
                        : `${detectedHands} HAND${detectedHands === 1 ? "" : "S"} DETECTED`
                    : tracker.error
                      ? "CAMERA ERROR"
                      : "CONNECT CAMERA TO BEGIN"}
                </strong>
                <small className="gesture-detail">
                  {tracker.status === "ready"
                    ? `GESTURE ${gesture.toUpperCase()} · ${Math.round(handConfidence * 100)}% · ACTION ${activeGestureAction}`
                    : tracker.error || "Camera is disconnected"}
                </small>
                <small className="gesture-detail">
                  CALIBRATION {calibrationLabel} · HAND SCALE {gestureSettings.calibrationHandScale.toFixed(2)}
                </small>
              </div>
            </div>

            <div className="gesture-divider" aria-hidden="true" />

            <div className="gesture-shortcuts" aria-label="Gesture shortcuts">
              <div className="gesture-shortcut">
                <kbd>⌁</kbd> PINCH — Zoom
              </div>
              <div className="gesture-shortcut">
                <kbd>☖</kbd> OPEN PALM — Orbit
              </div>
              <div className="gesture-shortcut">
                <kbd>☝</kbd> POINT — Select
              </div>
              <div className="gesture-shortcut">
                <kbd>✋✋</kbd> TWO HANDS — Explode / Pinch zoom
              </div>
            </div>

            <button
              className={`connect-btn ${tracker.status === "ready" ? "connected" : "disconnected"}`}
              disabled={tracker.status === "loading"}
              onClick={tracker.status === "ready" ? tracker.stop : tracker.start}
              aria-label={tracker.status === "ready" ? "Disconnect camera" : "Connect camera"}
            >
              {tracker.status === "ready" ? (
                <>
                  {Icons.cameraOff} DISCONNECT
                </>
              ) : tracker.status === "loading" ? (
                <>
                  <span className="spinner" style={{width: 16, height: 16}} /> CONNECTING…
                </>
              ) : (
                <>
                  {Icons.camera} CONNECT CAMERA
                </>
              )}
            </button>
          </div>

          {tracker.error && (
            <div className="error-banner" role="alert">
              {Icons.alert}
              {tracker.error}
            </div>
          )}
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="right-sidebar" role="complementary" aria-label="Customization controls">
          <div className="right-sidebar-header">
            <div className="right-sidebar-title">
              <span className="right-sidebar-eyebrow">{selectedPart ? "COMPONENT DETAIL" : "CUSTOMIZE"}</span>
              <h2 className="right-sidebar-heading">
                {selectedPart
                  ? selectedComponent?.name ?? partNames[selectedPart] ?? selectedPart
                  : "Design Studio"}
              </h2>
            </div>
            <button className="btn btn-ghost" onClick={reset} aria-label="Reset all customizations">
              {Icons.refreshCw} RESET ALL
            </button>
          </div>

          <div className="right-sidebar-content" ref={rightSidebarContentRef}>
            {/* INSPECT SECTION */}
            <section className="custom-section" aria-labelledby="inspect-heading">
              <div className="section-header-row">
                <span className="section-number">01</span>
                <h3 id="inspect-heading" className="section-title">INSPECT</h3>
              </div>

              {selectedComponent ? (
                <>
                  <div className="meta-tags">
                    <span className="meta-tag">{selectedComponent.category.replace("-", " ").toUpperCase()}</span>
                    <span className="meta-tag">{selectedComponent.meshCount} MESH{selectedComponent.meshCount === 1 ? "" : "ES"}</span>
                    <span className={`meta-tag ${selectedComponent.transformable ? "transformable" : ""}`}>
                      {selectedComponent.transformable ? "TRANSFORMABLE" : "MERGED / FIXED"}
                    </span>
                    <span className={`meta-tag ${componentVisibility[selectedPart] === false ? "hidden" : ""}`}>
                      {componentVisibility[selectedPart] === false ? "HIDDEN" : "VISIBLE"}
                    </span>
                  </div>

                  <div className="action-group">
                    <button
                      className="action-btn"
                      disabled={!selectedComponent.transformable}
                      onClick={() => rotateSelectedComponent(1, -Math.PI / 12)}
                    >
                      {Icons.rotateCcw} ROTATE CCW
                    </button>
                    <button
                      className="action-btn"
                      disabled={!selectedComponent.transformable}
                      onClick={() => rotateSelectedComponent(1, Math.PI / 12)}
                    >
                      {Icons.rotateCw} ROTATE CW
                    </button>
                    <button className="action-btn" disabled={!selectedComponent.transformable} onClick={resetSelectedComponentTransform}>
                      {Icons.refreshCw} RESET PART
                    </button>
                  </div>

                  <div className="rotation-readout">
                    <span>ROTATION</span>
                    <span>X {Math.round(selectedRotation[0] * 180 / Math.PI)}°</span>
                    <span>Y {Math.round(selectedRotation[1] * 180 / Math.PI)}°</span>
                    <span>Z {Math.round(selectedRotation[2] * 180 / Math.PI)}°</span>
                  </div>

                  <div className="action-group">
                    <button className={`action-btn ${isolatedComponentId ? "active" : ""}`} onClick={() => isolateComponent(isolatedComponentId ? null : selectedPart)}>
                      {isolatedComponentId ? Icons.compress : Icons.expand}
                      {isolatedComponentId ? "SHOW ALL" : "ISOLATE"}
                    </button>
                    <button className={`action-btn ${componentVisibility[selectedPart] === false ? "active" : ""}`} onClick={() => toggleComponentVisible(selectedPart)}>
                      {componentVisibility[selectedPart] === false ? Icons.visibility : Icons.visibilityOff}
                      {componentVisibility[selectedPart] === false ? "SHOW PART" : "HIDE PART"}
                    </button>
                    <button className={`action-btn ${showWireframe ? "active" : ""}`} onClick={() => setShowWireframe(!showWireframe)}>
                      {Icons.wireframe} WIREFRAME
                    </button>
                  </div>

                  {showMeasurements && (
                    <div className="bounds-readout">
                      BOUNDS <span>{(selectedComponent.bounds.max.x - selectedComponent.bounds.min.x).toFixed(2)}</span> ×
                      <span>{(selectedComponent.bounds.max.y - selectedComponent.bounds.min.y).toFixed(2)}</span> ×
                      <span>{(selectedComponent.bounds.max.z - selectedComponent.bounds.min.z).toFixed(2)}</span>
                    </div>
                  )}

                  {selectedComponent.editable && (
                    <div className="component-paint">
                      <span className="component-paint-label">PART FINISH</span>
                      <input
                        type="color"
                        aria-label="Selected component color"
                        value={selectedOverride?.color ?? customization.paint}
                        onChange={(event) => setComponentMaterial(selectedPart, { color: event.target.value })}
                      />
                      <select
                        aria-label="Selected component finish"
                        value={selectedOverride?.finish ?? customization.finish}
                        onChange={(event) => setComponentMaterial(selectedPart, { finish: event.target.value as Finish })}
                      >
                        <option value="gloss">Gloss</option>
                        <option value="metallic">Metallic</option>
                        <option value="matte">Matte</option>
                      </select>
                      <label className="component-paint-slider">
                        <span>Metallic</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          aria-label="Selected component metallic"
                          value={selectedOverride?.metallic ?? customization.paintMetallic}
                          onChange={(event) => setComponentMaterial(selectedPart, { metallic: Number(event.target.value) })}
                        />
                      </label>
                      <label className="component-paint-slider">
                        <span>Roughness</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          aria-label="Selected component roughness"
                          value={selectedOverride?.roughness ?? customization.paintRoughness}
                          onChange={(event) => setComponentMaterial(selectedPart, { roughness: Number(event.target.value) })}
                        />
                      </label>
                      <label className="component-paint-slider">
                        <span>Opacity</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          aria-label="Selected component opacity"
                          value={selectedOverride?.opacity ?? 1}
                          onChange={(event) => setComponentMaterial(selectedPart, { opacity: Number(event.target.value) })}
                        />
                      </label>
                      <button
                        className="btn btn-ghost btn-icon tooltip"
                        data-tooltip="Reset component material"
                        aria-label="Reset component material"
                        title="Reset component material"
                        onClick={() => {
                          const current = { ...componentMaterials };
                          delete current[selectedPart];
                          useStudioStore.setState({ componentMaterials: current, statusMessage: "Component material reset" });
                        }}
                      >
                        {Icons.reset}
                      </button>
                    </div>
                  )}
                </>
              ) : selectedPart ? (
                <>
                  <div className="meta-tags">
                    <span className="meta-tag">PROCEDURAL</span>
                    <span className="meta-tag">{showMeasurements ? "MEASURED" : "EDITABLE MESH"}</span>
                    <span className={`meta-tag ${componentVisibility[selectedPart] === false ? "hidden" : ""}`}>
                      {componentVisibility[selectedPart] === false ? "HIDDEN" : "VISIBLE"}
                    </span>
                  </div>

                  <div className="action-group">
                    <button className="action-btn" onClick={() => isolateComponent(isolatedComponentId ? null : selectedPart)}>
                      {isolatedComponentId ? Icons.compress : Icons.expand}
                      {isolatedComponentId ? "SHOW ALL" : "ISOLATE"}
                    </button>
                    <button className={`action-btn ${componentVisibility[selectedPart] === false ? "active" : ""}`} onClick={() => toggleComponentVisible(selectedPart)}>
                      {componentVisibility[selectedPart] === false ? Icons.visibility : Icons.visibilityOff}
                      {componentVisibility[selectedPart] === false ? "SHOW PART" : "HIDE PART"}
                    </button>
                    <button className={`action-btn ${showWireframe ? "active" : ""}`} onClick={() => setShowWireframe(!showWireframe)}>
                      {Icons.wireframe} WIREFRAME
                    </button>
                    <button className={`action-btn ${showMeasurements ? "active" : ""}`} onClick={() => setShowMeasurements(!showMeasurements)}>
                      {Icons.ruler} MEASURE
                    </button>
                  </div>

                  {showMeasurements && PROCEDURAL_BOUNDS[selectedPart] && (
                    <div className="bounds-readout">
                      BOUNDS <span>{PROCEDURAL_BOUNDS[selectedPart].width.toFixed(2)}</span> ×
                      <span>{PROCEDURAL_BOUNDS[selectedPart].height.toFixed(2)}</span> ×
                      <span>{PROCEDURAL_BOUNDS[selectedPart].depth.toFixed(2)}</span>
                    </div>
                  )}
                </>
              ) : (
                <button className="return-vehicle" onClick={() => setSelectedPart("")}>
                  {Icons.home} FOCUS FULL VEHICLE
                </button>
              )}
            </section>

            {/* PAINT & FINISH */}
            <section className="custom-section" aria-labelledby="paint-heading">
              <div className="section-header-row">
                <span className="section-number">02</span>
                <h3 id="paint-heading" className="section-title">PAINT & FINISH</h3>
                <button className="section-help tooltip" data-tooltip="Paint is applied to individual body meshes" aria-label="Help">{Icons.help}</button>
              </div>

              <div className="paint-preview-row">
                <div className="paint-swatch-large" style={{ background: customization.paint }} aria-label={`Current paint: ${customization.paint}`} />
                <div className="paint-info">
                  <div className="paint-name">{customization.paint.toUpperCase()} · {customization.finish}</div>
                  <div className="paint-meta">BODY COLOR · METALLIC {Math.round(customization.paintMetallic * 100)}% · ROUGHNESS {Math.round(customization.paintRoughness * 100)}% · CLEAR COAT {Math.round(customization.clearCoat * 100)}%</div>
                </div>
                <input
                  type="color"
                  className="color-picker-btn tooltip"
                  data-tooltip="Pick custom color"
                  value={customization.paint}
                  onChange={(event) => setCustomization({ paint: event.target.value })}
                  aria-label="Pick custom paint color"
                />
              </div>

              <div className="swatch-grid">
                {paintPresets.map((preset) => (
                  <button
                    key={preset.name}
                    className={`swatch ${customization.paint === preset.color && customization.finish === preset.finish ? "active" : ""}`}
                    style={{ background: preset.color }}
                    onClick={() => setCustomization({
                      paint: preset.color,
                      finish: preset.finish,
                      paintMetallic: preset.metallic,
                      paintRoughness: preset.roughness,
                      clearCoat: preset.clearCoat,
                    })}
                    aria-label={`Apply ${preset.name} preset`}
                    aria-pressed={customization.paint === preset.color && customization.finish === preset.finish}
                  />
                ))}
                <label className="swatch swatch-custom" aria-label="Custom color">
                  <input type="color" value={customization.paint} onChange={(event) => setCustomization({ paint: event.target.value })} />
                  {Icons.plus}
                </label>
              </div>

              <div className="finish-options">
                {(["gloss", "metallic", "matte"] as Finish[]).map((finish) => (
                  <button
                    key={finish}
                    className={`finish-btn ${customization.finish === finish ? "active" : ""}`}
                    onClick={() => setCustomization({ finish })}
                    aria-pressed={customization.finish === finish}
                  >
                    {finish.charAt(0).toUpperCase() + finish.slice(1)}
                  </button>
                ))}
              </div>
            </section>

            {/* WHEELS & TRIM */}
            <section className="custom-section" aria-labelledby="wheels-heading">
              <div className="section-header-row">
                <span className="section-number">03</span>
                <h3 id="wheels-heading" className="section-title">WHEELS & TRIM</h3>
              </div>

              <div className="wheel-card">
                <div className="wheel-preview-large" aria-hidden="true">
                  <div className="wheel-preview-ring">
                    <div className="wheel-preview-spokes">
                      {Array.from(
                        { length: customization.wheelDesign === "turbine" ? 10 : 5 },
                        (_, spoke) => {
                          const spokeCount = customization.wheelDesign === "turbine" ? 10 : 5;
                          const angle = (spoke / spokeCount) * Math.PI * 2;
                          return (
                            <div
                              key={spoke}
                              className="wheel-preview-spoke"
                              style={{
                                transform: `translate(-50%, -50%) rotate(${angle}rad)`,
                                background: customization.wheelColor,
                              }}
                            />
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
                <div className="wheel-info">
                  <div className="wheel-name">{customization.wheelDesign === "five-spoke" ? "Five-Spoke Alloy" : "Turbine Alloy"}</div>
                  <div className="wheel-spec">{vehicleRoot ? "SOURCE MODEL · MATERIAL EDIT" : "PROCEDURAL · 19 IN"}</div>
                </div>
              </div>

              <div className="wheel-options">
                <button
                  className={`wheel-option-btn ${customization.wheelDesign === "five-spoke" ? "active" : ""}`}
                  disabled={Boolean(vehicleRoot)}
                  onClick={() => setCustomization({ wheelDesign: "five-spoke" })}
                  aria-pressed={customization.wheelDesign === "five-spoke"}
                >
                  5-SPOKE
                </button>
                <button
                  className={`wheel-option-btn ${customization.wheelDesign === "turbine" ? "active" : ""}`}
                  disabled={Boolean(vehicleRoot)}
                  onClick={() => setCustomization({ wheelDesign: "turbine" })}
                  aria-pressed={customization.wheelDesign === "turbine"}
                >
                  TURBINE
                </button>
              </div>

              <div className="field">
                <label className="field-label">Wheel finish</label>
                <div className="mini-swatch-row">
                  {["#a9b5bd", "#15191d", "#b7834e", "#c5c7c7"].map((color) => (
                    <button
                      key={color}
                      className={`mini-swatch ${customization.wheelColor === color ? "active" : ""}`}
                      style={{ background: color }}
                      onClick={() => setCustomization({ wheelColor: color })}
                      aria-label={`Set wheel color ${color}`}
                      aria-pressed={customization.wheelColor === color}
                    />
                  ))}
                </div>
              </div>

              {vehicleRoot && (
                <div className="asset-notice">
                  {Icons.alert} Wheel replacement meshes are generated for the procedural model; no fit-checked third-party wheel asset is bundled for imported vehicles.
                </div>
              )}
            </section>

            {/* EXTERIOR */}
            <section className="custom-section" aria-labelledby="exterior-heading">
              <div className="section-header-row">
                <span className="section-number">04</span>
                <h3 id="exterior-heading" className="section-title">EXTERIOR</h3>
              </div>

              <div className="toggle-row">
                <div className="toggle-label">
                  <strong>Rear spoiler</strong>
                  <small>SPORT AERO · INCLUDED</small>
                </div>
                <button
                  role="switch"
                  aria-checked={customization.spoiler}
                  className={`toggle ${customization.spoiler ? "active" : ""}`}
                  onClick={() => setCustomization({ spoiler: !customization.spoiler })}
                  aria-label="Toggle rear spoiler"
                >
                  <i />
                </button>
              </div>

              {customization.spoiler && (
                <div className="wheel-options" style={{ marginTop: "var(--space-2)" }}>
                  <button
                    className={`wheel-option-btn ${customization.spoilerStyle === "sport" ? "active" : ""}`}
                    disabled={Boolean(vehicleRoot)}
                    onClick={() => setCustomization({ spoilerStyle: "sport" })}
                    aria-pressed={customization.spoilerStyle === "sport"}
                  >
                    SPORT
                  </button>
                  <button
                    className={`wheel-option-btn ${customization.spoilerStyle === "track" ? "active" : ""}`}
                    disabled={Boolean(vehicleRoot)}
                    onClick={() => setCustomization({ spoilerStyle: "track" })}
                    aria-pressed={customization.spoilerStyle === "track"}
                  >
                    TRACK
                  </button>
                </div>
              )}

              <div className="toggle-row">
                <div className="toggle-label">
                  <strong>Window tint</strong>
                  <small>SMOKE · 70%</small>
                </div>
                <button
                  role="switch"
                  aria-checked={customization.windowTint}
                  className={`toggle ${customization.windowTint ? "active" : ""}`}
                  onClick={() => setCustomization({ windowTint: !customization.windowTint })}
                  aria-label="Toggle window tint"
                >
                  <i />
                </button>
              </div>
            </section>

            {/* BUMPERS */}
            <section className="custom-section" aria-labelledby="bumpers-heading">
              <div className="section-header-row">
                <span className="section-number">05</span>
                <h3 id="bumpers-heading" className="section-title">BUMPERS</h3>
              </div>

              <div className="wheel-options">
                <button
                  className={`wheel-option-btn ${customization.bumperStyle === "street" ? "active" : ""}`}
                  disabled={Boolean(vehicleRoot)}
                  onClick={() => setCustomization({ bumperStyle: "street" })}
                  aria-pressed={customization.bumperStyle === "street"}
                >
                  STREET
                </button>
                <button
                  className={`wheel-option-btn ${customization.bumperStyle === "track" ? "active" : ""}`}
                  disabled={Boolean(vehicleRoot)}
                  onClick={() => setCustomization({ bumperStyle: "track" })}
                  aria-pressed={customization.bumperStyle === "track"}
                >
                  TRACK SPLITTER
                </button>
              </div>

              {vehicleRoot && (
                <div className="asset-notice">
                  {Icons.alert} Procedural bumper variants are not applied to imported model meshes.
                </div>
              )}
            </section>

            {/* MATERIAL STUDIO */}
            <section className="custom-section" aria-labelledby="material-heading">
              <div className="section-header-row">
                <span className="section-number">06</span>
                <h3 id="material-heading" className="section-title">MATERIAL STUDIO</h3>
                <button className="section-help tooltip" data-tooltip="Fine-tune PBR material parameters" aria-label="Help">{Icons.help}</button>
              </div>

              <div className="paint-preview-row">
                <div className="paint-swatch-large" style={{ background: customization.paint }} aria-hidden="true" />
                <div className="paint-info">
                  <div className="paint-name">{customization.paint.toUpperCase()}</div>
                  <div className="paint-meta">PANEL FINISH · {customization.finish.toUpperCase()}</div>
                </div>
              </div>

              <div className="preset-grid">
                {paintPresets.map((preset) => (
                  <button
                    key={preset.name}
                    className={`preset-btn ${customization.paint === preset.color ? "active" : ""}`}
                    onClick={() =>
                      setCustomization({
                        paint: preset.color,
                        paintMetallic: preset.metallic,
                        paintRoughness: preset.roughness,
                        clearCoat: preset.clearCoat,
                        finish: preset.finish,
                      })}
                    aria-pressed={customization.paint === preset.color}
                  >
                    {preset.name.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label">Metallic</span>
                  <span className="slider-value">{customization.paintMetallic.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  className="slider-track"
                  min={0}
                  max={1}
                  step={0.01}
                  value={customization.paintMetallic}
                  onChange={(event) => setCustomization({ paintMetallic: Number(event.target.value) })}
                  aria-label="Paint metallic value"
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label">Roughness</span>
                  <span className="slider-value">{customization.paintRoughness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  className="slider-track"
                  min={0}
                  max={1}
                  step={0.01}
                  value={customization.paintRoughness}
                  onChange={(event) => setCustomization({ paintRoughness: Number(event.target.value) })}
                  aria-label="Paint roughness value"
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label">Clear coat</span>
                  <span className="slider-value">{customization.clearCoat.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  className="slider-track"
                  min={0}
                  max={1}
                  step={0.01}
                  value={customization.clearCoat}
                  onChange={(event) => setCustomization({ clearCoat: Number(event.target.value) })}
                  aria-label="Paint clearcoat value"
                />
              </div>

              <div className="field">
                <label className="field-label">Environment</label>
                <div className="segmented-group">
                  {(["dark-showroom", "luxury-studio", "daylight", "neutral-inspection"] as const).map((option) => (
                    <button
                      key={option}
                      className={`segment-btn ${customization.environment === option ? "active" : ""}`}
                      onClick={() => setCustomization({ environment: option })}
                      aria-pressed={customization.environment === option}
                    >
                      {option.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="field-label">Quality</label>
                <div className="segmented-group">
                  {(["low", "medium", "high", "ultra"] as const).map((option) => (
                    <button
                      key={option}
                      className={`segment-btn ${customization.quality === option ? "active" : ""}`}
                      onClick={() => setCustomization({ quality: option })}
                      aria-pressed={customization.quality === option}
                    >
                      {option.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="field-label">Showroom</label>
                <div className="segmented-group">
                  {SHOWROOM_ENVIRONMENTS.map((option) => (
                    <button
                      key={option.id}
                      className={`segment-btn ${(customization.showroomEnvironment ?? DEFAULT_SHOWROOM_ENVIRONMENT) === option.id ? "active" : ""}`}
                      onClick={() => setCustomization({ showroomEnvironment: option.id })}
                      aria-pressed={(customization.showroomEnvironment ?? DEFAULT_SHOWROOM_ENVIRONMENT) === option.id}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="field-label">Camera</label>
                <div className="segmented-group">
                  {CAMERA_VIEWS.map((view) => (
                    <button
                      key={view.id}
                      className={`segment-btn ${cameraView === view.id ? "active" : ""}`}
                      onClick={() => requestCameraView(view.id)}
                      aria-pressed={cameraView === view.id}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="field-label">Mode</label>
                <div className="segmented-group">
                  {(["showroom", "inspection", "customization", "presentation"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={`segment-btn ${presentationMode === mode ? "active" : ""}`}
                      onClick={() => setPresentationMode(mode)}
                      aria-pressed={presentationMode === mode}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                {presentationMode === "presentation" && (
                  <label className="field" style={{ marginTop: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <input
                      type="checkbox"
                      checked={autoRotate}
                      onChange={(event) => setAutoRotate(event.target.checked)}
                      aria-label="Auto rotate vehicle"
                    />
                    <span className="field-label" style={{ margin: 0 }}>Auto rotate</span>
                  </label>
                )}
              </div>

              <div className="action-group" style={{ marginTop: "var(--space-4)" }}>
                <button className="action-btn primary" onClick={applySelectedMaterial}>
                  {Icons.palette} {selectedPart ? "APPLY TO PART" : "APPLY TO BODY"}
                </button>
                <button className="action-btn" onClick={() => setCustomization({ paint: "#1d5e66", paintMetallic: 0.82, paintRoughness: 0.26, clearCoat: 0.72, finish: "metallic" })}>
                  {Icons.refreshCw} RESET FINISH
                </button>
                <button className="action-btn" onClick={undo}>
                  {Icons.undo} UNDO
                </button>
              </div>
            </section>

            {/* GESTURE SETTINGS */}
            <section className="custom-section" aria-labelledby="gesture-heading">
              <div className="section-header-row">
                <span className="section-number">07</span>
                <h3 id="gesture-heading" className="section-title">GESTURE SETTINGS</h3>
              </div>

              <div className="setting-row">
                <div className="setting-header">
                  <span className="setting-label">Confidence threshold</span>
                  <span className="setting-value">{Math.round(gestureSettings.confidenceThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  className="setting-track"
                  min={0.3}
                  max={0.95}
                  step={0.01}
                  value={gestureSettings.confidenceThreshold}
                  onChange={(event) => setGestureSettings({ confidenceThreshold: Number(event.target.value) })}
                  aria-label="Gesture confidence threshold"
                  title="Minimum hand detection confidence required to trigger gestures. Higher = stricter."
                />
              </div>

              <div className="setting-row">
                <div className="setting-header">
                  <span className="setting-label">Action cooldown</span>
                  <span className="setting-value">{gestureSettings.gestureCooldown} ms</span>
                </div>
                <input
                  type="range"
                  className="setting-track"
                  min={300}
                  max={5000}
                  step={50}
                  value={gestureSettings.gestureCooldown}
                  onChange={(event) => setGestureSettings({ gestureCooldown: Number(event.target.value) })}
                  aria-label="Gesture action cooldown"
                  title="Minimum time between gesture actions (e.g. thumbs-up confirmation). Lower = more responsive."
                />
              </div>

              <div className="setting-row">
                <div className="setting-header">
                  <span className="setting-label">Landmark smoothing</span>
                  <span className="setting-value">{gestureSettings.smoothing.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  className="setting-track"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={gestureSettings.smoothing}
                  onChange={(event) => setGestureSettings({ smoothing: Number(event.target.value) })}
                  aria-label="Gesture smoothing"
                  title="Landmark smoothing factor. Higher = smoother but more lag. Lower = more responsive but jitterier."
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-label">
                  <strong>Two-hand zoom</strong>
                  <small>PINCH BOTH HANDS</small>
                </div>
                <button
                  role="switch"
                  aria-checked={gestureSettings.twoHandZoom}
                  className={`toggle ${gestureSettings.twoHandZoom ? "active" : ""}`}
                  onClick={() => setGestureSettings({ twoHandZoom: !gestureSettings.twoHandZoom })}
                  aria-label="Toggle two-hand zoom"
                >
                  <i />
                </button>
              </div>

              <div className="action-group" style={{ marginTop: "var(--space-3)" }}>
                <button className="action-btn" onClick={calibrateGesture} disabled={tracker.status !== "ready"}>
                  {Icons.target} CALIBRATE HAND
                </button>
                <button className="action-btn" onClick={resetGestureSettings}>
                  {Icons.refreshCw} RESET SETTINGS
                </button>
              </div>

              <div className={`gesture-health ${trackingLost ? "lost" : "ok"}`}>
                {trackingLost
                  ? <>{Icons.alert} Tracking lost — show a hand or reconnect the camera.</>
                  : <>{Icons.checkbox} {calibrationLabel.toLowerCase()} calibration · settings are saved locally.</>}
              </div>
            </section>

            {/* QUICK PRESET */}
            <div className="enhancement-card">
              <div className="enhancement-icon">{Icons.sparkle}</div>
              <div className="enhancement-content">
                <span className="enhancement-label">DESIGN ASSIST</span>
                <strong className="enhancement-title">Sport / Track Preset</strong>
                <span className="enhancement-desc">Teal metallic · track aero · turbine wheels</span>
              </div>
              <button
                className="enhancement-btn tooltip"
                data-tooltip="Apply sport/track preset"
                onClick={() =>
                  setCustomization({
                    paint: "#1d5e66",
                    finish: "metallic",
                    paintMetallic: 0.82,
                    paintRoughness: 0.26,
                    clearCoat: 0.72,
                    spoiler: true,
                    spoilerStyle: "track",
                    bumperStyle: "track",
                    wheelColor: "#a9b5bd",
                    wheelDesign: "turbine",
                  })
                }
                aria-label="Apply sport/track preset"
              >
                {Icons.arrowUpRight}
              </button>
            </div>
          </div>

          {/* FOOTER */}
          <div className="right-sidebar-footer">
            <div className="footer-actions">
              <button className="footer-btn undo" onClick={undo} aria-label="Undo">
                {Icons.undo} UNDO
              </button>
              <button className="footer-btn redo" onClick={redo} aria-label="Redo">
                {Icons.redo} REDO
              </button>
              <span className="footer-status">{statusMessage || saveMessage}</span>
              <button className="save-btn" onClick={saveProject} aria-label="Save design">
                {Icons.save} SAVE DESIGN
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* BOTTOM STATUS BAR */}
      <footer className="bottombar" role="status" aria-live="polite">
        <div className="bottombar-left">
          <span className={`status-dot ${saveMessage === "Project saved" ? "active" : saveMessage ? "warning" : "inactive"}`} aria-hidden="true" />
          {saveMessage === "Project saved" ? "PROJECT SAVED" : saveMessage ? "UNSAVED CHANGES" : "READY"}
        </div>
        <div className="bottombar-center">
          GESTURE DRIVE 3D
          <span className="bottombar-divider">·</span>
          MODEL: {vehicleRoot ? vehicleName.toUpperCase() : "PROCEDURAL SPORT COUPE"}
          <span className="bottombar-divider">·</span>
          {tracker.status === "ready" ? "HAND TRACKING ACTIVE" : "HAND TRACKING DISCONNECTED"}
        </div>
        <div className="bottombar-right">
          <span className={`gesture-badge ${gesture !== "none" ? "active" : ""}`}>{gesture.toUpperCase()}</span>
          <span className="confidence-badge">{Math.round(handConfidence * 100)}% CONFIDENCE</span>
          <span className="confidence-badge">{detectedHands} HAND{detectedHands === 1 ? "" : "S"}</span>
        </div>
      </footer>

      {/* GESTURE PANEL OVERLAY */}
      <div className={`gesture-panel ${tracker.status === "ready" ? "" : "collapsed"}`} aria-label={tracker.status === "ready" ? "Hand tracking preview" : "Hand tracking inactive"}>
        <video ref={tracker.videoRef} className="gesture-panel-video" muted playsInline aria-label="Webcam preview for hand tracking" />
        {tracker.status === "ready" && (
          <>
            <div className="gesture-panel-header">
              <span className="status-dot active" aria-hidden="true" />
              HAND TRACKING
            </div>
            <svg className="gesture-panel-landmarks" viewBox="0 0 1 1" preserveAspectRatio="none">
              {tracker.landmarks.map((hand, handIndex) =>
                hand.map((point, index) => (
                  <circle key={`${handIndex}-${index}`} cx={1 - point.x} cy={point.y} r="0.012" />
                ))
              )}
            </svg>
          </>
        )}
      </div>
    </main>
  );
}