import { afterEach, describe, expect, it, vi } from "vitest";
import { getAIProviderStatus, requestAIChat } from "./aiProvider";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Electron AI provider", () => {
  it("reports offline without credentials and does not request a provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(getAIProviderStatus({})).toEqual({ provider: "none", enabled: false, model: null });
    await expect(requestAIChat({ systemPrompt: "system", userPrompt: "request" }, {})).resolves.toMatchObject({
      error: "AI provider is not configured in the Electron process environment.",
      offline: true,
      provider: "none",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps credentials in the main process and parses an OpenAI response", async () => {
    const apiKey = "test-openai-key-not-a-real-credential";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: `Bearer ${apiKey}` });
      return new Response(JSON.stringify({
        choices: [{ message: { content: "{\"message\":\"Ready\"}" } }],
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAIChat(
      { systemPrompt: "system", userPrompt: "request" },
      { OPENAI_API_KEY: apiKey },
    )).resolves.toEqual({
      text: "{\"message\":\"Ready\"}",
      error: null,
      offline: false,
      provider: "openai",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uses Anthropic's request format and parses its text response", async () => {
    const apiKey = "test-anthropic-key-not-a-real-credential";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      });
      expect(JSON.parse(String(init?.body))).toMatchObject({
        model: "claude-3-5-sonnet-latest",
        messages: [{ role: "user", content: "request" }],
      });
      return new Response(JSON.stringify({ content: [{ type: "text", text: "{\"message\":\"Ready\"}" }] }), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAIChat(
      { systemPrompt: "system", userPrompt: "request" },
      { ANTHROPIC_API_KEY: apiKey },
    )).resolves.toEqual({
      text: "{\"message\":\"Ready\"}",
      error: null,
      offline: false,
      provider: "anthropic",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces provider HTTP errors without returning response bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("sensitive provider response body", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAIChat(
      { systemPrompt: "system", userPrompt: "request" },
      { OPENAI_API_KEY: "test-openai-key-not-a-real-credential" },
    )).resolves.toEqual({
      text: null,
      error: "AI provider request failed with status 401.",
      offline: false,
      provider: "openai",
    });
  });

  it("rejects malformed or oversized prompts before contacting a provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAIChat(
      { systemPrompt: "system", userPrompt: "x".repeat(20_001) },
      { OPENAI_API_KEY: "test-openai-key-not-a-real-credential" },
    )).resolves.toMatchObject({
      error: "AI request must include valid system and user prompts.",
      offline: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
