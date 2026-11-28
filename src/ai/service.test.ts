import { afterEach, describe, expect, it, vi } from "vitest";
import { sendAIChat } from "./service";
import type { VehicleContext } from "./vehicleContext";

afterEach(() => {
  vi.unstubAllGlobals();
});

const createTestContext = (): VehicleContext => ({
  vehicleId: "test-procedural",
  vehicleName: "Procedural Sport Coupe",
  isImported: false,
  assetSource: "Procedural demo geometry",
  assetVerification: "not-available",
  catalogueVehicleId: null,
  components: [
    {
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
    },
  ],
  componentHierarchy: [
    {
      component: {
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
      },
      children: [],
    },
  ],
  currentMaterials: {
    body: {
      color: "#1d5e66",
      finish: "metallic",
      metallic: 0.82,
      roughness: 0.26,
      clearCoat: 0.72,
    },
  },
  globalCustomization: {
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
    showroomEnvironment: "dark-showroom",
  },
  availableReplacementParts: [],
  supportedActions: [
    {
      componentId: "body",
      action: "setMaterial",
      supportedProperties: ["color", "finish", "metallic", "roughness", "clearCoat", "emissive", "opacity"],
      description: "Change material properties of Body shell",
    },
    {
      componentId: "body",
      action: "setVisibility",
      supportedProperties: ["visible"],
      description: "Show/hide Body shell",
    },
    {
      componentId: "body",
      action: "isolate",
      supportedProperties: ["isolated"],
      description: "Isolate Body shell for inspection",
    },
  ],
  unsupportedOperations: [],
});

const request = {
  prompt: "Make the vehicle red",
  context: createTestContext(),
  history: [],
};

describe("AI chat service", () => {
  it("reports offline when the Electron provider bridge is unavailable", async () => {
    vi.stubGlobal("window", {});

    await expect(sendAIChat(request)).resolves.toEqual({
      response: null,
      error: "AI provider is available only in the Electron app.",
      offline: true,
    });
  });

  it("validates the structured response returned by the Electron bridge", async () => {
    const requestAI = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        message: "Ready to customize.",
        proposals: [],
        knowledge: null,
        imageConcept: null,
        confidence: 0.9,
        requiresConfirmation: true,
      }),
      error: null,
      offline: false,
      provider: "openai",
    });
    vi.stubGlobal("window", { gestureDrive: { requestAI } });

    await expect(sendAIChat(request)).resolves.toMatchObject({
      response: {
        message: "Ready to customize.",
        proposals: [],
        requiresConfirmation: true,
      },
      error: null,
      offline: false,
    });
    expect(requestAI).toHaveBeenCalledWith(
      expect.stringContaining("Procedural Sport Coupe"),
      expect.stringContaining("Make the vehicle red"),
    );
  });
});