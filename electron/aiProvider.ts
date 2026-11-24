export type AIProviderStatus = {
  provider: "openai" | "anthropic" | "none";
  enabled: boolean;
  model: string | null;
};

export type AIProviderResult = {
  text: string | null;
  error: string | null;
  offline: boolean;
  provider: AIProviderStatus["provider"];
};

type AIChatPayload = {
  systemPrompt: string;
  userPrompt: string;
};

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_PROMPT_LENGTH = 20_000;

export function getAIProviderStatus(env: NodeJS.ProcessEnv = process.env): AIProviderStatus {
  if (env.OPENAI_API_KEY?.trim()) {
    return {
      provider: "openai",
      enabled: true,
      model: env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    };
  }
  if (env.ANTHROPIC_API_KEY?.trim()) {
    return {
      provider: "anthropic",
      enabled: true,
      model: env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-latest",
    };
  }
  return { provider: "none", enabled: false, model: null };
}

function isAIChatPayload(value: unknown): value is AIChatPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.systemPrompt === "string" &&
    payload.systemPrompt.length > 0 &&
    payload.systemPrompt.length <= MAX_PROMPT_LENGTH &&
    typeof payload.userPrompt === "string" &&
    payload.userPrompt.length > 0 &&
    payload.userPrompt.length <= MAX_PROMPT_LENGTH
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractText(value: unknown, provider: AIProviderStatus["provider"]): string {
  if (!isRecord(value)) return "";
  if (provider === "anthropic") {
    if (!Array.isArray(value.content)) return "";
    return value.content
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => (typeof item.text === "string" ? item.text : ""))
      .join("");
  }
  if (provider === "openai" && Array.isArray(value.choices)) {
    const firstChoice = value.choices[0];
    if (isRecord(firstChoice) && isRecord(firstChoice.message) && typeof firstChoice.message.content === "string") {
      return firstChoice.message.content;
    }
  }
  return "";
}

export async function requestAIChat(
  payload: unknown,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AIProviderResult> {
  const status = getAIProviderStatus(env);
  if (!status.enabled || status.provider === "none" || !status.model) {
    return {
      text: null,
      error: "AI provider is not configured in the Electron process environment.",
      offline: true,
      provider: "none",
    };
  }
  if (!isAIChatPayload(payload)) {
    return {
      text: null,
      error: "AI request must include valid system and user prompts.",
      offline: false,
      provider: status.provider,
    };
  }

  const apiKey = status.provider === "openai" ? env.OPENAI_API_KEY?.trim() : env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return {
      text: null,
      error: "AI provider credentials are unavailable.",
      offline: true,
      provider: "none",
    };
  }

  const endpoint = status.provider === "openai"
    ? "https://api.openai.com/v1/chat/completions"
    : "https://api.anthropic.com/v1/messages";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (status.provider === "openai") {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  }
  const body = status.provider === "openai"
    ? {
        model: status.model,
        messages: [
          { role: "system", content: payload.systemPrompt },
          { role: "user", content: payload.userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1200,
      }
    : {
        model: status.model,
        system: payload.systemPrompt,
        messages: [{ role: "user", content: payload.userPrompt }],
        temperature: 0.4,
        max_tokens: 1200,
      };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        text: null,
        error: `AI provider request failed with status ${response.status}.`,
        offline: false,
        provider: status.provider,
      };
    }

    const text = extractText(await response.json(), status.provider).trim();
    if (!text) {
      return {
        text: null,
        error: "AI provider returned an empty or invalid response.",
        offline: false,
        provider: status.provider,
      };
    }
    return { text, error: null, offline: false, provider: status.provider };
  } catch (error) {
    const message = controller.signal.aborted
      ? "AI provider request timed out."
      : error instanceof Error
        ? `AI provider request failed: ${error.message}`
        : "AI provider request failed.";
    return { text: null, error: message, offline: false, provider: status.provider };
  } finally {
    clearTimeout(timeout);
  }
}
