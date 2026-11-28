import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStudioStore } from "./studio";
import type { DesignChange } from "./studio";
import * as THREE from "three";

describe("Studio store AI preview and validation", () => {
  const createMockVehicleComponent = (overrides: Partial<{
    id: string;
    name: string;
    category: string;
    editable: boolean;
    transformable: boolean;
    inspectable: boolean;
    customizable: boolean;
    parentId: string | null;
    originalMaterialNames: string[];
    allowedModifications: string[];
    source: string;
    bounds: { width: number; height: number; depth: number };
    focusPoint: [number, number, number];
    cameraDistance: number;
  }> = {}) => ({
    id: "body",
    name: "Body shell",
    category: "body",
    editable: true,
    transformable: false,
    inspectable: true,
    customizable: true,
    parentId: null,
    originalMaterialNames: ["body-material"],
    allowedModifications: ["material"],
    source: "category",
    bounds: { width: 1.8, height: 0.62, depth: 3.8 },
    focusPoint: [0, 0.54, 0],
    cameraDistance: 7.4,
    ...overrides,
  });

  const mockVehicleComponents = [
    createMockVehicleComponent({ id: "body", name: "Body shell", category: "body", editable: true, transformable: false, inspectable: true, customizable: true, parentId: null, cameraDistance: 7.4, focusPoint: [0, 0.54, 0] }),
    createMockVehicleComponent({ id: "wheels", name: "Wheels", category: "wheels", editable: true, transformable: true, inspectable: true, customizable: true, parentId: "body", cameraDistance: 3.5, focusPoint: [0, 0, 0] }),
    createMockVehicleComponent({ id: "interior", name: "Interior", category: "interior", editable: false, transformable: false, inspectable: false, customizable: false, parentId: "body", cameraDistance: 4.0, focusPoint: [0, 0.3, 0] }),
  ];

  const mockModelAsset = {
    name: "test.glb",
    mainFile: "test.glb",
    files: [],
  };

  const mockAudit = {
    meshCount: 10,
    materialNames: ["body-material", "wheel-material", "interior-material"],
    boundingBox: { min: [-1, -1, -1], max: [1, 1, 1] },
    componentCount: 3,
    hasAnimations: false,
    hasMorphTargets: false,
    textures: [],
    estimatedVRAM: 50,
    warnings: [],
    materialCount: 3,
    textureCount: 0,
    bounds: { min: [-1, -1, -1], max: [1, 1, 1] },
    normalizationScale: 1,
    vertexCount: 1000,
    triangleCount: 500,
  };

  beforeEach(() => {
    useStudioStore.setState({
      vehicleRoot: new THREE.Group(),
      vehicleComponents: mockVehicleComponents as any,
      modelAsset: mockModelAsset,
      mergedMeshCount: 10,
      activeVehicleId: "test",
      vehicleName: "Test Vehicle",
      customization: {
        paint: "#ff0000",
        finish: "metallic",
        paintMetallic: 0.8,
        paintRoughness: 0.2,
        clearCoat: 0.7,
        spoiler: true,
        windowTint: false,
        wheelColor: "#000000",
        wheelDesign: "five-spoke",
        spoilerStyle: "sport",
        bumperStyle: "street",
        environment: "dark-showroom",
        quality: "high",
        showroomEnvironment: "dark-showroom",
      },
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
      gestureSettings: {
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
      },
      catalogueVehicleId: null,
      assetSource: "Procedural",
      assetVerification: "not-available",
      modelAudit: mockAudit as any,
      explode: 0,
      zoom: 1,
      rotation: [0.35, 0],
      statusMessage: "",
      gestureSelectionPreview: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("setAIPreview", () => {
    it("accepts preview for editable component", () => {
      const preview: DesignChange = {
        label: "Test preview",
        customization: {},
        componentMaterials: { body: { color: "#00ff00" } },
      };
      useStudioStore.getState().setAIPreview(preview);
      expect(useStudioStore.getState().aiPreview).toEqual(preview);
    });

    it("rejects preview for non-editable component", () => {
      const preview: DesignChange = {
        label: "Test preview",
        customization: {},
        componentMaterials: { interior: { color: "#00ff00" } },
      };
      useStudioStore.getState().setAIPreview(preview);
      expect(useStudioStore.getState().aiPreview).toBeNull();
      expect(useStudioStore.getState().statusMessage).toContain("not customizable");
    });

    it("rejects preview for non-existent component", () => {
      const preview: DesignChange = {
        label: "Test preview",
        customization: {},
        componentMaterials: { nonexistent: { color: "#00ff00" } },
      };
      useStudioStore.getState().setAIPreview(preview);
      expect(useStudioStore.getState().aiPreview).toBeNull();
    });
  });

  describe("applyDesignChange", () => {
    it("applies valid design change", () => {
      const change: DesignChange = {
        label: "Test change",
        customization: {},
        componentMaterials: { body: { color: "#0000ff" } },
      };
      useStudioStore.getState().applyDesignChange(change);
      expect(useStudioStore.getState().componentMaterials.body?.color).toBe("#0000ff");
      expect(useStudioStore.getState().aiPreview).toBeNull();
      expect(useStudioStore.getState().statusMessage).toBe("AI design applied");
    });

    it("rejects change for non-editable component", () => {
      const change: DesignChange = {
        label: "Test change",
        customization: {},
        componentMaterials: { interior: { color: "#0000ff" } },
      };
      useStudioStore.getState().applyDesignChange(change);
      expect(useStudioStore.getState().componentMaterials.interior).toBeUndefined();
      expect(useStudioStore.getState().statusMessage).toContain("not customizable");
    });

    it("merges with existing component materials", () => {
      useStudioStore.setState({ componentMaterials: { body: { color: "#ff0000", finish: "metallic", metallic: 0.8, roughness: 0.2, clearCoat: 0.7 } } });
      const change: DesignChange = {
        label: "Test change",
        customization: {},
        componentMaterials: { body: { roughness: 0.5 } },
      };
      useStudioStore.getState().applyDesignChange(change);
      expect(useStudioStore.getState().componentMaterials.body?.roughness).toBe(0.5);
      expect(useStudioStore.getState().componentMaterials.body?.color).toBe("#ff0000");
    });
  });

  describe("confirmCustomization", () => {
    it("clears aiPreview when confirmed", () => {
      useStudioStore.setState({
        aiPreview: {
          label: "Test",
          customization: {},
          componentMaterials: { body: { color: "#00ff00" } },
        },
      });
      useStudioStore.getState().confirmCustomization();
      expect(useStudioStore.getState().aiPreview).toBeNull();
    });
  });

  describe("setSelectedPart", () => {
    it("selects valid editable component", () => {
      useStudioStore.getState().setSelectedPart("body");
      expect(useStudioStore.getState().selectedPart).toBe("body");
    });

    it("rejects non-inspectable component", () => {
      useStudioStore.getState().setSelectedPart("interior");
      expect(useStudioStore.getState().selectedPart).not.toBe("interior");
      expect(useStudioStore.getState().statusMessage).toContain("not available for inspection");
    });
  });

  describe("gesture selection preview", () => {
    it("sets gesture selection preview", () => {
      useStudioStore.getState().setGestureSelectionPreview("wheels");
      expect(useStudioStore.getState().gestureSelectionPreview).toBe("wheels");
    });

    it("clears gesture selection preview", () => {
      useStudioStore.getState().setGestureSelectionPreview("wheels");
      useStudioStore.getState().setGestureSelectionPreview(null);
      expect(useStudioStore.getState().gestureSelectionPreview).toBeNull();
    });
  });
});