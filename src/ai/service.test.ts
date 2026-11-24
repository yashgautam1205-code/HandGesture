import { afterEach, describe, expect, it, vi } from "vitest";
import { sendAIChat } from "./service";

afterEach(() => {
  vi.unstubAllGlobals();
});

const request = {
  prompt: "Make the vehicle red",
  context: {
    currentCustomization: {},
    availableComponents: ["body"],
    availableParts: [],
    vehicleType: "procedural-sport-coupe",
    isImported: false,
  },
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
      expect.stringContaining("procedural-sport-coupe"),
      expect.stringContaining("Make the vehicle red"),
    );
  });
});
