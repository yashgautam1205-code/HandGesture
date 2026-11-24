import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { useStudioStore } from "./studio";
import { createPartFromObject } from "../engine/parts";
import { buildComponentRegistry } from "../engine/components";

afterEach(() => {
  useStudioStore.getState().reset();
});

describe("studio interaction state", () => {
  it("keeps pinch zoom within the supported camera range", () => {
    useStudioStore.getState().setZoom(10);
    expect(useStudioStore.getState().zoom).toBe(1.65);
    useStudioStore.getState().setZoom(0);
    expect(useStudioStore.getState().zoom).toBe(0.72);
  });

  it("records customization changes for undo", () => {
    useStudioStore.getState().setCustomization({ paint: "#b93438" });
    useStudioStore.getState().undo();
    expect(useStudioStore.getState().customization.paint).toBe("#1d5e66");
  });

  it("supports redoing an undone material change", () => {
    useStudioStore.getState().setCustomization({ finish: "matte" });
    useStudioStore.getState().undo();
    useStudioStore.getState().redo();
    expect(useStudioStore.getState().customization.finish).toBe("matte");
  });

  it("tracks environment and rendering quality settings", () => {
    useStudioStore.getState().setCustomization({ environment: "luxury-studio", quality: "ultra" });
    const state = useStudioStore.getState();
    expect(state.customization.environment).toBe("luxury-studio");
    expect(state.customization.quality).toBe("ultra");
  });

  it("can undo a reset", () => {
    useStudioStore.getState().setCustomization({ paint: "#b93438" });
    useStudioStore.getState().reset();
    useStudioStore.getState().undo();
    expect(useStudioStore.getState().customization.paint).toBe("#b93438");
  });

  it("records per-component material overrides for undo", () => {
    useStudioStore.getState().setComponentMaterial("body", { color: "#b93438" });
    useStudioStore.getState().undo();
    expect(useStudioStore.getState().componentMaterials).toEqual({});
  });

  it("keeps AI preview separate from committed design and cancel discards it", () => {
    const preview = {
      label: "Preview paint",
      customization: { paint: "#b93438" as const },
      componentMaterials: { hood: { color: "#b93438", finish: "gloss" as const } },
    };
    useStudioStore.getState().setAIPreview(preview);
    expect(useStudioStore.getState().customization.paint).toBe("#1d5e66");
    expect(useStudioStore.getState().componentMaterials).toEqual({});
    useStudioStore.getState().setAIPreview(null);
    expect(useStudioStore.getState().aiPreview).toBeNull();
    expect(useStudioStore.getState().customization.paint).toBe("#1d5e66");
  });

  it("commits an AI design change as one undoable history entry", () => {
    useStudioStore.getState().applyDesignChange({
      label: "Applied paint",
      customization: { paint: "#b93438" },
      componentMaterials: { hood: { color: "#0a0a0a", finish: "matte" } },
    });
    expect(useStudioStore.getState().customization.paint).toBe("#b93438");
    expect(useStudioStore.getState().componentMaterials.hood.color).toBe("#0a0a0a");
    useStudioStore.getState().undo();
    expect(useStudioStore.getState().customization.paint).toBe("#1d5e66");
    expect(useStudioStore.getState().componentMaterials).toEqual({});
  });

  it("manages replacement parts, attachment targets, and original restoration", () => {
    const part = createPartFromObject(new THREE.Group(), "wheel", "wheel.glb");
    useStudioStore.getState().addReplacementPart(part);
    useStudioStore.getState().updateReplacementPart(part.id, { replacesComponentId: "body" });
    useStudioStore.getState().installReplacementPart(part.id);
    expect(useStudioStore.getState().replacementParts[0].installed).toBe(true);
    expect(useStudioStore.getState().replacementParts[0].originalComponentPreserved).toBe(true);
    useStudioStore.getState().uninstallReplacementPart(part.id);
    expect(useStudioStore.getState().replacementParts[0].installed).toBe(false);
  });

  it("supports component isolation, visibility, and gesture settings", () => {
    useStudioStore.getState().setComponentVisible("body", false);
    useStudioStore.getState().isolateComponent("wheel-front-left");
    expect(useStudioStore.getState().componentVisibility.body).toBe(false);
    expect(useStudioStore.getState().isolatedComponentId).toBe("wheel-front-left");
    useStudioStore.getState().setGestureSettings({ confidenceThreshold: 0.72, twoHandZoom: false });
    expect(useStudioStore.getState().gestureSettings.confidenceThreshold).toBe(0.72);
    expect(useStudioStore.getState().gestureSettings.twoHandZoom).toBe(false);
  });

  it("preserves vehicle catalogue provenance and audit data when switching models", () => {
    const root = new THREE.Group();
    const node = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    node.name = "Node_001";
    root.add(node);
    const { components } = buildComponentRegistry(root, [{
      componentId: "protected-node",
      meshName: "Node_001",
      category: "other",
      allowedModifications: [],
      inspectable: false,
      customizable: false,
    }]);
    const asset = {
      name: "local.glb",
      mainFile: "local.glb",
      files: [{ path: "local.glb", data: "AQID" }],
    };
    const audit = {
      meshCount: 4,
      materialCount: 2,
      textureCount: 1,
      bounds: { width: 4.4, height: 1.2, depth: 2.1 },
      normalizationScale: 0.44,
      orientation: "standard" as const,
      warnings: [],
      unmatchedComponentMappings: [],
    };
    useStudioStore.getState().loadVehicle(root, components, asset, 0, {
      catalogueVehicleId: "bmw-3-series",
      displayName: "BMW 3 Series",
      assetSource: "User-provided local file",
      assetVerification: "unverified",
    }, audit);
    const id = useStudioStore.getState().activeVehicleId;
    if (!id) throw new Error("The imported vehicle was not selected.");
    expect(useStudioStore.getState().assetVerification).toBe("unverified");
    useStudioStore.getState().setSelectedPart("protected-node");
    expect(useStudioStore.getState().selectedPart).toBe("");
    useStudioStore.getState().setComponentMaterial("protected-node", { color: "#b93438" });
    expect(useStudioStore.getState().componentMaterials).toEqual({});
    useStudioStore.getState().setAIPreview({
      label: "Disallowed mapped component",
      customization: {},
      componentMaterials: { "protected-node": { color: "#b93438", finish: "gloss" } },
    });
    expect(useStudioStore.getState().aiPreview).toBeNull();
    useStudioStore.getState().restoreProceduralVehicle();
    expect(useStudioStore.getState().modelAudit).toBeNull();
    useStudioStore.getState().selectVehicle(id);
    expect(useStudioStore.getState().catalogueVehicleId).toBe("bmw-3-series");
    expect(useStudioStore.getState().assetSource).toBe("User-provided local file");
    expect(useStudioStore.getState().modelAudit).toEqual(audit);
  });
});
